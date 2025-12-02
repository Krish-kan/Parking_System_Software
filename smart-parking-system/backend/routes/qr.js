
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Validate entry using reservation_id (simplified)
router.post('/validate-entry', auth(['admin','owner']), async (req, res) => {
  try {
    const { reservation_id } = req.body;
    const [rows] = await pool.query('SELECT reservation_id, status FROM reservations WHERE reservation_id=?', [reservation_id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (rows[0].status !== 'confirmed') return res.status(400).json({ error: 'Invalid status' });

    await pool.query('INSERT INTO parking_sessions (reservation_id, entry_time) VALUES (?, NOW())', [reservation_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate exit
router.post('/validate-exit', auth(['admin','owner']), async (req, res) => {
  const io = req.app.get('io');
  try {
    const { reservation_id } = req.body;
    const [rows] = await pool.query('SELECT session_id, entry_time FROM parking_sessions WHERE reservation_id=? ORDER BY session_id DESC LIMIT 1', [reservation_id]);
    if (!rows.length) return res.status(404).json({ error: 'No session' });

    await pool.query('UPDATE parking_sessions SET exit_time=NOW(), actual_duration=TIMESTAMPDIFF(MINUTE, entry_time, NOW()) WHERE session_id=?', [rows[0].session_id]);
    // realtime free space
    const [[r]] = await pool.query('SELECT lot_id, space_id FROM reservations WHERE reservation_id=?', [reservation_id]);
    io && io.emit('space_update', { lot_id: r.lot_id, space_id: r.space_id, is_available: 1 });
    // free space
    await pool.query('UPDATE parking_spaces s JOIN reservations r ON r.space_id=s.space_id SET s.is_available=1 WHERE r.reservation_id=?', [reservation_id]);
    await pool.query('UPDATE reservations SET status="completed" WHERE reservation_id=?', [reservation_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
