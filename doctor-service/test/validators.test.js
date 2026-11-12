const test = require('node:test');
const assert = require('node:assert');
const { checkDoctor, checkSlot } = require('../src/validators');

test('valid doctor passes', () => {
  const errs = checkDoctor({
    name: 'Dr. Anita Rao',
    specialization: 'Cardiology',
    email: 'anita.rao@medislot.in',
    phone: '9876543210',
    consultationFee: 700
  });
  assert.deepStrictEqual(errs, []);
});

test('doctor without email fails', () => {
  const errs = checkDoctor({ name: 'Dr. Ravi', specialization: 'ENT' });
  assert.ok(errs.includes('valid email is required'));
});

test('partial update only checks sent fields', () => {
  assert.deepStrictEqual(checkDoctor({ consultationFee: 500 }, true), []);
  assert.strictEqual(checkDoctor({ phone: '123' }, true).length, 1);
});

test('slot end time must be after start time', () => {
  const errs = checkSlot({ date: '2026-11-20', startTime: '10:30', endTime: '10:00' });
  assert.deepStrictEqual(errs, ['endTime must be after startTime']);
});

test('slot with bad date format', () => {
  const errs = checkSlot({ date: '20-11-2026', startTime: '10:00', endTime: '10:15' });
  assert.strictEqual(errs.length, 1);
});
