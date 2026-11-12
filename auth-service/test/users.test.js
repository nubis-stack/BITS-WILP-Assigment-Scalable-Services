const test = require('node:test');
const assert = require('node:assert');
const { authenticate } = require('../src/users');

test('known patient logs in', () => {
  const u = authenticate('rahul', 'rahul123');
  assert.strictEqual(u.role, 'patient');
  assert.strictEqual(u.email, 'rahul.sen@gmail.com');
  assert.strictEqual(u.password, undefined);
});

test('username is case insensitive', () => {
  assert.ok(authenticate('Priya', 'priya123'));
});

test('wrong password rejected', () => {
  assert.strictEqual(authenticate('rahul', 'wrong'), null);
});

test('known user cannot use the demo password', () => {
  assert.strictEqual(authenticate('admin', 'demo123'), null);
});

test('any new username works with demo password', () => {
  const u = authenticate('sneha', 'demo123');
  assert.strictEqual(u.role, 'patient');
  assert.strictEqual(u.email, 'sneha@medislot.demo');
});

test('weird usernames are not accepted', () => {
  assert.strictEqual(authenticate('a', 'demo123'), null);
  assert.strictEqual(authenticate('<script>', 'demo123'), null);
});
