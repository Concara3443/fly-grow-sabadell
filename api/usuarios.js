// Cuentas del panel /admin: es el mismo fichero htpasswd que usa nginx (auth_basic).
// Contrasenas con SHA-512 crypt ($6$, via `openssl passwd -6`), que nginx entiende a traves de crypt().
// El fichero vive en una carpeta de concara con grupo www-data: la API escribe, nginx solo lee.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HTPASSWD = process.env.HTPASSWD || path.join(__dirname, '..', '..', 'flyandgrow-auth', 'htpasswd');
const USUARIO_OK = /^[a-z0-9._-]{3,32}$/;

function leer() {
  if (!fs.existsSync(HTPASSWD)) return [];
  return fs.readFileSync(HTPASSWD, 'utf8').split('\n').filter((l) => l.includes(':'))
    .map((l) => ({ usuario: l.slice(0, l.indexOf(':')), hash: l.slice(l.indexOf(':') + 1) }));
}

// escritura atomica: fichero temporal en la misma carpeta y rename, para que nginx nunca lea uno a medias
function escribir(filas) {
  const tmp = `${HTPASSWD}.tmp`;
  fs.writeFileSync(tmp, filas.map((f) => `${f.usuario}:${f.hash}\n`).join(''), { mode: 0o640 });
  fs.renameSync(tmp, HTPASSWD);
}

const lista = () => leer().map((f) => f.usuario);

function crear(usuario, password) {
  if (!USUARIO_OK.test(usuario || '')) throw Object.assign(new Error('Usuario: 3 a 32 caracteres, minusculas, numeros, punto, guion o guion bajo.'), { status: 400 });
  if (typeof password !== 'string' || password.length < 10 || password.length > 128 || password.includes('\n')) {
    throw Object.assign(new Error('La contraseña necesita al menos 10 caracteres.'), { status: 400 });
  }
  const filas = leer();
  if (filas.some((f) => f.usuario === usuario)) throw Object.assign(new Error('Ese usuario ya existe.'), { status: 409 });
  const hash = execFileSync('openssl', ['passwd', '-6', '-stdin'], { input: password }).toString().trim();
  escribir([...filas, { usuario, hash }]);
}

function borrar(usuario, yo) {
  const filas = leer();
  if (usuario === yo) throw Object.assign(new Error('No puedes borrar tu propia cuenta.'), { status: 400 });
  if (!filas.some((f) => f.usuario === usuario)) throw Object.assign(new Error('Ese usuario no existe.'), { status: 404 });
  if (filas.length <= 1) throw Object.assign(new Error('Tiene que quedar al menos una cuenta.'), { status: 400 });
  escribir(filas.filter((f) => f.usuario !== usuario));
}

module.exports = { HTPASSWD, lista, crear, borrar };
