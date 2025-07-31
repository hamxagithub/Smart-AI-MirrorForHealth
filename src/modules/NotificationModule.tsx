/**
 * Notification Module
 * Handles push notifications, reminders, and alerts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';

import PushNotification from 'react-native-push-notification';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card } from 'react-native-paper';
import { NotificationService } from '../services/NotificationService';

const { width } = Dimensions.get('window');

interface NotificationModuleProps {}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'medication' | 'health' | 'wellness' | 'emergency' | 'appointment';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  actions?: NotificationAction[];
  isRead: boolean;
}

interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary';
  callback: () => void;
}

const NotificationModule: React.FC<NotificationModuleProps> = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const [slideAnim] = useState(new Animated.Value(-width));

  useEffect(() => {
    initializeNotifications();
    loadPendingNotifications();
    
    const interval = setInterval(checkScheduledNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeNotification) {
      showNotification();
    } else {
      hideNotification();
    }
  }, [activeNotification]);

  const initializeNotifications = () => {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('FCM Token:', token);
      },
      onNotification: function (notification) {
        console.log('Notification received:', notification);
        handleIncomingNotification(notification);
      },
      onAction: function (notification) {
        console.log('Notification action:', notification.action);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    PushNotification.createChannel(
      {
        channelId: 'medication',
        channelName: 'Medication Reminders',
        channelDescription: 'Notifications for medication schedules',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Medication channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'health',
        channelName: 'Health Monitoring',
        channelDescription: 'Health check-ins and vital signs',
        soundName: 'default',
        importance: 3,
        vibrate: true,
      },
      (created) => console.log(`Health channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'wellness',
        channelName: 'Wellness Tips',
        channelDescription: 'Mental health and wellness advice',
        soundName: 'default',
        importance: 2,
        vibrate: false,
      },
      (created) => console.log(`Wellness channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'emergency',
        channelName: 'Emergency Alerts',
        channelDescription: 'Critical health alerts',
        soundName: 'default',
        importance: 4, // HIGH
        vibrate: true,
      },
      (created) => console.log(`Emergency channel created: ${created}`)
    );
  };

  const loadPendingNotifications = async () => {
    try {
      const pending = await NotificationService.getPendingNotifications();
      // Map ScheduledNotification[] to Notification[]
      const mappedPending: Notification[] = pending.map((notif: any) => ({
        id: notif.id,
        title: notif.title,
        message: notif.message,
        type: notif.type || 'wellness',
        priority: notif.priority || 'medium',
        timestamp: notif.timestamp ? new Date(notif.timestamp) : new Date(),
        actions: notif.actions,
        isRead: notif.isRead ?? false,
      }));
      setNotifications(mappedPending);
    } catch (error) {
      console.error('Error loading pending notifications:', error);
    }
  };

  const checkScheduledNotifications = async () => {
    try {
      const scheduled = await NotificationService.getScheduledNotifications();
      const now = new Date();
      
      for (const notification of scheduled) {
        if (notification.timestamp <= now && notification.isActive) {
          // Transform ScheduledNotification to Notification
          const transformedNotification: Notification = {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            priority: notification.priority,
            timestamp: notification.timestamp,
            isRead: false,
          };
          showInAppNotification(transformedNotification);
        }
      }
    } catch (error) {
      console.error('Error checking scheduled notifications:', error);
    }
  };

  const handleIncomingNotification = (notification: any) => {
    const mappedNotification: Notification = {
      id: notification.id || Date.now().toString(),
      title: notification.title || 'Health Notification',
      message: notification.message || notification.body || '',
      type: notification.data?.type || 'wellness',
      priority: notification.data?.priority || 'medium',
      timestamp: new Date(),
      isRead: false,
    };

    showInAppNotification(mappedNotification);
  };

  const showInAppNotification = (notification: Notification) => {
    // Add to notifications list
    setNotifications(prev => [notification, ...prev]);
    
    // Show as active notification if high priority
    if (notification.priority === 'high' || notification.priority === 'critical') {
      setActiveNotification(notification);
      
      // Auto-hide after delay unless it's critical
      if (notification.priority !== 'critical') {
        setTimeout(() => {
          setActiveNotification(null);
        }, 10000);
      }
    }
  };

  const showNotification = () => {
    Animated.timing(slideAnim, {
      toValue: 20,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const dismissNotification = () => {
    if (activeNotification) {
      markAsRead(activeNotification.id);
      setActiveNotification(null);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'medication':
        return 'medication';
      case 'health':
        return 'favorite';
      case 'wellness':
        return 'psychology';
      case 'emergency':
        return 'warning';
      case 'appointment':
        return 'event';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EA580C';
      case 'medium':
        return '#2563EB';
      case 'low':
        return '#059669';
      default:
        return '#6B7280';
    }
  };

  const scheduleNotification = (notification: Omit<Notification, 'id' | 'isRead'>) => {
    const id = Date.now().toString();
    
    PushNotification.localNotificationSchedule({
      id: id,
      title: notification.title,
      message: notification.message,
      date: notification.timestamp,
      soundName: 'default',
      vibrate: true,
      vibration: 300,
      channelId: notification.type,
      userInfo: {
        type: notification.type,
        priority: notification.priority,
      },
    });
  };

  const getUnreadCount = (): number => {
    return notifications.filter(n => !n.isRead).length;
  };

  return (
    <>
      {/* Notification Badge */}
      {getUnreadCount() > 0 && (
        <View style={styles.badgeContainer}>
          <Icon name="notifications" size={24} color="#FFFFFF" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getUnreadCount()}</Text>
          </View>
        </View>
      )}

      {/* Active Notification */}
      {activeNotification && (
        <Animated.View
          style={[
            styles.notificationContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <Animatable.View
            animation="slideInLeft"
            duration={500}
            style={[
              styles.notification,
              { borderLeftColor: getNotificationColor(activeNotification.priority) },
            ]}
          >
            <Card style={styles.notificationCard}>
              <Card.Content style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Icon
                    name={getNotificationIcon(activeNotification.type)}
                    size={24}
                    color={getNotificationColor(activeNotification.priority)}
                  />
                  <Text style={styles.notificationTitle}>
                    {activeNotification.title}
                  </Text>
                  <TouchableOpacity
                    onPress={dismissNotification}
                    style={styles.dismissButton}
                  >
                    <Icon name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.notificationMessage}>
                  {activeNotification.message}
                </Text>
                
                {activeNotification.actions && (
                  <View style={styles.actionsContainer}>
                    {activeNotification.actions.map((action) => (
                      <TouchableOpacity
                        key={action.id}
                        style={[
                          styles.actionButton,
                          action.type === 'primary' ? styles.primaryAction : styles.secondaryAction,
                        ]}
                        onPress={() => {
                          action.callback();
                          dismissNotification();
                        }}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            action.type === 'primary' ? styles.primaryActionText : styles.secondaryActionText,
                          ]}
                        >
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Card.Content>
            </Card>
          </Animatable.View>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 15,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 20,
    zIndex: 30,
  },
  notification: {
    borderLeftWidth: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  notificationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    elevation: 8,
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginLeft: 8,
  },
  dismissButton: {
    padding: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  primaryAction: {
    backgroundColor: '#2563EB',
  },
  secondaryAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryActionText: {
    color: '#FFFFFF',
  },
  secondaryActionText: {
    color: '#4B5563',
  },
});

export default NotificationModule;
