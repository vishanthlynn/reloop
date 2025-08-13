import { chatService } from '../services/chat.service.js';
import { authenticateSocket } from '../api/middlewares/auth.middleware.js';

export const initializeChatSocket = (io) => {
  const chatNamespace = io.of('/chat');

  // Authentication middleware
  chatNamespace.use(async (socket, next) => {
    try {
      const user = await authenticateSocket(socket);
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  chatNamespace.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected to chat`);

    // Register user connection
    chatService.registerConnection(socket.userId, socket.id);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join conversation rooms
    socket.on('join:conversation', async (data) => {
      try {
        const { conversationId } = data;
        
        // Verify user is participant
        const conversation = await chatService.getConversation(conversationId, socket.userId);
        if (conversation) {
          socket.join(`conversation:${conversationId}`);
          socket.emit('joined:conversation', { conversationId });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Leave conversation room
    socket.on('leave:conversation', (data) => {
      const { conversationId } = data;
      socket.leave(`conversation:${conversationId}`);
      socket.emit('left:conversation', { conversationId });
    });

    // Send message
    socket.on('send:message', async (data) => {
      try {
        const { receiverId, conversationId, content, productId, attachments } = data;
        
        // Send message through service
        const result = await chatService.sendMessage({
          senderId: socket.userId,
          receiverId,
          conversationId,
          content,
          productId,
          attachments
        });

        // Emit to sender
        socket.emit('message:sent', result.message);

        // Emit to conversation room
        if (result.conversation) {
          socket.to(`conversation:${result.conversation._id}`).emit('message:received', result.message);
        }

        // Emit to receiver's personal room
        socket.to(`user:${receiverId}`).emit('message:notification', {
          message: result.message,
          conversation: result.conversation
        });

        // Send scam warning if detected
        if (result.scamWarning) {
          socket.emit('scam:warning', {
            messageId: result.message._id,
            issues: result.scamWarning
          });
        }
      } catch (error) {
        socket.emit('message:error', { 
          message: error.message || 'Failed to send message',
          issues: error.data
        });
      }
    });

    // Typing indicators
    socket.on('typing:start', (data) => {
      const { conversationId, receiverId } = data;
      
      // Emit to conversation room
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        userId: socket.userId,
        userName: socket.user.name,
        conversationId
      });
      
      // Emit to receiver
      socket.to(`user:${receiverId}`).emit('user:typing', {
        userId: socket.userId,
        userName: socket.user.name,
        conversationId
      });
    });

    socket.on('typing:stop', (data) => {
      const { conversationId, receiverId } = data;
      
      socket.to(`conversation:${conversationId}`).emit('user:stopped_typing', {
        userId: socket.userId,
        conversationId
      });
      
      socket.to(`user:${receiverId}`).emit('user:stopped_typing', {
        userId: socket.userId,
        conversationId
      });
    });

    // Mark messages as read
    socket.on('mark:read', async (data) => {
      try {
        const { conversationId } = data;
        
        const result = await chatService.markAsRead({
          conversationId,
          userId: socket.userId
        });

        socket.emit('marked:read', { conversationId, ...result });
        
        // Notify sender that messages were read
        socket.to(`conversation:${conversationId}`).emit('messages:read', {
          conversationId,
          readBy: socket.userId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark as read' });
      }
    });

    // Delete message
    socket.on('delete:message', async (data) => {
      try {
        const { messageId, conversationId } = data;
        
        await chatService.deleteMessage({
          messageId,
          userId: socket.userId
        });

        // Notify all participants
        chatNamespace.to(`conversation:${conversationId}`).emit('message:deleted', {
          messageId,
          conversationId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Block/unblock user
    socket.on('block:user', async (data) => {
      try {
        const { blockedId } = data;
        
        await chatService.blockUser({
          blockerId: socket.userId,
          blockedId
        });

        socket.emit('user:blocked', { blockedId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to block user' });
      }
    });

    socket.on('unblock:user', async (data) => {
      try {
        const { blockedId } = data;
        
        await chatService.unblockUser({
          blockerId: socket.userId,
          blockedId
        });

        socket.emit('user:unblocked', { blockedId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to unblock user' });
      }
    });

    // Get online status
    socket.on('check:online', (data) => {
      const { userIds } = data;
      const onlineStatus = {};
      
      userIds.forEach(userId => {
        onlineStatus[userId] = chatService.getSocketId(userId) !== undefined;
      });
      
      socket.emit('online:status', onlineStatus);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected from chat`);
      
      // Remove connection
      chatService.removeConnection(socket.userId);
      
      // Notify contacts that user is offline
      socket.broadcast.emit('user:offline', { userId: socket.userId });
    });
  });

  return chatNamespace;
};
