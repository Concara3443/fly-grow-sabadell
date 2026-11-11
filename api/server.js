const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3010;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || '1707653@uab.cat';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Fly & Grow <onboarding@resend.dev>';
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || NOTIFY_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// mismo .ics que descarga la web en el boton "Anadir al calendario"
const ICS_BASE64 = fs.readFileSync(path.join(__dirname, '..', 'assets', 'flyandgrow-2027.ics')).toString('base64');

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

async function sendInscripcionEmail({ nombre, email, uni, speedcheck }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurada');
  }
  const html = `
    <h2>Nueva inscripción a Fly & Grow Sabadell</h2>
    <p><b>Nombre:</b> ${escapeHtml(nombre)}</p>
    <p><b>Email:</b> ${escapeHtml(email)}</p>
    <p><b>Universidad / Grado:</b> ${escapeHtml(uni)}</p>
    <p><b>Entrevistas Express:</b> ${speedcheck ? 'Sí' : 'No'}</p>
  `;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      reply_to: email,
      subject: `Nueva inscripción: ${nombre}`,
      html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend respondió ${res.status}: ${detail}`);
  }
}

// textos del correo de confirmacion por idioma de la pagina desde la que se inscribe
const CONFIRMACION = {
  es: {
    subject: 'Tienes plaza en Fly & Grow Sabadell, 5 de mayo de 2027',
    speed: 'Has marcado que te interesan las Entrevistas Express. Van aparte: crea tu perfil de candidato con tu correo UAB desde <a href="https://flyandgrow.es/#speed">flyandgrow.es</a>.',
    body: (n, speed) => `
    <p>Hola ${n},</p>
    <p>Tienes plaza en Fly &amp; Grow Sabadell, el 2º Congreso Aeronáutico Universitario.</p>
    <p><b>Miércoles 5 de mayo de 2027, 15:00</b><br>
    Escola d'Enginyeria UAB, Campus Sabadell<br>
    Carrer dels Emprius, 2, 08202 Sabadell</p>
    ${speed}
    <p>Te adjuntamos el evento para que lo añadas a tu calendario. El programa está en <a href="https://flyandgrow.es/#programa">flyandgrow.es</a>.</p>
    <p>Si tienes cualquier duda, responde a este correo.</p>
    <p>Fly &amp; Grow Sabadell</p>`,
  },
  ca: {
    subject: 'Tens plaça a Fly & Grow Sabadell, 5 de maig de 2027',
    speed: 'Has marcat que t\'interessen les Entrevistes Express. Van a part: crea el teu perfil de candidat amb el teu correu UAB des de <a href="https://flyandgrow.es/ca/#speed">flyandgrow.es</a>.',
    body: (n, speed) => `
    <p>Hola ${n},</p>
    <p>Tens plaça a Fly &amp; Grow Sabadell, el 2n Congrés Aeronàutic Universitari.</p>
    <p><b>Dimecres 5 de maig de 2027, 15:00</b><br>
    Escola d'Enginyeria UAB, Campus Sabadell<br>
    Carrer dels Emprius, 2, 08202 Sabadell</p>
    ${speed}
    <p>T'adjuntem l'esdeveniment perquè l'afegeixis al teu calendari. El programa és a <a href="https://flyandgrow.es/ca/#programa">flyandgrow.es</a>.</p>
    <p>Si tens qualsevol dubte, respon aquest correu.</p>
    <p>Fly &amp; Grow Sabadell</p>`,
  },
};

async function sendConfirmacionEmail({ nombre, email, speedcheck, lang }) {
  const t = CONFIRMACION[lang] || CONFIRMACION.es;
  const html = t.body(escapeHtml(nombre), speedcheck ? `<p>${t.speed}</p>` : '');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      reply_to: REPLY_TO_EMAIL,
      subject: t.subject,
      html,
      attachments: [{ filename: 'flyandgrow-2027.ics', content: ICS_BASE64 }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend respondió ${res.status}: ${detail}`);
  }
}

const PAQUETES = ['Despegue', 'Conexión', 'Altitud', 'Primera Clase', 'Por decidir'];

async function resendSend(payload) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurada');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, ...payload }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend respondió ${res.status}: ${detail}`);
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
  await resendSend({ to: NOTIFY_EMAIL, reply_to: email, subject: `Empresa: ${empresa} (${paquete})`, html });
}

// copia para la empresa
async function sendEmpresaCopia({ empresa, contacto, email, paquete, lang }) {
  const ca = lang === 'ca';
  const p = paquete === 'Por decidir' ? (ca ? 'per decidir' : 'por decidir') : paquete;
  const html = ca ? `
    <p>Hola ${escapeHtml(contacto)},</p>
    <p>Hem rebut la sol·licitud de ${escapeHtml(empresa)} per participar a Fly &amp; Grow Sabadell, el 5 de maig de 2027 al Campus Sabadell de la UAB.</p>
    <p><b>Paquet:</b> ${escapeHtml(p)}</p>
    <p>Us respondrem en uns dies amb els detalls. Si voleu afegir res, només cal que respongueu aquest correu.</p>
    <p>Fly &amp; Grow Sabadell</p>` : `
    <p>Hola ${escapeHtml(contacto)},</p>
    <p>Hemos recibido la solicitud de ${escapeHtml(empresa)} para participar en Fly &amp; Grow Sabadell, el 5 de mayo de 2027 en el Campus Sabadell de la UAB.</p>
    <p><b>Paquete:</b> ${escapeHtml(p)}</p>
    <p>Os responderemos en unos días con los detalles. Si queréis añadir algo, basta con responder a este correo.</p>
    <p>Fly &amp; Grow Sabadell</p>`;
  await resendSend({
    to: email,
    reply_to: REPLY_TO_EMAIL,
    subject: ca ? 'Hem rebut la vostra sol·licitud, Fly & Grow Sabadell 2027' : 'Hemos recibido vuestra solicitud, Fly & Grow Sabadell 2027',
    html,
  });
}

async function sendManualEmail({ to, subject, mensaje }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurada');
  }
  const html = `<p>${escapeHtml(mensaje).replace(/\n/g, '<br>')}</p>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      reply_to: REPLY_TO_EMAIL,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend respondió ${res.status}: ${detail}`);
  }
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
    if (!isNonEmptyString(nombre, 120) || !isValidEmail(email) || !isNonEmptyString(uni, 160)) {
      return sendJson(400, { error: 'Faltan campos o son invalidos' });
    }
    try {
      await sendInscripcionEmail({ nombre, email, uni, speedcheck: !!speedcheck });
    } catch (err) {
      console.error('Error enviando inscripcion:', err.message);
      return sendJson(502, { error: 'No se pudo enviar el correo' });
    }
    // la inscripcion ya consta (el aviso al organizador salio); si falla la confirmacion solo se registra
    try {
      await sendConfirmacionEmail({ nombre, email, speedcheck: !!speedcheck, lang });
    } catch (err) {
      console.error('Error enviando confirmacion a', email, ':', err.message);
    }
    return sendJson(200, { ok: true });
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
      await sendEmpresaEmail({ empresa, contacto, email, paquete, mensaje, lang });
    } catch (err) {
      console.error('Error enviando solicitud de empresa:', err.message);
      return sendJson(502, { error: 'No se pudo enviar el correo' });
    }
    try {
      await sendEmpresaCopia({ empresa, contacto, email, paquete, lang });
    } catch (err) {
      console.error('Error enviando copia a empresa', email, ':', err.message);
    }
    return sendJson(200, { ok: true });
  }

  // nginx exige auth_basic antes de dejar pasar la peticion a esta ruta
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
