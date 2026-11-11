// Envio a Resend con reintentos. Compartido por la API y por el script diario (recordatorios.js).
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendOnce(payload, endpoint = 'https://api.resend.com/emails') {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`Resend respondió ${res.status}: ${detail}`);
    err.status = res.status;
    throw err;
  }
}

// 3 intentos con espera creciente; un 4xx (salvo 429) no se reintenta porque fallaria igual
async function sendWithRetry(payload, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      return await sendOnce(payload);
    } catch (err) {
      const permanent = err.status >= 400 && err.status < 500 && err.status !== 429;
      if (i >= tries || permanent) throw err;
      await new Promise((r) => setTimeout(r, i * 1500));
    }
  }
}

module.exports = { sendWithRetry };
