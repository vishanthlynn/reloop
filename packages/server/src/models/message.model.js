const mongoose = require('mongoose');
const { MESSAGE_TYPES } = require('../utils/constants');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: Object.values(MESSAGE_TYPES),
    default: MESSAGE_TYPES.TEXT
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document']
    },
    url: String,
    public_id: String,
    filename: String,
    size: Number
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  editedAt: Date,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, isRead: 1 });
messageSchema.index({ createdAt: -1 });

// Virtual for conversation ID
messageSchema.virtual('conversationId').get(function() {
  const sortedIds = [this.sender, this.recipient].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
});

// Transform output
messageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Message', messageSchema);
