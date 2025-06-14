import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { useAudio } from '@/contexts/AudioContext';

const { width, height } = Dimensions.get('window');

interface SouffleRevealAnimationProps {
  visible: boolean;
  onComplete: () => void;
}

export default function SouffleRevealAnimation({ visible, onComplete }: SouffleRevealAnimationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnims = useRef(
    Array.from({ length: 8 }, () => ({
      scale: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const { playInteractionSound } = useAudio();

  useEffect(() => {
    if (visible) {
      // Son de révélation
      playInteractionSound('reveal');

      // Animation principale
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Animation de pulsation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Animation des particules
      const sparkleAnimations = sparkleAnims.map((anim, index) => {
        const angle = (index / sparkleAnims.length) * 2 * Math.PI;
        const radius = 80;
        
        return Animated.sequence([
          Animated.delay(200 + index * 50),
          Animated.parallel([
            Animated.spring(anim.scale, {
              toValue: 1,
              useNativeDriver: true,
              tension: 150,
              friction: 8,
            }),
            Animated.timing(anim.translateX, {
              toValue: Math.cos(angle) * radius,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: Math.sin(angle) * radius,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.parallel(sparkleAnimations).start();

      // Fin de l'animation
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete();
          resetAnimations();
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const resetAnimations = () => {
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    rotateAnim.setValue(0);
    pulseAnim.setValue(1);
    sparkleAnims.forEach(anim => {
      anim.scale.setValue(0);
      anim.translateX.setValue(0);
      anim.translateY.setValue(0);
      anim.opacity.setValue(0);
    });
  };

  if (!visible) return null;

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.centerIcon,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
              { rotate: rotation },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        <Sparkles size={40} color="#8B7355" />
      </Animated.View>

      {sparkleAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.sparkle,
            {
              transform: [
                { translateX: anim.translateX },
                { translateY: anim.translateY },
                { scale: anim.scale },
              ],
              opacity: anim.opacity,
            },
          ]}
        >
          <Sparkles size={16} color="#A8C8E1" />
        </Animated.View>
      ))}
    </View>
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
    backgroundColor: 'rgba(249, 247, 244, 0.8)',
    zIndex: 999,
  },
  centerIcon: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(139, 115, 85, 0.3)',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  sparkle: {
    position: 'absolute',
  },
});