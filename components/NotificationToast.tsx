import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { X, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Info } from 'lucide-react-native';

interface NotificationToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export default function NotificationToast({ 
  visible, 
  message, 
  type = 'info', 
  duration = 4000, 
  onClose 
}: NotificationToastProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'entrée
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-fermeture
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleClose = () => {
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
    ]).start(() => {
      onClose();
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} color="#4CAF50" />;
      case 'error':
        return <AlertCircle size={18} color="#F44336" />;
      default:
        return <Info size={18} color="#2196F3" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(76, 175, 80, 0.1)';
      case 'error':
        return 'rgba(244, 67, 54, 0.1)';
      default:
        return 'rgba(33, 150, 243, 0.1)';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(76, 175, 80, 0.3)';
      case 'error':
        return 'rgba(244, 67, 54, 0.3)';
      default:
        return 'rgba(33, 150, 243, 0.3)';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
      ]}
    >
      <View style={styles.content}>
        {getIcon()}
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <X size={16} color="#8B7D6B" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    // backdropFilter: 'blur(8px)', // Cette propriété est spécifique au web et non supportée nativement par React Native StyleSheet
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    marginLeft: 12,
    marginRight: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
});