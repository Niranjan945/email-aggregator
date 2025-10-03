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
    required: true,
    index: true
  },
  to: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true,
    index: true
  },
  bodyText: {
    type: String,
    default: ''
  },
  bodyHtml: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  category: {
    type: String,
    enum: ['Interested', 'Meeting Booked', 'Not Interested', 'Out of Office', 'Spam'],
    default: 'Interested',
    index: true
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isStarred: {
    type: Boolean,
    default: false,
    index: true
  },
  slackNotified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
emailSchema.index({ userId: 1, date: -1 });
emailSchema.index({ userId: 1, category: 1 });
emailSchema.index({ userId: 1, isRead: 1 });
emailSchema.index({ messageId: 1, userId: 1 });

module.exports = mongoose.model('Email', emailSchema);
