/**
 * Notification Service
 * Handles local and push notifications for health reminders and alerts
 */

import PushNotification from 'react-native-push-notification';
import { StorageService } from './StorageService';

interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  type: 'medication' | 'health' | 'wellness' | 'emergency' | 'appointment';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledTime: Date;
  repeatType?: 'day' | 'week' | 'hour' | 'minute' | 'time';
  isActive: boolean;
}

export class NotificationService {
  static async initialize(): Promise<void> {
    // This is handled in the NotificationModule component
    // Just ensure we have the necessary permissions
  }

  static async scheduleNotification(notification: Omit<ScheduledNotification, 'id'>): Promise<string> {
    try {
      const id = Date.now().toString();
      const fullNotification: ScheduledNotification = {
        ...notification,
        id,
      };

      // Schedule the actual push notification
      PushNotification.localNotificationSchedule({
        id: id,
        title: notification.title,
        message: notification.message,
        date: notification.scheduledTime,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        channelId: notification.type,
        repeatType: notification.repeatType,
        userInfo: {
          type: notification.type,
          priority: notification.priority,
          notificationId: id,
        },
      });

      // Store in local storage for management
      await this.storeScheduledNotification(fullNotification);

      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      PushNotification.cancelLocalNotification(notificationId);
      await this.removeScheduledNotification(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
      throw error;
    }
  }

  static async getPendingNotifications(): Promise<ScheduledNotification[]> {
    try {
      const stored = await StorageService.getItem<ScheduledNotification[]>('scheduled_notifications');
      return stored || [];
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  static async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const notifications = await this.getPendingNotifications();
      const now = new Date();
      
      return notifications.filter(notification => 
        notification.isActive && notification.scheduledTime <= now
      );
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getPendingNotifications();
      const updatedNotifications = notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, isActive: false }
          : notification
      );
      
      await StorageService.setItem('scheduled_notifications', updatedNotifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  private static async storeScheduledNotification(notification: ScheduledNotification): Promise<void> {
    try {
      const notifications = await this.getPendingNotifications();
      notifications.push(notification);
      await StorageService.setItem('scheduled_notifications', notifications);
    } catch (error) {
      console.error('Error storing scheduled notification:', error);
      throw error;
    }
  }

  private static async removeScheduledNotification(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getPendingNotifications();
      const filtered = notifications.filter(n => n.id !== notificationId);
      await StorageService.setItem('scheduled_notifications', filtered);
    } catch (error) {
      console.error('Error removing scheduled notification:', error);
      throw error;
    }
  }

  // Predefined notification templates
  static async scheduleMedicationReminder(
    medicationName: string,
    dosage: string,
    time: Date,
    repeatDaily = true
  ): Promise<string> {
    return this.scheduleNotification({
      title: 'Medication Reminder',
      message: `Time to take ${medicationName} (${dosage})`,
      type: 'medication',
      priority: 'high',
      scheduledTime: time,
      repeatType: repeatDaily ? 'day' : undefined,
      isActive: true,
    });
  }

  static async scheduleHealthCheckReminder(time: Date): Promise<string> {
    return this.scheduleNotification({
      title: 'Daily Health Check',
      message: 'Time for your daily wellness check-in',
      type: 'health',
      priority: 'medium',
      scheduledTime: time,
      repeatType: 'day',
      isActive: true,
    });
  }

  static async scheduleWellnessReminder(message: string, time: Date): Promise<string> {
    return this.scheduleNotification({
      title: 'Wellness Reminder',
      message: message,
      type: 'wellness',
      priority: 'low',
      scheduledTime: time,
      repeatType: 'day',
      isActive: true,
    });
  }

  static async scheduleAppointmentReminder(
    appointmentDetails: string,
    time: Date,
    advanceMinutes = 30
  ): Promise<string> {
    const reminderTime = new Date(time.getTime() - (advanceMinutes * 60 * 1000));
    
    return this.scheduleNotification({
      title: 'Appointment Reminder',
      message: `You have ${appointmentDetails} in ${advanceMinutes} minutes`,
      type: 'appointment',
      priority: 'high',
      scheduledTime: reminderTime,
      repeatType: undefined,
      isActive: true,
    });
  }

  static async sendEmergencyAlert(message: string): Promise<void> {
    try {
      PushNotification.localNotification({
        title: 'EMERGENCY ALERT',
        message: message,
        channelId: 'emergency',
        priority: 'max',
        importance: 'max',
        vibrate: true,
        vibration: 1000,
        ongoing: true,
        actions: ['Call Emergency Services', 'Contact Caregiver'],
      });
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      throw error;
    }
  }

  static async clearAllNotifications(): Promise<void> {
    try {
      PushNotification.cancelAllLocalNotifications();
      await StorageService.setItem('scheduled_notifications', []);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  // Additional helper methods for other services
  static async sendCaregiverAlert(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'critical',
    data?: any
  ): Promise<void> {
    try {
      PushNotification.localNotification({
        title: title,
        message: message,
        channelId: 'emergency',
        priority: priority === 'critical' ? 'max' : 'high',
        importance: priority === 'critical' ? 'max' : 'high',
        vibrate: true,
        vibration: priority === 'critical' ? 1000 : 300,
        userInfo: data,
      });
    } catch (error) {
      console.error('Error sending caregiver alert:', error);
      throw error;
    }
  }

  static async sendLocalNotification(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'critical',
    data?: any
  ): Promise<void> {
    try {
      PushNotification.localNotification({
        title: title,
        message: message,
        channelId: 'general',
        priority: priority === 'critical' ? 'max' : priority === 'high' ? 'high' : 'default',
        vibrate: true,
        vibration: 300,
        userInfo: data,
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
      throw error;
    }
  }

  static async getNotificationHistory(): Promise<any[]> {
    try {
      return await StorageService.getItem('notification_history') || [];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  static async addToNotificationHistory(notification: any): Promise<void> {
    try {
      const history = await this.getNotificationHistory();
      history.push({
        ...notification,
        timestamp: new Date(),
      });
      
      // Keep only last 100 notifications
      const trimmedHistory = history.slice(-100);
      
      await StorageService.setItem('notification_history', trimmedHistory);
    } catch (error) {
      console.error('Error adding to notification history:', error);
    }
  }
}
