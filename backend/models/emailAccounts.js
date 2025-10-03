const mongoose = require('mongoose');

const emailAccountSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true 
  },
  provider: { 
    type: String, 
    required: true,
    enum: ['gmail', 'outlook', 'yahoo'],
    lowercase: true 
  },
  accessToken: { type: String, required: true },
  refreshToken: String,
  tokenExpiry: Date,
  lastSync: { 
    type: Date, 
    default: null
  },
  isActive: { 
    type: Boolean, 
    default: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  }
}, { timestamps: true });

emailAccountSchema.index({ userId: 1, provider: 1 });

module.exports = mongoose.model('EmailAccount', emailAccountSchema);
