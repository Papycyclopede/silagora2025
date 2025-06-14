import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface AnimatedHaloProps {
  children: React.ReactNode;
  isActive?: boolean;
  canReveal?: boolean;
  isRevealed?: boolean;
}

export function AnimatedHalo({ 
  children, 
  isActive = false, 
  canReveal = false, 
  isRevealed = false 
}: AnimatedHaloProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (canReveal && !isRevealed) {
      // Animation de pulsation pour les souffles révélables
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      
      return () => pulseAnimation.stop();
    } else if (isActive) {
      // Animation de rotation douce pour les éléments actifs
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();
      
      return () => rotateAnimation.stop();
    }
  }, [isActive, canReveal, isRevealed]);

  useEffect(() => {
    // Animation d'apparition
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [
          { scale: canReveal ? pulseAnim : scaleAnim },
          { rotate: isActive ? rotation : '0deg' },
        ],
        opacity: opacityAnim,
      }}
    >
      {children}
    </Animated.View>
  );
}

interface FloatingParticleProps {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
}

export function FloatingParticle({ 
  delay = 0, 
  duration = 3000, 
  children 
}: FloatingParticleProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -20,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [delay, duration]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
      }}
    >
      {children}
    </Animated.View>
  );
}

interface WaveEffectProps {
  isActive: boolean;
  children: React.ReactNode;
}

export function WaveEffect({ isActive, children }: WaveEffectProps) {
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      const createWave = (animValue: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 2000,
              easing: Easing.out(Easing.ease),
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
        createWave(wave1, 0),
        createWave(wave2, 600),
        createWave(wave3, 1200),
      ];

      animations.forEach(anim => anim.start());
      
      return () => animations.forEach(anim => anim.stop());
    }
  }, [isActive]);

  const createWaveStyle = (animValue: Animated.Value) => ({
    position: 'absolute' as const,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(168, 200, 225, 0.6)',
    transform: [
      {
        scale: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 2],
        }),
      },
    ],
    opacity: animValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 0.4, 0],
    }),
  });

  return (
    <Animated.View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {isActive && (
        <>
          <Animated.View style={createWaveStyle(wave1)} />
          <Animated.View style={createWaveStyle(wave2)} />
          <Animated.View style={createWaveStyle(wave3)} />
        </>
      )}
      {children}
    </Animated.View>
  );
}