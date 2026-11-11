// Manda una muestra de TODAS las plantillas de correo a una direccion de prueba.
// Uso: node plantillas.js testfyg@guillermocort.es
// Lanzarlo cada vez que se toque emails.js (regla en CLAUDE.md).
// La marca va al FINAL del asunto: Gmail ignora los [corchetes] iniciales al agrupar y mezclaria
// estas pruebas con las confirmaciones reales en el mismo hilo.
const { confirmacion, recordatorio, empresaCopia } = require('./emails');
const { sendWithRetry } = require('./mailer');

const to = process.argv[2];
if (!to) { console.error('uso: node plantillas.js <email>'); process.exit(1); }
const FROM_EMAIL = process.env.FROM_EMAIL || 'Fly & Grow <onboarding@resend.dev>';

const muestras = [];
for (const lang of ['es', 'ca']) {
  muestras.push([`confirmacion ${lang} (con Entrevistas Express)`, confirmacion({ nombre: 'Marta Pérez', speedcheck: true, lang, codigo: 'a1b2c3d' })]);
  muestras.push([`confirmacion ${lang} (sin Entrevistas Express)`, confirmacion({ nombre: 'Marta Pérez', speedcheck: false, lang, codigo: 'a1b2c3d' })]);
  for (const tipo of ['cierre', 'semana', 'dia', 'encuesta']) {
    muestras.push([`${tipo} ${lang}`, recordatorio({ nombre: 'Marta Pérez', speedcheck: true, lang, tipo })]);
  }
  muestras.push([`empresa ${lang}`, empresaCopia({ empresa: 'Aerolíneas Ejemplo', contacto: 'Laura', paquete: 'Conexión', lang })]);
}

(async () => {
  for (const [nombre, m] of muestras) {
    await sendWithRetry({ from: FROM_EMAIL, to, subject: `${m.subject} (PRUEBA: ${nombre})`, html: m.html, text: m.text });
    console.log('enviada:', nombre);
    await new Promise((r) => setTimeout(r, 600));
  }
})().catch((err) => { console.error(err.message); process.exit(1); });
