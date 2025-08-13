import { Message } from '../models/message.model.js';
import { Conversation } from '../models/conversation.model.js';
import { User } from '../models/user.model.js';
import { scamDetectionService } from './ai/scamDetection.service.js';
import { ApiError } from '../utils/ApiError.js';

class ChatService {
  constructor() {
    this.activeConnections = new Map();
  }

  // Register user connection
  registerConnection(userId, socketId) {
    this.activeConnections.set(userId.toString(), socketId);
  }

  // Remove user connection
  removeConnection(userId) {
    this.activeConnections.delete(userId.toString());
  }

  // Get user's socket ID
  getSocketId(userId) {
    return this.activeConnections.get(userId.toString());
  }

  // Create or get conversation
  async getOrCreateConversation({ senderId, receiverId, productId }) {
    try {
      // Check if conversation exists
      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
        product: productId
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderId, receiverId],
          product: productId,
          lastMessage: null,
          lastMessageAt: new Date()
        });
      }

      return conversation;
    } catch (error) {
      console.error('Failed to get/create conversation:', error);
      throw new ApiError(500, 'Failed to create conversation');
    }
  }

  // Send message
  async sendMessage({ senderId, receiverId, conversationId, content, productId, attachments = [] }) {
    try {
      // Analyze message for scams
      const scamAnalysis = await scamDetectionService.analyzeChatMessage(content, {
        senderId,
        receiverId,
        productId
      });

      if (scamAnalysis.shouldBlock) {
        throw new ApiError(400, 'Message contains prohibited content', scamAnalysis.issues);
      }

      // Get or create conversation
      const conversation = conversationId 
        ? await Conversation.findById(conversationId)
        : await this.getOrCreateConversation({ senderId, receiverId, productId });

      if (!conversation) {
        throw new ApiError(404, 'Conversation not found');
      }

      // Create message
      const message = await Message.create({
        conversation: conversation._id,
        sender: senderId,
        receiver: receiverId,
        content: scamAnalysis.filteredMessage,
        originalContent: content,
        attachments,
        product: productId,
        isRead: false,
        isScamWarning: scamAnalysis.shouldWarn,
        scamIssues: scamAnalysis.issues
      });

      // Update conversation
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      await conversation.save();

      // Populate message details
      await message.populate([
        { path: 'sender', select: 'name avatar' },
        { path: 'receiver', select: 'name avatar' },
        { path: 'product', select: 'title images price' }
      ]);

      return {
        message,
        conversation,
        scamWarning: scamAnalysis.shouldWarn ? scamAnalysis.issues : null
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Get conversation messages
  async getMessages({ conversationId, userId, page = 1, limit = 50 }) {
    try {
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new ApiError(404, 'Conversation not found');
      }

      // Check if user is participant
      if (!conversation.participants.includes(userId)) {
        throw new ApiError(403, 'Unauthorized to view this conversation');
      }

      const messages = await Message.find({ conversation: conversationId })
        .populate('sender', 'name avatar')
        .populate('receiver', 'name avatar')
        .populate('product', 'title images price')
        .sort('-createdAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Mark messages as read
      await Message.updateMany(
        {
          conversation: conversationId,
          receiver: userId,
          isRead: false
        },
        { isRead: true, readAt: new Date() }
      );

      // Update conversation unread count
      if (conversation.unreadCount > 0) {
        conversation.unreadCount = 0;
        await conversation.save();
      }

      return {
        messages: messages.reverse(),
        page,
        totalPages: Math.ceil(await Message.countDocuments({ conversation: conversationId }) / limit)
      };
    } catch (error) {
      console.error('Failed to get messages:', error);
      throw error;
    }
  }

  // Get user conversations
  async getUserConversations({ userId, page = 1, limit = 20 }) {
    try {
      const conversations = await Conversation.find({
        participants: userId
      })
        .populate('participants', 'name avatar')
        .populate('product', 'title images price status')
        .populate('lastMessage')
        .sort('-lastMessageAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Get unread counts
      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv) => {
          const unreadCount = await Message.countDocuments({
            conversation: conv._id,
            receiver: userId,
            isRead: false
          });

          return {
            ...conv.toObject(),
            unreadCount
          };
        })
      );

      return {
        conversations: conversationsWithUnread,
        page,
        totalPages: Math.ceil(await Conversation.countDocuments({ participants: userId }) / limit)
      };
    } catch (error) {
      console.error('Failed to get conversations:', error);
      throw new ApiError(500, 'Failed to fetch conversations');
    }
  }

  // Mark conversation as read
  async markAsRead({ conversationId, userId }) {
    try {
      const result = await Message.updateMany(
        {
          conversation: conversationId,
          receiver: userId,
          isRead: false
        },
        {
          isRead: true,
          readAt: new Date()
        }
      );

      return { markedAsRead: result.modifiedCount };
    } catch (error) {
      console.error('Failed to mark as read:', error);
      throw new ApiError(500, 'Failed to mark messages as read');
    }
  }

  // Delete message
  async deleteMessage({ messageId, userId }) {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new ApiError(404, 'Message not found');
      }

      // Only sender can delete their message
      if (message.sender.toString() !== userId.toString()) {
        throw new ApiError(403, 'Unauthorized to delete this message');
      }

      // Soft delete
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = 'This message has been deleted';
      await message.save();

      return { success: true };
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }

  // Block user
  async blockUser({ blockerId, blockedId }) {
    try {
      const blocker = await User.findById(blockerId);
      
      if (!blocker.blockedUsers.includes(blockedId)) {
        blocker.blockedUsers.push(blockedId);
        await blocker.save();
      }

      // Update conversations
      await Conversation.updateMany(
        {
          participants: { $all: [blockerId, blockedId] }
        },
        {
          isBlocked: true,
          blockedBy: blockerId,
          blockedAt: new Date()
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to block user:', error);
      throw new ApiError(500, 'Failed to block user');
    }
  }

  // Unblock user
  async unblockUser({ blockerId, blockedId }) {
    try {
      const blocker = await User.findById(blockerId);
      
      blocker.blockedUsers = blocker.blockedUsers.filter(
        id => id.toString() !== blockedId.toString()
      );
      await blocker.save();

      // Update conversations
      await Conversation.updateMany(
        {
          participants: { $all: [blockerId, blockedId] },
          blockedBy: blockerId
        },
        {
          isBlocked: false,
          blockedBy: null,
          blockedAt: null
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to unblock user:', error);
      throw new ApiError(500, 'Failed to unblock user');
    }
  }

  // Report conversation
  async reportConversation({ conversationId, reporterId, reason, description }) {
    try {
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new ApiError(404, 'Conversation not found');
      }

      if (!conversation.participants.includes(reporterId)) {
        throw new ApiError(403, 'Unauthorized to report this conversation');
      }

      conversation.reports.push({
        reporter: reporterId,
        reason,
        description,
        reportedAt: new Date()
      });

      conversation.isReported = true;
      await conversation.save();

      // Notify admins
      // TODO: Send notification to admin

      return { success: true };
    } catch (error) {
      console.error('Failed to report conversation:', error);
      throw new ApiError(500, 'Failed to report conversation');
    }
  }

  // Get chat statistics
  async getChatStats({ userId }) {
    try {
      const [totalConversations, unreadMessages, blockedUsers] = await Promise.all([
        Conversation.countDocuments({ participants: userId }),
        Message.countDocuments({ receiver: userId, isRead: false }),
        User.findById(userId).select('blockedUsers').then(u => u?.blockedUsers.length || 0)
      ]);

      return {
        totalConversations,
        unreadMessages,
        blockedUsers
      };
    } catch (error) {
      console.error('Failed to get chat stats:', error);
      throw new ApiError(500, 'Failed to fetch chat statistics');
    }
  }

  // Search conversations
  async searchConversations({ userId, query, page = 1, limit = 20 }) {
    try {
      const searchRegex = new RegExp(query, 'i');

      // Find matching messages
      const messages = await Message.find({
        $or: [
          { sender: userId },
          { receiver: userId }
        ],
        content: searchRegex,
        isDeleted: { $ne: true }
      }).distinct('conversation');

      // Get conversations
      const conversations = await Conversation.find({
        _id: { $in: messages },
        participants: userId
      })
        .populate('participants', 'name avatar')
        .populate('product', 'title images price')
        .populate('lastMessage')
        .sort('-lastMessageAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

      return {
        conversations,
        page,
        totalPages: Math.ceil(messages.length / limit)
      };
    } catch (error) {
      console.error('Failed to search conversations:', error);
      throw new ApiError(500, 'Failed to search conversations');
    }
  }
}

// Create models if they don't exist
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  originalContent: String,
  attachments: [{
    type: { type: String, enum: ['image', 'document'] },
    url: String,
    name: String,
    size: Number
  }],
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  isScamWarning: { type: Boolean, default: false },
  scamIssues: [String]
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: Date,
  unreadCount: { type: Number, default: 0 },
  isBlocked: { type: Boolean, default: false },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  blockedAt: Date,
  isReported: { type: Boolean, default: false },
  reports: [{
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    description: String,
    reportedAt: Date
  }]
}, { timestamps: true });

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

export const chatService = new ChatService();
