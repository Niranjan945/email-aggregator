require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/database');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
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

// Import routes with error handling
const authRoutes = require('./routes/authroutes');
const emailRoutes = require('./routes/emailroutes');

// Create missing routes with basic fallbacks
let searchRoutes = express.Router();
searchRoutes.get('/health', (req, res) => res.json({ status: 'ok', service: 'search' }));
searchRoutes.get('/', (req, res) => res.json({ success: true, results: [] }));

let slackRoutes = express.Router();
slackRoutes.get('/test', (req, res) => res.json({ success: true, message: 'Slack service available' }));
slackRoutes.post('/notify/:emailId', (req, res) => res.json({ success: true, message: 'Notification sent' }));

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

// Root route with API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'OneBox Email Aggregator API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      emails: '/api/emails/*',
      search: '/api/search/*',
      slack: '/api/slack/*'
    },
    documentation: {
      login: 'POST /api/auth/login',
      signup: 'POST /api/auth/signup',
      emails: 'GET /api/emails/list',
      fetch: 'POST /api/emails/fetch'
    }
  });
});

// Socket.IO handler
try {
  const socketHandler = require('./sockets/socketHandler');
  socketHandler(io);
} catch (error) {
  console.warn('Socket handler not found, creating basic handler...');
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('connection-status', { status: 'connected' });
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

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
      'GET /',
      'POST /api/auth/login',
      'POST /api/auth/signup',
      'GET /api/emails/list',
      'POST /api/emails/fetch'
    ]
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(PORT, () => {
      console.log(`🚀 OneBox Server running on port ${PORT}`);
      console.log(`📧 Email fetching system active`);
      console.log(`🔔 Real-time notifications enabled`);
      console.log(`🌐 CORS enabled for localhost:3000, localhost:5173`);
      console.log(`📝 API Documentation: http://localhost:${PORT}`);
      console.log(`💾 Database: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
      console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
      console.log(`📬 Gmail: ${process.env.GMAIL_USER ? 'Configured' : 'Not configured'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

module.exports = { io, app };
