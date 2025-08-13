import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

class NotificationService {
  constructor() {
    // Email configuration
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // SMS configuration (Twilio)
    this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // WebSocket connections for real-time notifications
    this.socketConnections = new Map();
  }

  // Register socket connection
  registerSocketConnection(userId, socket) {
    this.socketConnections.set(userId.toString(), socket);
  }

  // Remove socket connection
  removeSocketConnection(userId) {
    this.socketConnections.delete(userId.toString());
  }

  // Create and send notification
  async sendNotification({ userId, type, title, message, data = {}, channels = ['in_app'] }) {
    try {
      const user = await User.findById(userId).select('email phone notificationPreferences');
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Create in-app notification
      const notification = await Notification.create({
        user: userId,
        type,
        title,
        message,
        data,
        isRead: false
      });

      // Send through requested channels
      const results = {};

      if (channels.includes('in_app')) {
        results.in_app = await this.sendInAppNotification(userId, notification);
      }

      if (channels.includes('email') && user.notificationPreferences?.email !== false) {
        results.email = await this.sendEmailNotification(user.email, { type, title, message, data });
      }

      if (channels.includes('sms') && user.notificationPreferences?.sms !== false && user.phone) {
        results.sms = await this.sendSMSNotification(user.phone, { title, message });
      }

      if (channels.includes('push') && user.notificationPreferences?.push !== false) {
        results.push = await this.sendPushNotification(userId, { title, message, data });
      }

      return {
        notificationId: notification._id,
        channels: results,
        success: true
      };
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  // Send in-app notification via WebSocket
  async sendInAppNotification(userId, notification) {
    try {
      const socket = this.socketConnections.get(userId.toString());
      
      if (socket) {
        socket.emit('notification:new', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt
        });
        return { sent: true, realtime: true };
      }
      
      return { sent: true, realtime: false };
    } catch (error) {
      console.error('Failed to send in-app notification:', error);
      return { sent: false, error: error.message };
    }
  }

  // Send email notification
  async sendEmailNotification(email, { type, title, message, data }) {
    try {
      if (!this.emailTransporter) {
        console.log('Email service not configured');
        return { sent: false, reason: 'Email service not configured' };
      }

      const emailTemplate = this.getEmailTemplate(type, { title, message, data });
      
      const info = await this.emailTransporter.sendMail({
        from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: title,
        html: emailTemplate
      });

      return { sent: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { sent: false, error: error.message };
    }
  }

  // Send SMS notification
  async sendSMSNotification(phone, { title, message }) {
    try {
      if (!this.twilioClient) {
        console.log('SMS service not configured');
        return { sent: false, reason: 'SMS service not configured' };
      }

      const smsMessage = await this.twilioClient.messages.create({
        body: `${title}: ${message}`,
        from: this.twilioPhoneNumber,
        to: phone
      });

      return { sent: true, messageId: smsMessage.sid };
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return { sent: false, error: error.message };
    }
  }

  // Send push notification
  async sendPushNotification(userId, { title, message, data }) {
    try {
      // Get user's FCM tokens
      const user = await User.findById(userId).select('fcmTokens');
      
      if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        return { sent: false, reason: 'No FCM tokens found' };
      }

      // In production, integrate with Firebase Cloud Messaging
      // For now, simulate the process
      console.log('Push notification would be sent:', { userId, title, message });
      
      return { sent: true, tokens: user.fcmTokens.length };
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return { sent: false, error: error.message };
    }
  }

  // Get user notifications
  async getUserNotifications({ userId, page = 1, limit = 20, type, isRead }) {
    try {
      const query = { user: userId };
      
      if (type) {
        query.type = type;
      }
      
      if (isRead !== undefined) {
        query.isRead = isRead;
      }

      const notifications = await Notification.find(query)
        .sort('-createdAt')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('data.product', 'title images')
        .populate('data.order', 'orderNumber status')
        .populate('data.sender', 'name avatar');

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        page,
        totalPages: Math.ceil(total / limit),
        total,
        unreadCount: await Notification.countDocuments({ user: userId, isRead: false })
      };
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw new ApiError(500, 'Failed to fetch notifications');
    }
  }

