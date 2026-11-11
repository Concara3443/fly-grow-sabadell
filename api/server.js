const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3010;
// avisos al equipo: admite varias direcciones separadas por comas
const NOTIFY_EMAIL = (process.env.NOTIFY_EMAIL || '1707653@uab.cat').split(',').map((e) => e.trim()).filter(Boolean);
const FROM_EMAIL = process.env.FROM_EMAIL || 'Fly & Grow <onboarding@resend.dev>';
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || NOTIFY_EMAIL[0];
// mismos .ics (con avisos el dia antes y 3 h antes) y enlaces de Google Calendar que usa la web
const ICS_BASE64 = {
  es: fs.readFileSync(path.join(__dirname, '..', 'assets', 'flyandgrow-2027.ics')).toString('base64'),
  ca: fs.readFileSync(path.join(__dirname, '..', 'assets', 'flyandgrow-2027-ca.ics')).toString('base64'),
};
const { confirmacion, empresaCopia } = require('./emails');
const { sendWithRetry } = require('./mailer');
const store = require('./store');
// el contador publico "Ya somos X inscritos" solo se ensena a partir de este numero
const PUBLIC_COUNT_MIN = Number(process.env.PUBLIC_COUNT_MIN || 100);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function isValidEmail(s) {
  return typeof s === 'string' && s.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isNonEmptyString(s, maxLen) {
  return typeof s === 'string' && s.trim().length > 0 && s.length <= maxLen;
}

// aviso instantaneo gratis (opcional): webhook de Discord. Sin variable, no hace nada.
async function avisoChat(texto) {
  if (!process.env.DISCORD_WEBHOOK) return;
  try {
    await fetch(process.env.DISCORD_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: texto.slice(0, 1900) }) });
  } catch (err) {
    console.error('Error avisando por Discord:', err.message);
  }
}

// ponytail: ya no se usa por inscripcion (gastaba cupo de Resend); el equipo recibe el resumen diario de recordatorios.js
async function sendInscripcionEmail({ nombre, email, uni, speedcheck }) {
  const html = `
    <h2>Nueva inscripción a Fly & Grow Sabadell</h2>
    <p><b>Nombre:</b> ${escapeHtml(nombre)}</p>
    <p><b>Email:</b> ${escapeHtml(email)}</p>
    <p><b>Universidad / Grado:</b> ${escapeHtml(uni)}</p>
    <p><b>Entrevistas Express:</b> ${speedcheck ? 'Sí' : 'No'}</p>
    <p>Lista completa: https://flyandgrow.es/admin/inscritos.html</p>
  `;
  await notifyTeam({ reply_to: email, subject: `Nueva inscripción: ${nombre}`, html });
}

async function sendConfirmacionEmail({ nombre, email, speedcheck, lang, codigo }) {
  const l = lang === 'ca' ? 'ca' : 'es';
  const { subject, html, text } = confirmacion({ nombre, speedcheck, lang: l, codigo });
  await resendSend({
    to: email,
    reply_to: REPLY_TO_EMAIL,
    subject,
    html,
    text,
    attachments: [{ filename: 'flyandgrow-2027.ics', content: ICS_BASE64[l] }],
  });
}

const PAQUETES = ['Despegue', 'Conexión', 'Altitud', 'Primera Clase', 'Por decidir'];

// cualquier envio: 3 intentos (ver mailer.js)
const resendSend = (payload) => sendWithRetry({ from: FROM_EMAIL, ...payload });

// aviso al equipo: si tras los reintentos no sale, queda en cola y el script diario lo reenvia hasta que llegue
async function notifyTeam(payload) {
  const full = { from: FROM_EMAIL, to: NOTIFY_EMAIL, ...payload };
  try {
    await sendWithRetry(full);
  } catch (err) {
    store.append('avisos-pendientes', { payload: full, error: err.message });
    throw err;
  }
}

