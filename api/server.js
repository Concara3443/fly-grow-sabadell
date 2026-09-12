const http = require('http');

const PORT = process.env.PORT || 3010;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || '1707653@uab.cat';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Fly & Grow <onboarding@resend.dev>';
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

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/inscripcion') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  let body = '';
  let tooBig = false;
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 10_000) {
      tooBig = true;
      req.destroy();
    }
  });
  req.on('end', async () => {
    if (tooBig) return;
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'JSON invalido' }));
      return;
    }

    const { nombre, email, uni, speedcheck } = data || {};
    if (!isNonEmptyString(nombre, 120) || !isValidEmail(email) || !isNonEmptyString(uni, 160)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Faltan campos o son invalidos' }));
      return;
    }

    try {
      await sendInscripcionEmail({ nombre, email, uni, speedcheck: !!speedcheck });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error('Error enviando inscripcion:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No se pudo enviar el correo' }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`flyandgrow-api escuchando en 127.0.0.1:${PORT}`);
});
