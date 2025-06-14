import { useState, useCallback } from 'react';
import type { NotificationData, NotificationType } from '@/components/NotificationSystem';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      duration?: number;
      action?: {
        label: string;
        onPress: () => void;
      };
    }
  ) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const notification: NotificationData = {
      id,
      type,
      title,
      message,
      duration: options?.duration,
      action: options?.action,
    };

    setNotifications(prev => [...prev, notification]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Méthodes de convenance
  const showSuccess = useCallback((title: string, message: string, options?: { duration?: number }) => {
    return addNotification('success', title, message, options);
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, options?: { duration?: number }) => {
    return addNotification('error', title, message, options);
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, options?: { duration?: number }) => {
    return addNotification('info', title, message, options);
  }, [addNotification]);

  const showMagic = useCallback((title: string, message: string, options?: { duration?: number }) => {
    return addNotification('magic', title, message, options);
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showInfo,
    showMagic,
  };
}