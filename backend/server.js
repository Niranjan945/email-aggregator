require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/database');

const app = express();
const server = http.createServer(app);

// Enhanced CORS and Socket.IO setup
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}));

const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Import routes
const authRoutes = require('./routes/authroutes');
const emailRoutes = require('./routes/emailroutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);

// Enhanced health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'OneBox Email Aggregator is running',
    timestamp: new Date(),
    services: {
      database: 'connected',
      gmail: process.env.GMAIL_USER ? 'configured' : 'not configured',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
      slack: process.env.SLACK_WEBHOOK_URL ? 'configured' : 'not configured'
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'OneBox Email Aggregator API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      login: 'POST /api/auth/login',
      signup: 'POST /api/auth/signup',
      fetchEmails: 'POST /api/emails/fetch',
      listEmails: 'GET /api/emails/list',
      emailStats: 'GET /api/emails/stats',
      debug: 'GET /api/emails/debug'
    }
  });
});

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
      'POST /api/emails/fetch',
      'GET /api/emails/list'
    ]
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 OneBox Server running on port ${PORT}`);
  console.log(`📧 Gmail: ${process.env.GMAIL_USER ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📢 Slack: ${process.env.SLACK_WEBHOOK_URL ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}`);
});

module.exports = { io, app };
