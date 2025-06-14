import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useAudio } from '@/contexts/AudioContext';

const { width, height } = Dimensions.get('window');

interface SpatialAudioVisualizerProps {
  isVisible: boolean;
  intensity?: number;
}

export default function SpatialAudioVisualizer({ 
  isVisible, 
  intensity = 0.5 
}: SpatialAudioVisualizerProps) {
  const { settings, isPlaying } = useAudio();
  
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible && isPlaying && settings.enabled) {
      // Animation d'apparition
      Animated.timing(opacity, {
        toValue: 0.3,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Animations des ondes
      const createWaveAnimation = (animValue: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );

      const animations = [
        createWaveAnimation(wave1, 0),
        createWaveAnimation(wave2, 1000),
        createWaveAnimation(wave3, 2000),
      ];

      animations.forEach(anim => anim.start());

      return () => {
        animations.forEach(anim => anim.stop());
      };
    } else {
      // Animation de disparition
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, isPlaying, settings.enabled]);

  const createWaveStyle = (animValue: Animated.Value, baseSize: number) => ({
    position: 'absolute' as const,
    width: baseSize,
    height: baseSize,
    borderRadius: baseSize / 2,
    borderWidth: 1,
    borderColor: getThemeColor(),
    transform: [
      {
        scale: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 3],
        }),
      },
    ],
    opacity: animValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8 * intensity, 0.4 * intensity, 0],
    }),
  });

  const getThemeColor = () => {
    switch (settings.theme) {
      case 'breeze':
        return 'rgba(168, 200, 225, 0.6)';
      case 'ink':
        return 'rgba(139, 125, 107, 0.6)';
      case 'night':
        return 'rgba(75, 85, 99, 0.6)';
      case 'urban':
        return 'rgba(156, 163, 175, 0.6)';
      case 'forest':
        return 'rgba(34, 197, 94, 0.6)';
      case 'ocean':
        return 'rgba(59, 130, 246, 0.6)';
      default:
        return 'rgba(168, 200, 225, 0.6)';
    }
  };

  if (!settings.enabled || !isVisible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <View style={styles.center}>
        <Animated.View style={createWaveStyle(wave1, 60)} />
        <Animated.View style={createWaveStyle(wave2, 80)} />
        <Animated.View style={createWaveStyle(wave3, 100)} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});