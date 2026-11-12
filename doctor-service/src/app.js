const express = require('express');
const morgan = require('morgan');
const types = require('pg').types;

const doctorRoutes = require('./routes/doctors');
const slotRoutes = require('./routes/slots');
const { pool } = require('./db');

// return DATE columns as plain 'YYYY-MM-DD' strings, otherwise pg converts
// them to JS Date in local timezone and the day can shift
types.setTypeParser(1082, val => val);

const app = express();
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ service: 'doctor-service', status: 'UP', db: 'UP' });
  } catch (e) {
    res.status(503).json({ service: 'doctor-service', status: 'DOWN', db: 'DOWN' });
  }
});

app.use('/api/doctors', doctorRoutes);
app.use('/api/slots', slotRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `no route for ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'invalid JSON body' });
  }
  // invalid integer id etc. from postgres
  if (err.code === '22P02') {
    return res.status(400).json({ message: 'invalid input: ' + err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'internal server error' });
});

module.exports = app;
