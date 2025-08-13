const Message = require('../models/message.model');
const User = require('../models/user.model');
const { MESSAGE_TYPES } = require('../utils/constants');

class ChatHandler {
  constructor(io) {
    this.io = io;
    this.onlineUsers = new Map();
  }

  handleConnection(socket) {
    console.log(`User ${socket.userId} connected to chat`);

    // Register user as online
    this.onlineUsers.set(socket.userId, socket.id);
    
    // Notify others that user is online
    socket.broadcast.emit('user_online', {
      userId: socket.userId,
      timestamp: new Date()
    });

    // Get online status of users
    socket.on('get_online_users', () => {
      const onlineUserIds = Array.from(this.onlineUsers.keys());
      socket.emit('online_users', onlineUserIds);
    });

    // Join conversation room
    socket.on('join_conversation', async ({ recipientId }) => {
      try {
        const roomName = this.getConversationRoom(socket.userId, recipientId);
        socket.join(roomName);
        
        // Load conversation history
        const messages = await Message.find({
          $or: [
            { sender: socket.userId, recipient: recipientId },
            { sender: recipientId, recipient: socket.userId }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('sender', 'firstName lastName avatar')
        .populate('recipient', 'firstName lastName avatar');

        socket.emit('conversation_history', messages.reverse());
        
        // Mark messages as read
        await Message.updateMany(
          {
            sender: recipientId,
            recipient: socket.userId,
            isRead: false
          },
          { isRead: true, readAt: new Date() }
        );
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Send message
    socket.on('send_message', async ({ recipientId, content, type = MESSAGE_TYPES.TEXT, productId = null }) => {
      try {
        // Validate recipient
        const recipient = await User.findById(recipientId);
        if (!recipient) {
          socket.emit('message_error', { message: 'Recipient not found' });
          return;
        }

        // Create message
        const message = await Message.create({
          sender: socket.userId,
          recipient: recipientId,
          content,
          type,
          product: productId,
          isRead: false
        });

        // Populate sender info
        await message.populate('sender', 'firstName lastName avatar');
        await message.populate('recipient', 'firstName lastName avatar');
        if (productId) {
          await message.populate('product', 'title images price');
        }

        // Send to sender
        socket.emit('message_sent', message);

        // Send to recipient if online
        const roomName = this.getConversationRoom(socket.userId, recipientId);
        socket.to(roomName).emit('new_message', message);

        // Send push notification if recipient is offline
        if (!this.onlineUsers.has(recipientId)) {
          // Trigger push notification service
          this.sendPushNotification(recipientId, {
            title: `New message from ${message.sender.firstName}`,
            body: content.substring(0, 100),
            data: { conversationId: message._id }
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    // Mark message as read
    socket.on('mark_read', async ({ messageId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          isRead: true,
          readAt: new Date()
        });

        socket.emit('message_read', { messageId });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ recipientId }) => {
      const roomName = this.getConversationRoom(socket.userId, recipientId);
      socket.to(roomName).emit('user_typing', {
        userId: socket.userId,
        isTyping: true
      });
    });

    socket.on('typing_stop', ({ recipientId }) => {
      const roomName = this.getConversationRoom(socket.userId, recipientId);
      socket.to(roomName).emit('user_typing', {
        userId: socket.userId,
        isTyping: false
      });
    });

    // Delete message
    socket.on('delete_message', async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        
        if (!message || message.sender.toString() !== socket.userId) {
          socket.emit('error', { message: 'Cannot delete this message' });
          return;
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();

        const roomName = this.getConversationRoom(message.sender, message.recipient);
        this.io.to(roomName).emit('message_deleted', { messageId });
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Get unread count
    socket.on('get_unread_count', async () => {
      try {
        const unreadCount = await Message.countDocuments({
          recipient: socket.userId,
          isRead: false,
          isDeleted: false
        });

        socket.emit('unread_count', { count: unreadCount });
      } catch (error) {
        console.error('Error getting unread count:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected from chat`);
      
      // Remove from online users
      this.onlineUsers.delete(socket.userId);
      
      // Notify others
      socket.broadcast.emit('user_offline', {
        userId: socket.userId,
        timestamp: new Date()
      });
    });
  }

  // Helper to get consistent room name
  getConversationRoom(userId1, userId2) {
    const sortedIds = [userId1, userId2].sort();
    return `conversation_${sortedIds[0]}_${sortedIds[1]}`;
  }

  // Send push notification (placeholder - implement with actual service)
  async sendPushNotification(userId, notification) {
    console.log(`Sending push notification to ${userId}:`, notification);
    // Implement with FCM, OneSignal, or other push service
  }
}

module.exports = ChatHandler;
