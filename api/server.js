const http = require('http');

const PORT = process.env.PORT || 3010;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || '1707653@uab.cat';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Fly & Grow <onboarding@resend.dev>';
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || NOTIFY_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

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
    const { nombre, email, uni, speedcheck } = data || {};
    if (!isNonEmptyString(nombre, 120) || !isValidEmail(email) || !isNonEmptyString(uni, 160)) {
      return sendJson(400, { error: 'Faltan campos o son invalidos' });
    }
    try {
      await sendInscripcionEmail({ nombre, email, uni, speedcheck: !!speedcheck });
      return sendJson(200, { ok: true });
    } catch (err) {
      console.error('Error enviando inscripcion:', err.message);
      return sendJson(502, { error: 'No se pudo enviar el correo' });
    }
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
