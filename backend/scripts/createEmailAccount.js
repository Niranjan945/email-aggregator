// Fixed Backend EmailAccount Creation Script
require('dotenv').config();
const mongoose = require('mongoose');

// Email Account Schema
const emailAccountSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  provider: { type: String, required: true, enum: ['gmail', 'outlook', 'yahoo'], lowercase: true },
  accessToken: { type: String, required: true },
  refreshToken: String,
  tokenExpiry: Date,
  lastSync: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  userId: { type: String, required: true }, // Changed from ObjectId to String
}, { timestamps: true });

const EmailAccount = mongoose.model('EmailAccount', emailAccountSchema);

async function createDefaultEmailAccount() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if account already exists
    const existingAccount = await EmailAccount.findOne({ 
      email: process.env.GMAIL_USER 
    });

    if (existingAccount) {
      console.log('✅ Email account already exists:', existingAccount._id);
      process.exit(0);
    }

    // Create new email account with string userId
    const emailAccount = new EmailAccount({
      email: process.env.GMAIL_USER,
      provider: 'gmail',
      accessToken: process.env.GMAIL_APP_PASSWORD,
      refreshToken: '',
      tokenExpiry: null,
      lastSync: null,
      isActive: true,
      userId: 'default-user-123' // Use string instead of ObjectId
    });

    await emailAccount.save();
    console.log('✅ Email account created successfully!');
    console.log('Account ID:', emailAccount._id);
    console.log('Email:', emailAccount.email);
    
  } catch (error) {
    console.error('❌ Failed to create email account:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createDefaultEmailAccount();