
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// List all lots with simple filters
router.get('/', async (req, res) => {
  try {
    const { city } = req.query;
    let sql = 'SELECT * FROM parking_lots';
    const args = [];
    if (city) { sql += ' WHERE city = ?'; args.push(city); }
    const [rows] = await pool.query(sql, args);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a lot
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM parking_lots WHERE lot_id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create lot (admin/owner)
router.post('/', auth(['admin','owner']), async (req, res) => {
  try {
    const { lot_name, address, city, state, latitude, longitude, total_spaces, hourly_rate } = req.body;
    const [result] = await pool.query(
      'INSERT INTO parking_lots (lot_name, address, city, state, latitude, longitude, total_spaces, owner_id, hourly_rate) VALUES (?,?,?,?,?,?,?,?,?)',
      [lot_name, address, city, state, latitude, longitude, total_spaces || 0, req.user.user_id, hourly_rate || 0]
    );
    res.json({ lot_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update lot
router.put('/:id', auth(['admin','owner']), async (req, res) => {
  try {
    const { lot_name, address, city, state, latitude, longitude, total_spaces, hourly_rate } = req.body;
    await pool.query(
      'UPDATE parking_lots SET lot_name=?, address=?, city=?, state=?, latitude=?, longitude=?, total_spaces=?, hourly_rate=? WHERE lot_id=?',
      [lot_name, address, city, state, latitude, longitude, total_spaces, hourly_rate, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Spaces in a lot
router.get('/:lotId/spaces', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM parking_spaces WHERE lot_id = ?', [req.params.lotId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add spaces
router.post('/:lotId/spaces', auth(['admin','owner']), async (req, res) => {
  try {
    const { spaces } = req.body; // [{space_number, space_type, floor_level}]
    if (!Array.isArray(spaces)) return res.status(400).json({ error: 'spaces[] required' });
    const values = spaces.map(s => [req.params.lotId, s.space_number, s.space_type || 'regular', s.floor_level || null, 1, 'active']);
    await pool.query(
      'INSERT INTO parking_spaces (lot_id, space_number, space_type, floor_level, is_available, status) VALUES ?',
      [values]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
