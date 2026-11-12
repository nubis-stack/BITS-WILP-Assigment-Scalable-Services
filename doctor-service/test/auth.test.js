const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { requireAdmin } = require('../src/auth');

function run(header) {
  const req = { headers: header ? { authorization: header } : {} };
  const out = { code: 200, nextCalled: false };
  const res = {
    status(c) { out.code = c; return this; },
    json(b) { out.body = b; return this; }
  };
  requireAdmin(req, res, () => { out.nextCalled = true; });
  return out;
}

const sign = role => jwt.sign({ sub: 'X1', role }, 'medislot-local-dev-secret-0f8a2c91');

test('no token -> 401', () => {
  assert.strictEqual(run().code, 401);
});

test('patient token -> 403', () => {
  assert.strictEqual(run('Bearer ' + sign('patient')).code, 403);
});

test('admin token passes', () => {
  assert.ok(run('Bearer ' + sign('admin')).nextCalled);
});

test('token signed with another key -> 401', () => {
  const bad = jwt.sign({ role: 'admin' }, 'some-other-key');
  assert.strictEqual(run('Bearer ' + bad).code, 401);
});
