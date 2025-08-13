import PushNotification from 'react-native-push-notification';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    this.configure();
  }

  configure() {
    if (Platform.OS === 'android') {
      this.createDefaultChannels();
    }

    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
        // Send token to server
      },

      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
        // Handle notification
      },

      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
      },

      onRegistrationError: function(err) {
        console.error(err.message, err);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: true,
    });
  }

  async createDefaultChannels() {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });

    await notifee.createChannel({
      id: 'messages',
      name: 'Messages',
      importance: AndroidImportance.HIGH,
    });

    await notifee.createChannel({
      id: 'orders',
      name: 'Orders',
      importance: AndroidImportance.DEFAULT,
    });

    await notifee.createChannel({
      id: 'auctions',
      name: 'Auctions',
      importance: AndroidImportance.HIGH,
    });
  }

  async requestPermission() {
    const settings = await notifee.requestPermission();
    return settings;
  }

  async displayNotification(title, body, data = {}, channelId = 'default') {
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId,
        smallIcon: 'ic_notification',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    });
  }

  async displayMessageNotification(senderName, message, conversationId) {
    await this.displayNotification(
      senderName,
      message,
      { conversationId, type: 'message' },
      'messages'
    );
  }

  async displayOrderNotification(title, body, orderId) {
    await this.displayNotification(
      title,
      body,
      { orderId, type: 'order' },
      'orders'
    );
  }

  async displayAuctionNotification(title, body, productId) {
    await this.displayNotification(
      title,
      body,
      { productId, type: 'auction' },
      'auctions'
    );
  }

  async cancelNotification(notificationId) {
    await notifee.cancelNotification(notificationId);
  }

  async cancelAllNotifications() {
    await notifee.cancelAllNotifications();
  }

  async getBadgeCount() {
    return notifee.getBadgeCount();
  }

  async setBadgeCount(count) {
    await notifee.setBadgeCount(count);
  }

  async incrementBadgeCount() {
    await notifee.incrementBadgeCount();
  }

  async decrementBadgeCount() {
    await notifee.decrementBadgeCount();
  }
}

export const notificationService = new NotificationService();

export const setupNotifications = async () => {
  const service = new NotificationService();
  await service.requestPermission();
  return service;
};
