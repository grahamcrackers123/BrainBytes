const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },

  isUser: {
    type: Boolean,
    default: true
  },

  subject: {
    type: String,
    enum: [
      'general',
      'math',
      'science',
      'history',
      'english',
      'technology',
      'geography'
    ],
    default: 'general'
  },

  questionType: {
    type: String,
    enum: [
      'definition',
      'explanation',
      'example',
      'general'
    ],
    default: 'general'
  },

  sentiment: {
    type: String,
    enum: [
      'neutral',
      'confused',
      'frustrated'
    ],
    default: 'neutral'
  },

  category: {
    type: String,
    default: 'general'
  },

  // =========================
  // CHAT SESSION ID
  // =========================

  chatId: {
    type: String,
    required: true
  },

  // =========================
  // USERNAME
  // =========================

  username: {
    type: String,
    trim: true,
    default: ''
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model('Message', messageSchema);