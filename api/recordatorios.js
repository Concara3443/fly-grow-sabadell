// Tarea diaria (systemd timer flyandgrow-recordatorios):
//  1. reenvia los avisos al equipo que quedaron en cola porque Resend fallo
//  2. si hoy toca, manda recordatorio / encuesta a todos los inscritos (una sola vez por persona y tipo)
// Uso: node recordatorios.js            -> tarea normal
//      node recordatorios.js --dry-run  -> dice que haria, sin mandar nada
const store = require('./store');
const { recordatorio } = require('./emails');
const { sendWithRetry } = require('./mailer');
const fs = require('fs');
const path = require('path');

const FROM_EMAIL = process.env.FROM_EMAIL || 'Fly & Grow <onboarding@resend.dev>';
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || (process.env.NOTIFY_EMAIL || '1707653@uab.cat').split(',')[0].trim();
const DRY = process.argv.includes('--dry-run');

// Cada campana se reparte en varios dias: el plan gratis de Resend permite 100 correos/dia
// (cada destinatario cuenta) y hay que dejar sitio a las inscripciones y avisos del propio dia.
// Quien no lo recibe un dia, lo recibe al siguiente dentro de la ventana.
const CAMPANAS = [
  // solo a quien marco Entrevistas Express: la preinscripcion cierra el 25 de abril
  { tipo: 'cierre', desde: '2027-04-21', hasta: '2027-04-23', soloEntrevistas: true },
  { tipo: 'semana', desde: '2027-04-26', hasta: '2027-04-28' },
  { tipo: 'dia', desde: '2027-05-02', hasta: '2027-05-04' },
  { tipo: 'encuesta', desde: '2027-05-06', hasta: '2027-05-09' },
];
// ponytail: tope fijo por ejecucion, no mide lo ya gastado hoy; con plan Pro de Resend subir MAX_POR_DIA
const MAX_POR_DIA = Number(process.env.MAX_POR_DIA || 80);

const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function reintentarAvisos() {
  const pendientes = store.readAll('avisos-pendientes');
  if (!pendientes.length) return;
  const siguen = [];
  for (const p of pendientes) {
    if (DRY) { siguen.push(p); continue; }
    try {
      await sendWithRetry(p.payload);
      console.log('aviso reenviado:', p.payload.subject);
    } catch (err) {
      siguen.push({ ...p, error: err.message });
      console.error('aviso sigue sin salir:', p.payload.subject, err.message);
    }
  }
  console.log(`avisos pendientes: ${pendientes.length} -> ${siguen.length}`);
  if (!DRY) store.rewrite('avisos-pendientes', siguen);
}

async function campana(tipo, soloEntrevistas) {
  const yaEnviados = new Set(store.readAll('enviados').filter((e) => e.tipo === tipo).map((e) => e.email.toLowerCase()));
  const faltan = store.inscritos().filter((r) => !yaEnviados.has(r.email.toLowerCase()) && (!soloEntrevistas || r.speedcheck));
  const destino = faltan.slice(0, MAX_POR_DIA);
  console.log(`${tipo}: ${faltan.length} por enviar (${yaEnviados.size} ya enviados); hoy salen ${destino.length}`);
  if (faltan.length > MAX_POR_DIA && hoy() === CAMPANAS.find((c) => c.tipo === tipo).hasta) {
    console.error(`${tipo}: ultimo dia de la ventana y quedan ${faltan.length - MAX_POR_DIA} sin enviar: subir MAX_POR_DIA (plan Pro de Resend)`);
  }
  for (const r of destino) {
    if (DRY) continue;
    const { subject, html, text } = recordatorio({ nombre: r.nombre, speedcheck: r.speedcheck, lang: r.lang, tipo });
    try {
      await sendWithRetry({ from: FROM_EMAIL, to: r.email, reply_to: REPLY_TO_EMAIL, subject, html, text });
      store.append('enviados', { tipo, email: r.email });
    } catch (err) {
      console.error(`${tipo}: no sale a ${r.email}:`, err.message, '(se reintenta en la proxima ejecucion)');
    }
    await pausa(600); // limite de Resend: 2 envios por segundo
  }
}

// resumen diario al equipo: las inscripciones nuevas desde el ultimo resumen, en UN correo (no uno por inscripcion)
const NOTIFY = (process.env.NOTIFY_EMAIL || '1707653@uab.cat').split(',').map((e) => e.trim()).filter(Boolean);
const ESTADO = path.join(store.DATA_DIR, 'estado.json');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function resumenDiario() {
  let estado = {};
  try { estado = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}
  const desde = estado.ultimoResumen || '1970-01-01T00:00:00Z';
  const todas = store.readAll('inscripciones');
  const nuevas = todas.filter((r) => r.fecha > desde);
  const total = store.inscritos().length;
  console.log(`resumen: ${nuevas.length} inscripciones nuevas, ${total} en total`);
  if (!nuevas.length || DRY) return;
  const ee = nuevas.filter((r) => r.speedcheck).length;
  const filas = nuevas.map((r) => `<tr><td>${esc(r.nombre)}</td><td>${esc(r.email)}</td><td>${esc(r.uni)}</td><td>${r.speedcheck ? 'Sí' : 'No'}</td></tr>`).join('');
  const html = `<h2>Fly &amp; Grow: ${nuevas.length} inscripciones nuevas</h2>
    <p>Total de inscritos: <b>${total}</b>. De las nuevas, ${ee} quieren Entrevistas Express.</p>
    <table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px"><tr><th align="left">Nombre</th><th align="left">Email</th><th align="left">Universidad / Grado</th><th align="left">Entrevistas</th></tr>${filas}</table>
    <p>Lista completa y Excel: https://flyandgrow.es/admin/inscritos.html</p>`;
  await sendWithRetry({ from: FROM_EMAIL, to: NOTIFY, subject: `Fly & Grow: ${nuevas.length} inscripciones nuevas (total ${total})`, html });
  fs.writeFileSync(ESTADO, JSON.stringify({ ...estado, ultimoResumen: nuevas[nuevas.length - 1].fecha }), { mode: 0o600 });
}

(async () => {
  await reintentarAvisos();
  try { await resumenDiario(); } catch (err) { console.error('resumen diario no enviado (se reintenta manana):', err.message); }
  const c = CAMPANAS.find((x) => hoy() >= x.desde && hoy() <= x.hasta);
  if (c) await campana(c.tipo, c.soloEntrevistas);
  else console.log(`hoy (${hoy()}) no toca ningun recordatorio`);
})().catch((err) => { console.error(err); process.exit(1); });
