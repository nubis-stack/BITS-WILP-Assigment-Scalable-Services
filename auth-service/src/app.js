const express = require('express');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { authenticate } = require('./users');

const SECRET = process.env.JWT_SECRET || 'medislot-local-dev-secret-0f8a2c91';
const EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '2h';

const app = express();
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

function readToken(req) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

app.get('/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'UP' });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  const user = authenticate(username, password);
  if (!user) {
    return res.status(401).json({ message: 'invalid username or password' });
  }

  const token = jwt.sign(
    { sub: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
  console.log(`login ok: ${user.username} (${user.role})`);
  res.json({ token, expiresIn: EXPIRES_IN, user });
});

app.get('/api/auth/me', (req, res) => {
  const claims = readToken(req);
  if (!claims) return res.status(401).json({ message: 'token missing or expired' });
  res.json({ id: claims.sub, name: claims.name, email: claims.email,
             phone: claims.phone, role: claims.role });
});

// other services verify the token themselves with the shared secret,
// this endpoint is just there for tools / debugging
app.post('/api/auth/verify', (req, res) => {
  const claims = readToken(req);
  res.status(claims ? 200 : 401).json({ valid: !!claims, claims: claims || undefined });
});

app.use((req, res) => res.status(404).json({ message: 'not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ message: 'internal server error' });
});

module.exports = app;
