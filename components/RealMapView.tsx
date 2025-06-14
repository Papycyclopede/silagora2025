import React, { useEffect } from 'react';
import OptimizedMapView from './OptimizedMapView';
import { useAudio } from '@/contexts/AudioContext';

interface RealMapViewProps {
  mode: 'read' | 'write';
  onSouffleRevealed?: (souffle: any) => void;
}

export default function RealMapView({ mode, onSouffleRevealed }: RealMapViewProps) {
  const { settings, playAmbientSound, setAudioContext } = useAudio();

  // Démarrer l'ambiance sonore au chargement de la carte
  useEffect(() => {
    setAudioContext('map');
    if (settings.enabled) {
      playAmbientSound();
    }
  }, []);

  return (
    <OptimizedMapView 
      mode={mode} 
      onSouffleRevealed={onSouffleRevealed} 
    />
  );
}