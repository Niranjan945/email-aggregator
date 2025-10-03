const emailService = require('../services/emailService');
const Email = require('../models/email');
let activeUsers = new Map();

function socketHandler(io) {
  console.log('🔌 Socket.IO handler initialized');

  io.on('connection', (socket) => {
    console.log('📱 Client connected:', socket.id);

    socket.on('user-login', async (userData) => {
      try {
        activeUsers.set(socket.id, { ...userData, socketId: socket.id, lastActivity: new Date() });
        socket.join(`user-${userData.email}`);
        socket.emit('connection-status', { status: 'connected', message: 'Real-time email sync active', timestamp: new Date() });
        setTimeout(() => fetchUserEmails(userData.email, socket), 2000);
      } catch (err) {
        console.error('Error handling user login:', err);
        socket.emit('error', { message: 'Login failed' });
      }
    });

    socket.on('manual-refresh', async (userData) => {
      try {
        await fetchUserEmails(userData.email, socket);
        socket.emit('refresh-complete', { message: 'Email refresh completed', timestamp: new Date() });
      } catch (err) {
        console.error('Manual refresh failed:', err);
        socket.emit('email-error', { message: 'Failed to refresh emails: ' + err.message });
      }
    });

    socket.on('email-action', async (data) => {
      try {
        const { emailId, action, value } = data;
        const userData = activeUsers.get(socket.id);
        if (!userData) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }
        const email = await Email.findOneAndUpdate(
          { _id: emailId, userId: userData.email },
          { [action]: value },
          { new: true }
        );
        if (email) {
          socket.emit('email-updated', { emailId, action, value, email });
        }
      } catch (err) {
        console.error('Email action failed:', err);
        socket.emit('error', { message: 'Action failed: ' + err.message });
      }
    });

    socket.on('disconnect', () => {
      const userData = activeUsers.get(socket.id);
      if (userData) activeUsers.delete(socket.id);
    });
  });

  const autoFetchInterval = setInterval(async () => {
    if (!activeUsers.size) return;
    for (const [, userData] of activeUsers) {
      try { await fetchUserEmails(userData.email, null, true); }
      catch (err) { console.error(`Auto-fetch failed for ${userData.email}:`, err); }
    }
  }, 120000);

  process.on('SIGTERM', () => clearInterval(autoFetchInterval));

  async function fetchUserEmails(userEmail, socket = null, isAutoFetch = false) {
    try {
      let newEmails = [], useDemo = false;
      try {
        const testResult = await emailService.testConnection();
        if (testResult.success) {
          const fetched = await emailService.fetchGmailEmails(userEmail, 10);
          for (const emailData of fetched) {
            const exists = await Email.findOne({ messageId: emailData.messageId, userId: userEmail });
            if (exists) continue;
            let category = 'Interested', aiConfidence = 0.8;
            try {
              const aiService = require('../services/aiservice');
              category = await aiService.categorizeEmail(emailData.subject, emailData.bodyText);
              aiConfidence = aiService.calculateConfidence(emailData, category);
            } catch {
              category = fallbackCategorization(emailData);
            }
            const email = new Email({ ...emailData, userId: userEmail, category, aiConfidence, isRead: false, isStarred: false });
            await email.save();
            newEmails.push(email);
          }
        } else throw new Error('Email service not available');
      } catch {
        useDemo = true;
        const recentCount = await Email.countDocuments({ userId: userEmail, date: { $gte: new Date(Date.now() - 86400000) } });
        if (!recentCount) {
          const demoEmails = generateDemoEmails(userEmail);
          for (const demoData of demoEmails) {
            const exists = await Email.findOne({ messageId: demoData.messageId, userId: userEmail });
            if (!exists) {
              const email = new Email(demoData);
              await email.save();
              newEmails.push(email);
            }
          }
        }
      }

      if (newEmails.length) {
        const updates = newEmails.map(e => ({
          _id: e._id, from: e.from, to: e.to, subject: e.subject,
          category: e.category, date: e.date, aiConfidence: e.aiConfidence,
          isRead: e.isRead, isStarred: e.isStarred,
          bodyText: e.bodyText?.substring(0,200)+'...'
        }));
        io.to(`user-${userEmail}`).emit('new-emails', { emails: updates, count: updates.length, timestamp: new Date(), source: useDemo?'demo':'live' });
        for (const email of newEmails) {
          if (['Interested','Meeting Booked'].includes(email.category)) {
            io.to(`user-${userEmail}`).emit('new-email', {
              _id: email._id, from: email.from, subject: email.subject,
              category: email.category, date: email.date,
              aiConfidence: email.aiConfidence, bodyText: email.bodyText
            });
            try {
              const slackService = require('../services/slackService');
              if (slackService) await slackService.sendNotification(email);
            } catch {}
          }
        }
      } else if (!isAutoFetch && socket) {
        socket.emit('no-new-emails', { message: 'No new emails found', timestamp: new Date() });
      }
    } catch (err) {
      const errMsg = { message: 'Failed to fetch emails: ' + err.message, timestamp: new Date(), error: true };
      if (socket) socket.emit('email-error', errMsg);
      else io.to(`user-${userEmail}`).emit('email-error', errMsg);
    }
  }

  function fallbackCategorization(d) {
    const s = (d.subject||'').toLowerCase(), b = (d.bodyText||'').toLowerCase(), f = (d.from||'').toLowerCase();
    if (s.includes('meeting')||b.includes('calendar')) return 'Meeting Booked';
    if (s.includes('interested')||b.includes('interested')) return 'Interested';
    if (s.includes('not interested')||b.includes('not interested')) return 'Not Interested';
    if (s.includes('out of office')||b.includes('vacation')) return 'Out of Office';
    if (f.includes('noreply')||s.includes('spam')) return 'Spam';
    return 'Interested';
  }

  function generateDemoEmails(userEmail) {
    const now = Date.now();
    return [
      { messageId:`demo1-${now}`,userId:userEmail,from:'a@example.com',to:userEmail,subject:'Demo Email 1',bodyText:'Demo content',date:new Date(now-900000),category:'Interested',aiConfidence:0.9,isRead:false,isStarred:false },
      { messageId:`demo2-${now}`,userId:userEmail,from:'b@example.com',to:userEmail,subject:'Demo Email 2',bodyText:'Demo content 2',date:new Date(now-600000),category:'Meeting Booked',aiConfidence:0.95,isRead:false,isStarred:true },
      { messageId:`demo3-${now}`,userId:userEmail,from:'c@example.com',to:userEmail,subject:'Demo Email 3',bodyText:'Demo content 3',date:new Date(now-3600000),category:'Not Interested',aiConfidence:0.85,isRead:true,isStarred:false }
    ];
  }

  return { getActiveUsers:()=>activeUsers, broadcastToUser:(u,e,d)=>io.to(`user-${u}`).emit(e,d) };
}

module.exports = socketHandler;
