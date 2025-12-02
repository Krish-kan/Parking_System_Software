
const express = require('express');
const Razorpay = require('razorpay');
const pool = require('../db');
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const router = express.Router();

// Create Razorpay order (test mode). If keys missing, fallback to mock.
router.post('/create-order', auth(['user','admin','owner']), async (req, res) => {
  try {
    const { reservation_id } = req.body;
    if (!reservation_id) return res.status(400).json({ error: 'reservation_id required' });

    const [rows] = await pool.query('SELECT total_amount, user_id FROM reservations WHERE reservation_id=?', [reservation_id]);
    if (!rows.length) return res.status(404).json({ error: 'Reservation not found' });
    const amount = Math.round(Number(rows[0].total_amount) * 100); // in paise

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      // mock order
      return res.json({
        mock: true,
        id: 'order_mock_'+reservation_id,
        amount, currency: 'INR', receipt: 'rcpt_'+reservation_id
      });
    }

    const rzp = new Razorpay({ key_id, key_secret });
    const order = await rzp.orders.create({
      amount,
      currency: 'INR',
      receipt: 'rcpt_'+reservation_id
    });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark payment as paid (mock success or webhook substitute)
router.post('/mark-paid', auth(['user','admin','owner']), async (req, res) => {
  try {
    const { reservation_id, order_id, payment_id, signature } = req.body;
    // In real mode, verify signature here.
    const [rows] = await pool.query('SELECT user_id, total_amount FROM reservations WHERE reservation_id=?', [reservation_id]);
    if (!rows.length) return res.status(404).json({ error: 'Reservation not found' });

    await pool.query('INSERT INTO payments (reservation_id, user_id, amount, payment_method, transaction_id, payment_status) VALUES (?,?,?,?,?,?)',
      [reservation_id, req.user.user_id, rows[0].total_amount, 'card', payment_id || order_id || 'mock_txn', 'paid']);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate receipt PDF for a reservation
router.get('/receipt/:reservation_id', auth(['user','admin','owner']), async (req, res) => {
  try {
    const reservation_id = req.params.reservation_id;
    const [rows] = await pool.query(`
      SELECT r.*, u.username, u.email, l.lot_name, l.address
      FROM reservations r
      JOIN users u ON u.user_id = r.user_id
      JOIN parking_lots l ON l.lot_id = r.lot_id
      WHERE r.reservation_id = ?`, [reservation_id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const r = rows[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=receipt_'+reservation_id+'.pdf');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.fontSize(20).text('Smart Parking - Payment Receipt', { align: 'center' }).moveDown();
    doc.fontSize(12).text('Reservation ID: ' + r.reservation_id);
    doc.text('User: ' + r.username + ' (' + r.email + ')');
    doc.text('Lot: ' + r.lot_name);
    doc.text('Address: ' + (r.address || 'N/A'));
    doc.text('Space ID: ' + r.space_id);
    doc.text('Start: ' + r.start_time);
    doc.text('End: ' + r.end_time);
    doc.text('Amount: ₹' + r.total_amount);
    doc.moveDown().text('Status: ' + r.status);
    if (r.qr_code) {
      try {
        // Embed QR if data URI
        const data = r.qr_code;
        const prefix = 'data:image/png;base64,';
        if (data.startsWith(prefix)) {
          const base64 = data.slice(prefix.length);
          const buf = Buffer.from(base64, 'base64');
          doc.moveDown().text('QR Code:', { underline: true });
          doc.image(buf, { fit: [150, 150] });
        }
      } catch (e) {}
    }
    doc.end();
    doc.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Simple analytics endpoints
router.get('/analytics/revenue-by-lot', auth(['admin','owner']), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vw_revenue_by_lot');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/analytics/counters', auth(['admin','owner']), async (req, res) => {
  try {
    const [[u]] = await pool.query('SELECT COUNT(*) AS users FROM users');
    const [[l]] = await pool.query('SELECT COUNT(*) AS lots FROM parking_lots');
    const [[s]] = await pool.query('SELECT COUNT(*) AS spaces FROM parking_spaces');
    const [[r]] = await pool.query('SELECT COUNT(*) AS reservations FROM reservations');
    res.json({ users: u.users, lots: l.lots, spaces: s.spaces, reservations: r.reservations });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
