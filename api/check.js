// Comprobacion rapida sin mandar correos reales: `node api/check.js`
// Simula Resend con un fetch falso y verifica el flujo de /inscripcion.
const assert = require('assert');
const http = require('http');

const calls = [];
let failConfirm = false;
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  if (!String(url).includes('resend.com')) return realFetch(url, opts);
  const body = JSON.parse(opts.body);
  calls.push(body);
  const isConfirm = body.to === 'alumna@uab.cat';
  const ok = !(isConfirm && failConfirm);
  return { ok, status: ok ? 200 : 500, text: async () => '' };
};

process.env.PORT = '3019';
process.env.RESEND_API_KEY = 'test';
process.env.NOTIFY_EMAIL = 'org@test';
require('./server.js');

function post(data, path = '/inscripcion') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: 3019, path, method: 'POST' }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end(JSON.stringify(data));
  });
}

(async () => {
  await new Promise((r) => setTimeout(r, 200));
  const ok = { nombre: 'Ana <b>', email: 'alumna@uab.cat', uni: 'UAB', speedcheck: true };

  assert.strictEqual(await post(ok), 200);
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].to, 'org@test');
  assert.strictEqual(calls[1].to, 'alumna@uab.cat');
  assert.strictEqual(calls[1].attachments[0].filename, 'flyandgrow-2027.ics');
  assert.ok(calls[1].html.includes('Ana &lt;b&gt;'), 'nombre escapado');
  assert.ok(calls[1].html.includes('Entrevistas Express'), 'parrafo de entrevistas si speedcheck');

  calls.length = 0;
  failConfirm = true;
  assert.strictEqual(await post({ ...ok, speedcheck: false }), 200, 'si falla la confirmacion la inscripcion sigue valiendo');
  assert.ok(!calls[1].html.includes('Entrevistas Express'));

  calls.length = 0;
  failConfirm = false;
  assert.strictEqual(await post({ ...ok, lang: 'ca' }), 200);
  assert.ok(calls[1].subject.startsWith('Tens plaça'), 'correo en catalan si viene de /ca/');
  assert.ok(calls[1].html.includes('Entrevistes Express'));

  assert.strictEqual(await post({ ...ok, email: 'no-es-email' }), 400);

  // solicitud de empresa
  calls.length = 0;
  const emp = { empresa: 'Aero <SA>', contacto: 'Marta', email: 'rrhh@aero.es', paquete: 'Conexión', mensaje: 'Hola', lang: 'ca' };
  assert.strictEqual(await post(emp, '/empresa'), 200);
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].to, 'org@test');
  assert.strictEqual(calls[0].reply_to, 'rrhh@aero.es');
  assert.ok(calls[0].html.includes('Aero &lt;SA&gt;'));
  assert.strictEqual(calls[1].to, 'rrhh@aero.es');
  assert.ok(calls[1].subject.startsWith('Hem rebut'));
  assert.strictEqual(await post({ ...emp, paquete: 'Gratis' }, '/empresa'), 400, 'paquete fuera de la lista');

  console.log('ok');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
