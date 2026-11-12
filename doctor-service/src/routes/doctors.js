const express = require('express');
const { pool } = require('../db');
const { checkDoctor, checkSlot } = require('../validators');
const { toDoctor, toSlot } = require('../mappers');
const { requireAdmin } = require('../auth');

const router = express.Router();

router.post('/', requireAdmin, async (req, res, next) => {
  const errors = checkDoctor(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { name, specialization, email, phone, consultationFee } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO doctors (name, specialization, email, phone, consultation_fee)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), specialization, email.toLowerCase(), phone || null, consultationFee || 0]
    );
    res.status(201).json(toDoctor(result.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'doctor with this email already exists' });
    }
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    let sql = 'SELECT * FROM doctors';
    const params = [];
    if (req.query.specialization) {
      sql += ' WHERE LOWER(specialization) = LOWER($1)';
      params.push(req.query.specialization);
    }
    sql += ' ORDER BY id';
    const result = await pool.query(sql, params);
    res.json(result.rows.map(toDoctor));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'doctor not found' });
    res.json(toDoctor(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  const errors = checkDoctor(req.body, true);
  if (errors.length) return res.status(400).json({ errors });

  const { name, specialization, phone, consultationFee } = req.body;
  try {
    // COALESCE keeps the old value when a field is not sent
    const result = await pool.query(
      `UPDATE doctors SET
         name = COALESCE($1, name),
         specialization = COALESCE($2, specialization),
         phone = COALESCE($3, phone),
         consultation_fee = COALESCE($4, consultation_fee)
       WHERE id = $5 RETURNING *`,
      [name, specialization, phone, consultationFee, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'doctor not found' });
    res.json(toDoctor(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM doctors WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'doctor not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---- slots of a doctor ----

router.post('/:id/slots', requireAdmin, async (req, res, next) => {
  const errors = checkSlot(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const { date, startTime, endTime } = req.body;
  try {
    const doc = await pool.query('SELECT id FROM doctors WHERE id = $1', [req.params.id]);
    if (doc.rowCount === 0) return res.status(404).json({ message: 'doctor not found' });

    const result = await pool.query(
      `INSERT INTO slots (doctor_id, slot_date, start_time, end_time)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, date, startTime, endTime]
    );
    res.status(201).json(toSlot(result.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'slot already exists for this doctor at that time' });
    }
    next(err);
  }
});

router.get('/:id/slots', async (req, res, next) => {
  const params = [req.params.id];
  let sql = 'SELECT * FROM slots WHERE doctor_id = $1';

  if (req.query.date) {
    params.push(req.query.date);
    sql += ` AND slot_date = $${params.length}`;
  }
  if (req.query.status) {
    params.push(req.query.status.toUpperCase());
    sql += ` AND status = $${params.length}`;
  }
  sql += ' ORDER BY slot_date, start_time';

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows.map(toSlot));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
