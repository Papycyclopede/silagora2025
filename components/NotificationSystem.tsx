import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { CircleCheck as CheckCircle, CircleAlert as AlertCircle, Info, X, Sparkles } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export type NotificationType = 'success' | 'error' | 'info' | 'magic';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface NotificationItemProps {
  notification: NotificationData;
  onDismiss: (id: string) => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    // Auto-dismiss
    if (notification.duration !== 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration || 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle size={20} color="#4CAF50" />;
      case 'error':
        return <AlertCircle size={20} color="#F44336" />;
      case 'magic':
        return <Sparkles size={20} color="#8B7355" />;
      default:
        return <Info size={20} color="#2196F3" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'rgba(76, 175, 80, 0.95)';
      case 'error':
        return 'rgba(244, 67, 54, 0.95)';
      case 'magic':
        return 'rgba(139, 115, 85, 0.95)';
      default:
        return 'rgba(33, 150, 243, 0.95)';
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return 'rgba(76, 175, 80, 0.8)';
      case 'error':
        return 'rgba(244, 67, 54, 0.8)';
      case 'magic':
        return 'rgba(139, 115, 85, 0.8)';
      default:
        return 'rgba(33, 150, 243, 0.8)';
    }
  };

  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
      ]}
    >
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          
          {notification.action && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={notification.action.onPress}
            >
              <Text style={styles.actionButtonText}>{notification.action.label}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <X size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

interface NotificationSystemProps {
  notifications: NotificationData[];
  onDismiss: (id: string) => void;
}

export default function NotificationSystem({ notifications, onDismiss }: NotificationSystemProps) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  notificationContainer: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontFamily: 'Georgia',
    color: '#FFFFFF',
    marginBottom: 4,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#FFFFFF',
    lineHeight: 18,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#FFFFFF',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    marginLeft: 8,
  },
});