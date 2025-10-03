// SOCKET HANDLER - sockets/socketHandler.js
const emailService = require('../services/emailService');
const aiService = require('../services/aiservice');
const slackService = require('../services/slackService');
const Email = require('../models/email');

let activeUsers = new Map();

function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log('📱 Client connected:', socket.id);
    
    socket.on('user-login', async (userData) => {
      activeUsers.set(socket.id, userData);
      console.log('👤 User logged in:', userData.email);
      
      // Start fetching emails for this user immediately
      setTimeout(() => fetchUserEmails(userData.email, socket), 2000);
    });
    
    socket.on('disconnect', () => {
      const userData = activeUsers.get(socket.id);
      if (userData) {
        console.log('📱 User disconnected:', userData.email);
      }
      activeUsers.delete(socket.id);
    });
    
    socket.on('manual-refresh', async (userData) => {
      console.log('🔄 Manual refresh requested by:', userData.email);
      await fetchUserEmails(userData.email, socket);
    });
  });

  // Auto-fetch emails every 2 minutes for all active users
  setInterval(async () => {
    console.log('⏰ Auto-fetch triggered for', activeUsers.size, 'active users');
    
    for (const [socketId, userData] of activeUsers) {
      await fetchUserEmails(userData.email);
    }
  }, 120000); // 2 minutes

  async function fetchUserEmails(userEmail, socket = null) {
    try {
      console.log('📧 Fetching emails for:', userEmail);
      
      // Get recent emails from Gmail
      const newEmails = await emailService.fetchGmailEmails(userEmail);
      
      if (newEmails.length > 0) {
        console.log(`✅ Found ${newEmails.length} new emails`);
        
        for (const emailData of newEmails) {
          // Check if email already exists
          const existingEmail = await Email.findOne({ messageId: emailData.messageId });
          if (existingEmail) continue;
          
          // Categorize using AI
          const category = await aiService.categorizeEmail(emailData.subject, emailData.bodyText);
          const confidence = aiService.calculateConfidence(emailData, category);
          
          // Save to database
          const email = new Email({
            ...emailData,
            userId: userEmail,
            category,
            aiConfidence: confidence
          });
          
          await email.save();
          console.log(`📧 Saved: ${emailData.subject} → ${category}`);
          
          // Send real-time update to user
          const emailUpdate = {
            _id: email._id,
            from: email.from,
            subject: email.subject,
            category: email.category,
            date: email.date,
            aiConfidence: email.aiConfidence,
            isRead: email.isRead,
            bodyText: email.bodyText
          };
          
          if (socket) {
            socket.emit('new-email', emailUpdate);
          } else {
            // Broadcast to all sockets for this user
            for (const [socketId, userData] of activeUsers) {
              if (userData.email === userEmail) {
                io.to(socketId).emit('new-email', emailUpdate);
              }
            }
          }
          
          // Send Slack notification for important emails
          if (['Interested', 'Meeting Booked'].includes(category)) {
            await slackService.sendNotification(email);
          }
        }
        
        console.log('✅ Email processing completed');
      } else {
        console.log('📭 No new emails found');
      }
      
    } catch (error) {
      console.error('❌ Email fetch error:', error);
      if (socket) {
        socket.emit('email-error', { message: 'Failed to fetch emails: ' + error.message });
      }
    }
  }
}

module.exports = socketHandler;