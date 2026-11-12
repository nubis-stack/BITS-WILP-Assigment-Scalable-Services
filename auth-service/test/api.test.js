process.env.NODE_ENV = 'test';
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

const post = (path, body, token) => fetch(base + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
  body: JSON.stringify(body)
});

test('login returns a token that /me accepts', async () => {
  const res = await post('/api/auth/login', { username: 'rahul', password: 'rahul123' });
  assert.strictEqual(res.status, 200);
  const { token, user } = await res.json();
  assert.strictEqual(user.name, 'Rahul Sen');

  const me = await fetch(base + '/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
  assert.strictEqual(me.status, 200);
  assert.strictEqual((await me.json()).role, 'patient');
});

test('bad login is 401', async () => {
  const res = await post('/api/auth/login', { username: 'rahul', password: 'nope' });
  assert.strictEqual(res.status, 401);
});

test('missing fields is 400', async () => {
  const res = await post('/api/auth/login', { username: 'rahul' });
  assert.strictEqual(res.status, 400);
});

test('me without token is 401', async () => {
  const res = await fetch(base + '/api/auth/me');
  assert.strictEqual(res.status, 401);
});
