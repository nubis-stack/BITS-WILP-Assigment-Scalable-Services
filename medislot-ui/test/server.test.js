process.env.NODE_ENV = 'test';
// point the proxy at a port where nothing is listening
process.env.APPOINTMENT_SERVICE_URL = 'http://127.0.0.1:1';

const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

let server, base;

test.before(() => new Promise(resolve => {
  server = app.listen(0, () => {
    base = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
test.after(() => server.close());

test('health', async () => {
  const res = await fetch(base + '/health');
  assert.strictEqual(res.status, 200);
});

test('serves the page', async () => {
  const res = await fetch(base + '/');
  assert.match(await res.text(), /MediSlot/);
});

test('browser cannot reserve a slot directly', async () => {
  const res = await fetch(base + '/api/slots/1/reserve', { method: 'PATCH' });
  assert.strictEqual(res.status, 403);
});

test('backend down gives a readable 502', async () => {
  const res = await fetch(base + '/api/appointments');
  assert.strictEqual(res.status, 502);
  assert.match((await res.json()).message, /appointment-service/);
});
