// EMAIL MODEL - models/Email.js
const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  from: {
    type: String,
    required: true
  },
  to: String,
  subject: String,
  date: {
    type: Date,
    required: true,
    index: true
  },
  bodyText: String,
  bodyHtml: String,
  category: {
    type: String,
    enum: ['Interested', 'Not Interested', 'Meeting Booked', 'Spam', 'Out of Office'],
    default: 'Interested'
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isStarred: {
    type: Boolean,
    default: false
  },
  hasAttachments: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create indexes for better performance
emailSchema.index({ userId: 1, date: -1 });
emailSchema.index({ userId: 1, category: 1 });
emailSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Email', emailSchema);