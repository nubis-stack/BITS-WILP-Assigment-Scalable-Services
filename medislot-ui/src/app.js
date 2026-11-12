const path = require('path');
const express = require('express');
const morgan = require('morgan');
const { forwardTo } = require('./proxy');

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';
const DOCTOR_URL = process.env.DOCTOR_SERVICE_URL || 'http://localhost:4001';
const APPT_URL = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:5002';

const app = express();
if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'));

app.get('/health', (req, res) => res.json({ service: 'medislot-ui', status: 'UP' }));

// reserve / release are only for appointment-service (inside the cluster),
// so from the browser only reading a slot is allowed
app.use('/api/slots', (req, res, next) => {
  if (req.method !== 'GET') {
    return res.status(403).json({ message: 'slots can only be booked through an appointment' });
  }
  next();
});

app.use('/api/auth', forwardTo(AUTH_URL, 'auth-service'));
app.use('/api/doctors', forwardTo(DOCTOR_URL, 'doctor-service'));
app.use('/api/slots', forwardTo(DOCTOR_URL, 'doctor-service'));
app.use('/api/appointments', forwardTo(APPT_URL, 'appointment-service'));

app.use('/api', (req, res) => res.status(404).json({ message: 'unknown api path' }));

app.use(express.static(path.join(__dirname, '..', 'public')));

// anything else -> the single page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