  // Mark notification as read
  async markAsRead({ notificationId, userId }) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        throw new ApiError(404, 'Notification not found');
      }

      return notification;
    } catch (error) {
      console.error('Failed to mark as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return { markedAsRead: result.modifiedCount };
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw new ApiError(500, 'Failed to mark notifications as read');
    }
  }

  // Delete notification
  async deleteNotification({ notificationId, userId }) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        user: userId
      });

      if (!notification) {
        throw new ApiError(404, 'Notification not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  // Clear all notifications
  async clearAllNotifications(userId) {
    try {
      const result = await Notification.deleteMany({ user: userId });
      return { deleted: result.deletedCount };
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      throw new ApiError(500, 'Failed to clear notifications');
    }
  }

  // Update notification preferences
  async updatePreferences({ userId, preferences }) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { notificationPreferences: preferences },
        { new: true }
      ).select('notificationPreferences');

      return user.notificationPreferences;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw new ApiError(500, 'Failed to update notification preferences');
    }
  }

  // Send bulk notifications
  async sendBulkNotifications({ userIds, type, title, message, data, channels }) {
    const results = await Promise.allSettled(
      userIds.map(userId => 
        this.sendNotification({ userId, type, title, message, data, channels })
      )
    );

    return {
      total: results.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results.map((r, i) => ({
        userId: userIds[i],
        status: r.status,
        result: r.status === 'fulfilled' ? r.value : r.reason
      }))
    };
  }

  // Notification templates
  getEmailTemplate(type, { title, message, data }) {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { text-align: center; padding: 10px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${process.env.APP_NAME}</h1>
            </div>
            <div class="content">
              <h2>${title}</h2>
              <p>${message}</p>
              ${this.getTypeSpecificContent(type, data)}
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
              <p>You received this email because you have an account on our platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return baseTemplate;
  }

  getTypeSpecificContent(type, data) {
    switch (type) {
      case 'order_placed':
        return `
          <p>Order Number: <strong>${data.orderNumber}</strong></p>
          <p>Total Amount: <strong>₹${data.amount}</strong></p>
          <a href="${process.env.APP_URL}/orders/${data.orderId}" class="button">View Order</a>
        `;
      
      case 'payment_received':
        return `
          <p>Amount: <strong>₹${data.amount}</strong></p>
          <p>Transaction ID: <strong>${data.transactionId}</strong></p>
        `;
      
      case 'new_message':
        return `
          <p>From: <strong>${data.senderName}</strong></p>
          <a href="${process.env.APP_URL}/messages/${data.conversationId}" class="button">View Message</a>
        `;
      
      default:
        return '';
    }
  }

  // Notification types
  static TYPES = {
    ORDER_PLACED: 'order_placed',
    ORDER_SHIPPED: 'order_shipped',
    ORDER_DELIVERED: 'order_delivered',
    ORDER_CANCELLED: 'order_cancelled',
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_FAILED: 'payment_failed',
    NEW_MESSAGE: 'new_message',
    NEW_REVIEW: 'new_review',
    PRODUCT_SOLD: 'product_sold',
    BID_PLACED: 'bid_placed',
    BID_WON: 'bid_won',
    BID_OUTBID: 'bid_outbid',
    AUCTION_ENDING: 'auction_ending',
    AUCTION_ENDED: 'auction_ended',
    KYC_VERIFIED: 'kyc_verified',
    KYC_REJECTED: 'kyc_rejected',
    DISPUTE_OPENED: 'dispute_opened',
    DISPUTE_RESOLVED: 'dispute_resolved',
    ACCOUNT_VERIFIED: 'account_verified',
    PRICE_DROP: 'price_drop',
    NEW_FOLLOWER: 'new_follower',
    PRODUCT_LIKED: 'product_liked'
  };
}

// Create Notification model if it doesn't exist
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  expiresAt: { type: Date, default: () => new Date(+new Date() + 30*24*60*60*1000) } // 30 days
}, { timestamps: true });

// Auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export const notificationService = new NotificationService();
