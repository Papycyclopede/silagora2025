import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { X } from 'lucide-react-native';
import { useLocation } from '@/contexts/LocationContext';
import { useAudio } from '@/contexts/AudioContext';
import { EchoSimulation, type EnhancedEchoPlace } from '@/utils/echoSimulation';
import { calculateDistance } from '@/utils/distance';

interface EchoPlacesVisualizerProps {
  isVisible: boolean;
  onPlaceSelect?: (place: EnhancedEchoPlace) => void;
}

export default function EchoPlacesVisualizer({ 
  isVisible, 
  onPlaceSelect 
}: EchoPlacesVisualizerProps) {
  const { location } = useLocation();
  const { playContextualSound, settings } = useAudio();
  const [simulatedPlaces, setSimulatedPlaces] = useState<EnhancedEchoPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<EnhancedEchoPlace | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnims = useRef<Record<string, Animated.Value>>({}).current;

  const echoSimulation = EchoSimulation.getInstance();

  // Initialiser les animations de pulsation
  useEffect(() => {
    simulatedPlaces.forEach(place => {
      if (!pulseAnims[place.id]) {
        pulseAnims[place.id] = new Animated.Value(1);
        
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnims[place.id], {
              toValue: 1.3,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnims[place.id], {
              toValue: 1,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    });
  }, [simulatedPlaces]);

  // Activer/désactiver la simulation
  useEffect(() => {
    if (isVisible && location) {
      const { places } = echoSimulation.activateSimulation(
        location.latitude, 
        location.longitude
      );
      setSimulatedPlaces(places);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();

      if (settings.contextualSounds) {
        playContextualSound('echo_place');
      }
    } else if (!isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        echoSimulation.deactivateSimulation();
        setSimulatedPlaces([]);
        setSelectedPlace(null);
      });
    }
  }, [isVisible, location]);

  const handlePlacePress = (place: EnhancedEchoPlace) => {
    setSelectedPlace(place);
    onPlaceSelect?.(place);
    
    if (settings.contextualSounds) {
      playContextualSound('revealing');
    }
  };

  const getPlaceDistance = (place: EnhancedEchoPlace): number => {
    if (!location) return 0;
    return calculateDistance(
      location.latitude,
      location.longitude,
      place.latitude,
      place.longitude
    );
  };

  const getPlaceIcon = (intensity: string) => {
    switch (intensity) {
      case 'murmure':
        return '💫';
      case 'echo':
        return '🌊';
      case 'sanctuaire':
        return '🏛️';
      default:
        return '💫';
    }
  };

  const getIntensitySize = (intensity: string) => {
    switch (intensity) {
      case 'murmure':
        return 25;
      case 'echo':
        return 35;
      case 'sanctuaire':
        return 45;
      default:
        return 25;
    }
  };

  const renderPlace = (place: EnhancedEchoPlace) => {
    if (!location) return null;

    const distance = getPlaceDistance(place);
    if (distance > 2000) return null;

    const size = getIntensitySize(place.intensity);
    const isNearby = distance < 100;
    const isSelected = selectedPlace?.id === place.id;

    // Position relative simplifiée (pour la démo)
    const angle = Math.atan2(
      place.latitude - location.latitude,
      place.longitude - location.longitude
    );
    const screenDistance = Math.min(distance / 10, 150);
    const centerX = 200;
    const centerY = 300;

    const x = centerX + Math.cos(angle) * screenDistance;
    const y = centerY + Math.sin(angle) * screenDistance;

    return (
      <TouchableOpacity
        key={place.id}
        style={[
          styles.echoPlace,
          {
            left: x - size/2,
            top: y - size/2,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: place.colorTheme,
            borderColor: isSelected ? '#F4E4BC' : 'rgba(255, 255, 255, 0.8)',
            borderWidth: isSelected ? 3 : 2,
          },
          isNearby && styles.nearbyPlace,
        ]}
        onPress={() => handlePlacePress(place)}
      >
        <Animated.View
          style={[
            styles.placeContent,
            {
              transform: [{ scale: pulseAnims[place.id] || 1 }],
            },
          ]}
        >
          <Text style={styles.placeIcon}>
            {getPlaceIcon(place.intensity)}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  if (!isVisible || !location) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="box-none">
      {/* Rendu des lieux d'écho */}
      <View style={styles.placesLayer}>
        {simulatedPlaces.map(renderPlace)}
      </View>

      {/* Panneau d'information du lieu sélectionné */}
      {selectedPlace && (
        <View style={styles.infoPanel}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPlace(null)}
          >
            <X size={16} color="#8B7D6B" />
          </TouchableOpacity>
          
          <Text style={styles.infoPanelTitle}>{selectedPlace.name}</Text>
          <Text style={styles.infoPanelSubtitle}>
            {selectedPlace.intensity.charAt(0).toUpperCase() + selectedPlace.intensity.slice(1)} • {selectedPlace.emotionalSignature}
          </Text>
          
          <Text style={styles.infoPanelDescription}>
            {selectedPlace.description}
          </Text>
          
          <View style={styles.infoPanelStats}>
            <Text style={styles.statText}>
              {selectedPlace.souffleCount} souffles • {Math.round(getPlaceDistance(selectedPlace))}m
            </Text>
          </View>
        </View>
      )}
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
    zIndex: 2,
  },
  placesLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  echoPlace: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nearbyPlace: {
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  placeContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  placeIcon: {
    fontSize: 16,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.2)',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 125, 107, 0.1)',
    borderRadius: 15,
  },
  infoPanelTitle: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
    marginBottom: 4,
    paddingRight: 30,
  },
  infoPanelSubtitle: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  infoPanelDescription: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 15,
  },
  infoPanelStats: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 10,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
  },
});