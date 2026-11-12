const crypto = require('crypto');

// No user database for this assignment - a few dummy accounts are kept in
// memory. Passwords are stored as sha256 just so they are not plain text.
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

const USERS = [
  { id: 'P1001', username: 'rahul', password: sha('rahul123'), name: 'Rahul Sen',
    email: 'rahul.sen@gmail.com', phone: '9123456780', role: 'patient' },
  { id: 'P1002', username: 'priya', password: sha('priya123'), name: 'Priya Nair',
    email: 'priya.nair@gmail.com', phone: '9988012345', role: 'patient' },
  { id: 'P1003', username: 'amit', password: sha('amit123'), name: 'Amit Verma',
    email: 'amit.verma@yahoo.com', phone: '9876501234', role: 'patient' },
  { id: 'A0001', username: 'admin', password: sha('admin123'), name: 'Clinic Admin',
    email: 'admin@medislot.in', phone: null, role: 'admin' }
];

// Any other username is accepted as a patient if this password is used.
// Handy for the demo - no need to remember the list above.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo123';

function samePassword(plain, hash) {
  const a = Buffer.from(sha(plain));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicView(u) {
  const { password, ...rest } = u;
  return rest;
}

function authenticate(username, password) {
  if (!username || !password) return null;
  const uname = String(username).trim().toLowerCase();

  const known = USERS.find(u => u.username === uname);
  if (known) {
    return samePassword(password, known.password) ? publicView(known) : null;
  }

  if (password === DEMO_PASSWORD && /^[a-z][a-z0-9._]{2,19}$/.test(uname)) {
    const name = uname.charAt(0).toUpperCase() + uname.slice(1);
    return {
      id: 'P-' + sha(uname).slice(0, 6).toUpperCase(),
      username: uname,
      name,
      email: `${uname}@medislot.demo`,
      phone: null,
      role: 'patient'
    };
  }
  return null;
}

module.exports = { authenticate, DEMO_PASSWORD };
