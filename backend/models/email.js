const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  messageId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  threadId: String,
  from: { type: String, required: true },
  to: [String],
  cc: [String],
  bcc: [String],
  subject: String,
  date: { type: Date, required: true, index: true },
  bodyText: String,
  bodyHtml: String,
  category: {
    type: String,
    enum: ['Interested', 'Not Interested', 'Meeting Booked', 'Spam', 'Out of Office', null],
    default: null
  },
  aiConfidence: { type: Number, min: 0, max: 1 },
  folder: { type: String, default: 'INBOX' },
  isRead: { type: Boolean, default: false },
  hasAttachments: { type: Boolean, default: false },
  accountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'EmailAccount',
    required: true,
    index: true
  }
}, { timestamps: true });

emailSchema.index({ accountId: 1, date: -1 });
emailSchema.index({ category: 1, date: -1 });
emailSchema.index({ from: 1, threadId: 1 });

module.exports = mongoose.model('Email', emailSchema);
