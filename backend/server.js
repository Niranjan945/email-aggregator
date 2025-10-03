// CLEAN SERVER.JS - server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Import routes
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/emails');
const searchRoutes = require('./routes/search');
const slackRoutes = require('./routes/slack');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/slack', slackRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'OneBox Email Aggregator is running',
    timestamp: new Date()
  });
});

// Socket.IO setup
const socketHandler = require('./sockets/socketHandler');
socketHandler(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📧 Email fetching system active');
  console.log('🔔 Real-time notifications enabled');
});

module.exports = { io };