// solicitud de una empresa desde /empresas/: aviso al organizador (responder = la empresa)
async function sendEmpresaEmail({ empresa, contacto, email, paquete, mensaje, lang }) {
  const html = `
    <h2>Solicitud de empresa para Fly & Grow Sabadell 2027</h2>
    <p><b>Empresa:</b> ${escapeHtml(empresa)}</p>
    <p><b>Contacto:</b> ${escapeHtml(contacto)}</p>
    <p><b>Email:</b> ${escapeHtml(email)}</p>
    <p><b>Paquete:</b> ${escapeHtml(paquete)}</p>
    <p><b>Idioma de la web:</b> ${lang === 'ca' ? 'catalán' : 'castellano'}</p>
    ${mensaje ? `<p><b>Mensaje:</b><br>${escapeHtml(mensaje).replace(/\n/g, '<br>')}</p>` : ''}
  `;
  await notifyTeam({ reply_to: email, subject: `Empresa: ${empresa} (${paquete})`, html });
}

// copia para la empresa
async function sendEmpresaCopia({ empresa, contacto, email, paquete, lang }) {
  const { subject, html, text } = empresaCopia({ empresa, contacto, paquete, lang });
  await resendSend({ to: email, reply_to: REPLY_TO_EMAIL, subject, html, text });
}

async function sendManualEmail({ to, subject, mensaje }) {
  const html = `<p>${escapeHtml(mensaje).replace(/\n/g, '<br>')}</p>`;
  await resendSend({ to, reply_to: REPLY_TO_EMAIL, subject, html, text: mensaje });
}

