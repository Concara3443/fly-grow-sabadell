// Comprobacion rapida sin mandar correos reales: `node api/check.js`
// Simula Resend con un fetch falso y verifica el flujo de /inscripcion.
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const calls = [];
let failConfirm = false;
let failNotify = false;
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  if (!String(url).includes('resend.com')) return realFetch(url, opts);
  const body = JSON.parse(opts.body);
  calls.push(body);
  const isConfirm = body.to === 'alumna@uab.cat';
  const isNotify = Array.isArray(body.to);
  const ok = !(isConfirm && failConfirm) && !(isNotify && failNotify);
  return { ok, status: ok ? 200 : 500, text: async () => '' };
};

process.env.PORT = '3019';
process.env.RESEND_API_KEY = 'test';
process.env.NOTIFY_EMAIL = 'org@test, otro@test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fyg-check-'));
process.env.PUBLIC_COUNT_MIN = '3';
process.env.HTPASSWD = path.join(process.env.DATA_DIR, 'htpasswd');
const store = require('./store');
require('./server.js');

function request(method, p, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: 3019, path: p, method, headers }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end(data ? JSON.stringify(data) : undefined);
  });
}
const post = async (data, p = '/inscripcion') => (await request('POST', p, data)).status;

(async () => {
  await new Promise((r) => setTimeout(r, 200));
  const ok = { nombre: 'Ana <b>', email: 'alumna@uab.cat', uni: 'UAB', speedcheck: true };

  assert.strictEqual(await post(ok), 200);
  assert.strictEqual(calls.length, 1, 'inscripcion = 1 correo (solo la confirmacion)');
  assert.strictEqual(calls[0].to, 'alumna@uab.cat');
  assert.strictEqual(calls[0].attachments[0].filename, 'flyandgrow-2027.ics');
  assert.ok(calls[0].html.includes('Hola, Ana:'), 'saludo con el nombre de pila');
  assert.ok(!calls[0].html.includes('<b>!'), 'sin html del usuario en la confirmacion');
  assert.ok(calls[0].html.includes('Último paso'), 'bloque de entrevistas si speedcheck');
  assert.ok(calls[0].text.includes('Ana'), 'version texto plano');

  calls.length = 0;
  failConfirm = true;
  assert.strictEqual(await post({ ...ok, speedcheck: false }), 200, 'si falla la confirmacion la inscripcion sigue valiendo');
  assert.ok(!calls[0].html.includes('Último paso'));

  calls.length = 0;
  failConfirm = false;
  assert.strictEqual(await post({ ...ok, lang: 'ca' }), 200);
  assert.ok(calls[0].subject.startsWith('Inscripció confirmada'), 'correo en catalan si viene de /ca/');
  assert.ok(calls[0].html.includes('Últim pas'));
  assert.ok(calls[0].html.includes('calendar.google.com'), 'boton de Google Calendar');
  assert.ok(Buffer.from(calls[0].attachments[0].content, 'base64').toString().includes('TRIGGER:-P1D'), 'ics con aviso');

  assert.strictEqual(await post({ ...ok, email: 'no-es-email' }), 400);

  // solicitud de empresa
  calls.length = 0;
  const emp = { empresa: 'Aero <SA>', contacto: 'Marta', email: 'rrhh@aero.es', paquete: 'Conexión', mensaje: 'Hola', lang: 'ca' };
  assert.strictEqual(await post(emp, '/empresa'), 200);
  assert.strictEqual(calls.length, 2);
  assert.deepStrictEqual(calls[0].to, ['org@test', 'otro@test']);
  assert.strictEqual(calls[0].reply_to, 'rrhh@aero.es');
  assert.ok(calls[0].html.includes('Aero &lt;SA&gt;'));
  assert.strictEqual(calls[1].to, 'rrhh@aero.es');
  assert.ok(calls[1].subject.startsWith('Sol·licitud rebuda'));
  assert.strictEqual(await post({ ...emp, paquete: 'Gratis' }, '/empresa'), 400, 'paquete fuera de la lista');

  // invitaciones: quien llega con ?ref= de otro inscrito suma en su ranking; no vale invitarse a uno mismo
  const codAna = store.codigo('alumna@uab.cat');
  calls.length = 0;
  await post({ ...ok, email: 'amiga@uab.cat', ref: codAna });
  assert.ok(calls[0].html.includes(`?ref=${store.codigo('amiga@uab.cat')}`), 'enlace personal en la confirmacion');
  await post({ ...ok, ref: codAna });
  assert.deepStrictEqual(store.referidos().map((r) => [r.email, r.invitados]), [['alumna@uab.cat', 1]]);
  calls.length = 0;

  // todo queda guardado, una persona por email aunque se inscriba varias veces
  assert.strictEqual(store.inscritos().length, 2);
  assert.strictEqual(store.readAll('empresas').length, 1);

  // contador publico: solo a partir de PUBLIC_COUNT_MIN (3 en el test)
  assert.strictEqual((await request('GET', '/stats')).body, '{}', 'por debajo del minimo no se ensena');
  await post({ ...ok, email: 'otra@uab.cat' });
  assert.strictEqual(JSON.parse((await request('GET', '/stats')).body).inscritos, 3);

  // panel: sin la cabecera que pone nginx tras la contrasena, no hay datos
  assert.strictEqual((await request('GET', '/admin/api/datos')).status, 404);
  const datos = await request('GET', '/admin/api/datos', null, { 'x-flyandgrow-admin': '1' });
  assert.strictEqual(JSON.parse(datos.body).inscritos.length, 3);
  assert.strictEqual(JSON.parse(datos.body).referidos[0].invitados, 1);
  const csv = await request('GET', '/admin/api/export.csv', null, { 'x-flyandgrow-admin': '1' });
  assert.ok(csv.body.includes('otra@uab.cat'), 'export csv');

  // si el aviso de una empresa al equipo no sale, la solicitud vale igual y el aviso queda en cola
  failNotify = true;
  assert.strictEqual(await post(emp, '/empresa'), 200);
  assert.strictEqual(store.readAll('avisos-pendientes').length, 1, 'aviso en cola para reintentar');
  failNotify = false;

  // cuentas del panel
  const adm = { 'x-flyandgrow-admin': '1', 'x-flyandgrow-user': 'guillermo', 'content-type': 'application/json' };
  fs.writeFileSync(process.env.HTPASSWD, 'guillermo:$6$x$y\n');
  assert.deepStrictEqual(JSON.parse((await request('GET', '/admin/api/usuarios', null, adm)).body).usuarios, ['guillermo']);
  assert.strictEqual((await request('POST', '/admin/api/usuarios', { usuario: 'Laura', password: 'unaclavelarga' }, adm)).status, 200);
  assert.ok(fs.readFileSync(process.env.HTPASSWD, 'utf8').includes('laura:$6$'), 'hash sha-512, usuario en minusculas');
  assert.strictEqual((await request('POST', '/admin/api/usuarios', { usuario: 'laura', password: 'otraclavelarga' }, adm)).status, 409, 'duplicado');
  assert.strictEqual((await request('POST', '/admin/api/usuarios', { usuario: 'ana', password: 'corta' }, adm)).status, 400, 'clave corta');
  assert.strictEqual((await request('DELETE', '/admin/api/usuarios?u=guillermo', null, adm)).status, 400, 'no borrarse a si mismo');
  assert.strictEqual((await request('DELETE', '/admin/api/usuarios?u=laura', null, adm)).status, 200);
  assert.strictEqual((await request('GET', '/admin/api/usuarios')).status, 404, 'sin pasar por nginx no hay acceso');

  console.log('ok');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
