
const express = require('express');
const http = require('http');

const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.send('Smart Parking API running!'));

// routes
const authRoutes = require('./routes/auth');
const lotRoutes = require('./routes/lots');
const reservationRoutes = require('./routes/reservations');
const paymentsRoutes = require('./routes/payments');
const qrRoutes = require('./routes/qr');

app.use('/api/auth', authRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/qr', qrRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on ${PORT}`));
