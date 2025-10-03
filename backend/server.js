require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import all routes
const authRoutes = require('./routes/authroutes');
const emailRoutes = require('./routes/emailroutes');
const searchRoutes = require('./routes/searchRoutes');
const slackRoutes = require('./routes/slackRoutes');  // NEW: Slack notifications

// Import job processor for background tasks
const emailProcessor = require('./jobs/emailProcessor');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/slack', slackRoutes);  // NEW: Slack notification endpoints

// Health-check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Server is healthy!',
    status: 'ok',
    timestamp: new Date(),
    features: {
      emailFetching: 'active',
      aiCategorization: 'active',
      searchEngine: 'active',
      slackNotifications: 'active',  // NEW
      jobQueue: 'optional',
      realTimeSync: 'available'
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');

  try {
    await emailProcessor.close();

    const realTimeSync = require('./services/realTimeSync');
    await realTimeSync.stopAllSyncs();

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server after DB connection
const startServer = async () => {
  try {
    await connectDB();
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('👷 Background job processor: Active');
    console.log('🔄 Real-time sync service: Available');
    console.log('🔍 Search engine: Ready');
    console.log('📢 Slack notifications: Ready');  // NEW

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📬 Job queue and real-time sync ready`);
      console.log(`🔍 Search functionality available at /api/search/*`);
      console.log(`📢 Slack notifications available at /api/slack/*`);  // NEW
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();