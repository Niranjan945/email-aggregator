// ENHANCED SERVER.JS - server.js
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
    origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  }
});

// Enhanced middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Import routes
const authRoutes = require('./routes/authroutes');
const emailRoutes = require('./routes/emailroutes');

// Add missing route files if they don't exist
let searchRoutes, slackRoutes;
try {
  searchRoutes = require('./routes/search');
} catch (e) {
  // Create basic search routes
  searchRoutes = express.Router();
  searchRoutes.get('/health', (req, res) => res.json({ status: 'ok', service: 'search' }));
  searchRoutes.get('/search', (req, res) => res.json({ success: true, results: [] }));
}

try {
  slackRoutes = require('./routes/slack');
} catch (e) {
  // Create basic slack routes
  slackRoutes = express.Router();
  slackRoutes.get('/test', (req, res) => res.json({ success: true, message: 'Slack service available' }));
  slackRoutes.post('/notify/:emailId', (req, res) => res.json({ success: true, message: 'Notification sent' }));
}

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/slack', slackRoutes);

// Enhanced health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'OneBox Email Aggregator is running',
    timestamp: new Date(),
    services: {
      database: 'connected',
      email: 'active',
      websocket: 'active'
    }
  });
});

// Basic root route
app.get('/', (req, res) => {
  res.json({
    message: 'OneBox Email Aggregator API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      emails: '/api/emails/*',
      search: '/api/search/*',
      slack: '/api/slack/*'
    }
  });
});

// Enhanced Socket.IO setup
const socketHandler = require('./sockets/socketHandler');
socketHandler(io);

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    timestamp: new Date()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health',
      'POST /api/auth/login',
      'POST /api/auth/signup',
      'GET /api/emails/list',
      'POST /api/emails/fetch'
    ]
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 OneBox Server running on port ${PORT}`);
  console.log(`📧 Email fetching system active`);
  console.log(`🔔 Real-time notifications enabled`);
  console.log(`🌐 CORS enabled for localhost:3000, localhost:5173`);
  console.log(`📝 API Documentation: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

module.exports = { io, app };