// CSV para Excel en castellano: separador ";" y BOM para que respete tildes
function toCsv(rows, cols) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\ufeff' + [cols.map(([, h]) => cell(h)).join(';'), ...rows.map((r) => cols.map(([k]) => cell(r[k])).join(';'))].join('\r\n');
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooBig = false;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        tooBig = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooBig) return reject(new Error('demasiado grande'));
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON invalido'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const sendJson = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  if (req.method === 'POST' && req.url === '/inscripcion') {
    let data;
    try {
      data = await readJsonBody(req, 10_000);
    } catch (err) {
      return sendJson(400, { error: err.message });
    }
    const { nombre, email, uni, speedcheck, lang } = data || {};
    const ref = typeof data?.ref === 'string' && /^[a-f0-9]{7}$/.test(data.ref) ? data.ref : '';
    if (!isNonEmptyString(nombre, 120) || !isValidEmail(email) || !isNonEmptyString(uni, 160)) {
      return sendJson(400, { error: 'Faltan campos o son invalidos' });
    }
    // primero se guarda: si luego falla algun correo, la inscripcion no se pierde
    try {
      store.append('inscripciones', { nombre: nombre.trim(), email: email.trim(), uni: uni.trim(), speedcheck: !!speedcheck, lang: lang === 'ca' ? 'ca' : 'es', ref });
    } catch (err) {
      console.error('Error guardando inscripcion:', err.message);
      return sendJson(500, { error: 'No se pudo guardar' });
    }
    // sin correo al equipo por cada inscripcion: panel + resumen diario + (opcional) Discord
    avisoChat(`Nueva inscripción: ${nombre.trim()} (${uni.trim()})${speedcheck ? ', quiere Entrevistas Express' : ''}. Total: ${store.inscritos().length}`);
    try {
      await sendConfirmacionEmail({ nombre, email, speedcheck: !!speedcheck, lang, codigo: store.codigo(email) });
    } catch (err) {
      console.error('Error enviando confirmacion a', email, ':', err.message);
    }
    return sendJson(200, { ok: true, codigo: store.codigo(email) });
  }

  if (req.method === 'POST' && req.url === '/empresa') {
    let data;
    try {
      data = await readJsonBody(req, 10_000);
    } catch (err) {
      return sendJson(400, { error: err.message });
    }
    const { empresa, contacto, email, paquete, mensaje, lang } = data || {};
    if (!isNonEmptyString(empresa, 120) || !isNonEmptyString(contacto, 120) || !isValidEmail(email)
      || !PAQUETES.includes(paquete) || (mensaje && !isNonEmptyString(mensaje, 2000))) {
      return sendJson(400, { error: 'Faltan campos o son invalidos' });
    }
    try {
      store.append('empresas', { empresa: empresa.trim(), contacto: contacto.trim(), email: email.trim(), paquete, mensaje: mensaje || '', lang: lang === 'ca' ? 'ca' : 'es' });
    } catch (err) {
      console.error('Error guardando solicitud de empresa:', err.message);
      return sendJson(500, { error: 'No se pudo guardar' });
    }
    avisoChat(`Solicitud de empresa: ${empresa.trim()} (${paquete}), contacto ${contacto.trim()} <${email.trim()}>`);
    try {
      await sendEmpresaEmail({ empresa, contacto, email, paquete, mensaje, lang });
    } catch (err) {
      console.error('Error enviando aviso de empresa:', err.message);
    }
    try {
      await sendEmpresaCopia({ empresa, contacto, email, paquete, lang });
    } catch (err) {
      console.error('Error enviando copia a empresa', email, ':', err.message);
    }
    return sendJson(200, { ok: true });
  }

  if (req.method === 'GET' && req.url === '/stats') {
    const n = store.inscritos().length;
    return sendJson(200, n >= PUBLIC_COUNT_MIN ? { inscritos: n } : {});
  }

  // /admin/*: nginx pide contrasena y anade esta cabecera; la ruta publica /api/ la borra.
  // Doble cierre por si alguna vez se cuela /api/admin/... sin pasar por la contrasena.
  if (req.url.startsWith('/admin/') && req.headers['x-flyandgrow-admin'] !== '1') {
    return sendJson(404, { error: 'not found' });
  }

  if (req.method === 'GET' && req.url === '/admin/api/datos') {
    const ins = store.inscritos().map((r) => ({ ...r, codigo: store.codigo(r.email) }));
    return sendJson(200, { inscritos: ins, empresas: store.readAll('empresas'), referidos: store.referidos() });
  }

  if (req.method === 'GET' && req.url.startsWith('/admin/api/export.csv')) {
    const empresas = req.url.includes('tipo=empresas');
    const csv = empresas
      ? toCsv(store.readAll('empresas'), [['fecha', 'Fecha'], ['empresa', 'Empresa'], ['contacto', 'Contacto'], ['email', 'Email'], ['paquete', 'Paquete'], ['mensaje', 'Mensaje'], ['lang', 'Idioma']])
      : toCsv(store.inscritos().map((r) => ({ ...r, speedcheck: r.speedcheck ? 'Sí' : 'No', codigo: store.codigo(r.email) })), [['fecha', 'Fecha'], ['nombre', 'Nombre'], ['email', 'Email'], ['uni', 'Universidad / Grado'], ['speedcheck', 'Entrevistas Express'], ['lang', 'Idioma'], ['codigo', 'Su código'], ['ref', 'Invitado por (código)']]);
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${empresas ? 'empresas' : 'inscritos'}-flyandgrow.csv"` });
    return res.end(csv);
  }

  if (req.method === 'POST' && req.url === '/admin/enviar') {
    let data;
    try {
      data = await readJsonBody(req, 20_000);
    } catch (err) {
      return sendJson(400, { error: err.message });
    }
    const { to, subject, mensaje } = data || {};
    if (!isValidEmail(to) || !isNonEmptyString(subject, 200) || !isNonEmptyString(mensaje, 5000)) {
      return sendJson(400, { error: 'Faltan campos o son invalidos' });
    }
    try {
      await sendManualEmail({ to, subject, mensaje });
      return sendJson(200, { ok: true });
    } catch (err) {
      console.error('Error enviando manual:', err.message);
      return sendJson(502, { error: 'No se pudo enviar el correo' });
    }
  }

  sendJson(404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`flyandgrow-api escuchando en 127.0.0.1:${PORT}`);
});
