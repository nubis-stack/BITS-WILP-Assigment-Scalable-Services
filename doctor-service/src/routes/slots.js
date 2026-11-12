const express = require('express');
const { pool } = require('../db');
const { toSlot } = require('../mappers');

const router = express.Router();

router.get('/:slotId', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM slots WHERE id = $1', [req.params.slotId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'slot not found' });
    res.json(toSlot(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Called by appointment-service while booking.
// The WHERE status='OPEN' makes this safe when two bookings hit the same slot together -
// only one update will match, the other gets 409.
router.patch('/:slotId/reserve', async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE slots SET status = 'BOOKED' WHERE id = $1 AND status = 'OPEN' RETURNING *`,
      [req.params.slotId]
    );
    if (result.rowCount === 1) return res.json(toSlot(result.rows[0]));

    const existing = await pool.query('SELECT id FROM slots WHERE id = $1', [req.params.slotId]);
    if (existing.rowCount === 0) return res.status(404).json({ message: 'slot not found' });
    res.status(409).json({ message: 'slot is already booked' });
  } catch (err) {
    next(err);
  }
});

// called when an appointment is cancelled
router.patch('/:slotId/release', async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE slots SET status = 'OPEN' WHERE id = $1 RETURNING *`,
      [req.params.slotId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'slot not found' });
    res.json(toSlot(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
