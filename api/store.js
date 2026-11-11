// Inscripciones y solicitudes guardadas en ficheros JSONL (una linea por registro), fuera del root web.
// ponytail: ficheros planos, sin base de datos; vale de sobra para cientos de inscritos de un congreso.
const fs = require('fs');
const path = require('path');

// por defecto, carpeta hermana del repo: fly-grow-sabadell -> fly-grow-sabadell-data (staging tiene la suya)
const REPO = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(REPO, '..', `${path.basename(REPO)}-data`);
fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });

const file = (name) => path.join(DATA_DIR, `${name}.jsonl`);

function append(name, obj) {
  fs.appendFileSync(file(name), JSON.stringify({ fecha: new Date().toISOString(), ...obj }) + '\n', { mode: 0o600 });
}

function readAll(name) {
  if (!fs.existsSync(file(name))) return [];
  return fs.readFileSync(file(name), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// una persona por email: si se inscribe dos veces, cuenta la ultima version de sus datos y la primera fecha
function inscritos() {
  const byEmail = new Map();
  for (const r of readAll('inscripciones')) {
    const k = r.email.trim().toLowerCase();
    const prev = byEmail.get(k);
    byEmail.set(k, { ...r, fecha: prev ? prev.fecha : r.fecha });
  }
  return [...byEmail.values()];
}

// reescribe un fichero entero (para vaciar la cola de avisos ya reenviados)
function rewrite(name, rows) {
  fs.writeFileSync(file(name), rows.map((r) => JSON.stringify(r) + '\n').join(''), { mode: 0o600 });
}

module.exports = { DATA_DIR, append, readAll, rewrite, inscritos };
