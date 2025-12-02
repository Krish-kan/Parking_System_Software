
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const QRCode = require('qrcode');
const moment = require('moment');
const router = express.Router();

// Create reservation
router.post('/', auth(['user','admin','owner']), async (req, res) => {
  const io = req.app.get('io');
  const conn = await pool.getConnection();
  try {
    const { lot_id, space_id, start_time, end_time } = req.body;
    await conn.beginTransaction();

    // Check availability
    const [spaceRows] = await conn.query('SELECT is_available FROM parking_spaces WHERE space_id=? AND lot_id=? FOR UPDATE', [space_id, lot_id]);
    if (!spaceRows.length || !spaceRows[0].is_available) {
      await conn.rollback();
      return res.status(400).json({ error: 'Space not available' });
    }

    // price calc (simple hourly)
    const [lotRows] = await conn.query('SELECT hourly_rate FROM parking_lots WHERE lot_id=?', [lot_id]);
    const rate = lotRows.length ? Number(lotRows[0].hourly_rate) : 0;
    const hours = Math.ceil((new Date(end_time) - new Date(start_time)) / (1000*60*60));
    const amount = Math.max(1, hours) * rate;

    const [result] = await conn.query(
      'INSERT INTO reservations (user_id, space_id, lot_id, start_time, end_time, total_amount, status) VALUES (?,?,?,?,?,?,?)',
      [req.user.user_id, space_id, lot_id, start_time, end_time, amount, 'confirmed']
    );

    // Block space
    await conn.query('UPDATE parking_spaces SET is_available=0 WHERE space_id=?', [space_id]);

    // realtime
    io && io.emit('space_update', { lot_id, space_id, is_available: 0 });

    // Generate QR
    const qrPayload = { reservation_id: result.insertId, user_id: req.user.user_id, space_id, ts: Date.now() };
    const qrString = JSON.stringify(qrPayload);
    const qrDataUrl = await QRCode.toDataURL(qrString);
    await conn.query('UPDATE reservations SET qr_code=? WHERE reservation_id=?', [qrDataUrl, result.insertId]);

    await conn.commit();
    res.json({ reservation_id: result.insertId, amount, qr: qrDataUrl });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// Get my reservations
router.get('/', auth(['user','admin','owner']), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reservations WHERE user_id=? ORDER BY created_at DESC', [req.user.user_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
