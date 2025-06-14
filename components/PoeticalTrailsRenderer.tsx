import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useLocation } from '@/contexts/LocationContext';
import { EchoSimulation, type EchoTrail, type EnhancedEchoPlace } from '@/utils/echoSimulation';
import { calculateDistance } from '@/utils/distance';

interface PoeticalTrailsRendererProps {
  isVisible: boolean;
  places: EnhancedEchoPlace[];
  trails: EchoTrail[];
  selectedPlace?: EnhancedEchoPlace | null;
}

export default function PoeticalTrailsRenderer({ 
  isVisible, 
  places, 
  trails, 
  selectedPlace 
}: PoeticalTrailsRendererProps) {
  const { location } = useLocation();
  const flowAnims = useRef<Record<string, Animated.Value>>({}).current;

  const echoSimulation = EchoSimulation.getInstance();
  const simulatedPlaces = echoSimulation.getSimulatedPlaces();
  const simulatedTrails = echoSimulation.getSimulatedTrails();

  // Utiliser les données simulées si disponibles
  const activePlaces = places.length > 0 ? places : simulatedPlaces;
  const activeTrails = trails.length > 0 ? trails : simulatedTrails;

  // Initialiser les animations de flux
  useEffect(() => {
    activeTrails.forEach(trail => {
      if (!flowAnims[trail.id]) {
        flowAnims[trail.id] = new Animated.Value(0);
        
        if (trail.isActive) {
          Animated.loop(
            Animated.timing(flowAnims[trail.id], {
              toValue: 1,
              duration: 4000 + Math.random() * 2000,
              useNativeDriver: true,
            })
          ).start();
        }
      }
    });
  }, [activeTrails]);

  const getPlacePosition = (placeId: string): { x: number; y: number } | null => {
    const place = activePlaces.find(p => p.id === placeId);
    if (!place || !location) return null;

    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      place.latitude,
      place.longitude
    );

    if (distance > 1500) return null;

    // Position relative simplifiée
    const angle = Math.atan2(
      place.latitude - location.latitude,
      place.longitude - location.longitude
    );

    const screenDistance = Math.min(distance / 10, 150);
    const centerX = 200;
    const centerY = 300;

    return {
      x: centerX + Math.cos(angle) * screenDistance,
      y: centerY + Math.sin(angle) * screenDistance,
    };
  };

  const renderTrail = (trail: EchoTrail) => {
    const fromPos = getPlacePosition(trail.fromPlaceId);
    const toPos = getPlacePosition(trail.toPlaceId);
    
    if (!fromPos || !toPos) return null;

    const isHighlighted = selectedPlace && 
      (selectedPlace.id === trail.fromPlaceId || selectedPlace.id === trail.toPlaceId);

    // Calcul de l'angle et de la longueur
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Couleur du sentier basée sur la résonance émotionnelle
    const getTrailColor = () => {
      switch (trail.emotionalResonance) {
        case 'mélancolie-nostalgie':
          return '#8B9DC3';
        case 'optimisme':
          return '#F4E4BC';
        case 'paix-intérieure':
          return '#A8C8E1';
        case 'douceur-amère':
          return '#D4A574';
        case 'enthousiasme':
          return '#E6A8A8';
        default:
          return '#B8A082';
      }
    };

    return (
      <View
        key={trail.id}
        style={[
          styles.trailContainer,
          {
            left: fromPos.x,
            top: fromPos.y,
            width: length,
            transform: [{ rotate: `${angle}deg` }],
          },
        ]}
      >
        {/* Sentier principal - fin et discret */}
        <View
          style={[
            styles.trail,
            {
              backgroundColor: getTrailColor(),
              opacity: trail.isActive ? trail.intensity * 0.6 : 0.2,
              height: isHighlighted ? 2 : 1,
            },
          ]}
        />
        
        {/* Animation de flux - particule mobile */}
        {trail.isActive && (
          <Animated.View
            style={[
              styles.flowParticle,
              {
                backgroundColor: getTrailColor(),
                transform: [
                  {
                    translateX: flowAnims[trail.id]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, length],
                    }) || 0,
                  },
                ],
                opacity: flowAnims[trail.id]?.interpolate({
                  inputRange: [0, 0.1, 0.9, 1],
                  outputRange: [0, 0.8, 0.8, 0],
                }) || 0,
              },
            ]}
          />
        )}
      </View>
    );
  };

  if (!isVisible || !location) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {activeTrails.map(renderTrail)}
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
    zIndex: 1,
  },
  trailContainer: {
    position: 'absolute',
    height: 4,
    justifyContent: 'center',
  },
  trail: {
    height: 1,
    borderRadius: 0.5,
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  flowParticle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    top: -1,
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
});