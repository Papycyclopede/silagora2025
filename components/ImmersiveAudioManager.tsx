import { useEffect, useRef } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { useLocation } from '@/contexts/LocationContext';
import { calculateDistance } from '@/utils/distance';
import type { Souffle } from '@/types/souffle';

interface ImmersiveAudioManagerProps {
  currentMode: 'read' | 'write';
  selectedSouffle?: Souffle | null;
}

// Constantes pour la logique de proximité
const PROXIMITY_RADIUS = 50; // en mètres, pour déclencher le son de proximité
const ECHO_PLACE_RADIUS = 100; // en mètres, pour détecter un lieu d'écho
const ECHO_PLACE_THRESHOLD = 3; // nombre de souffles pour former un lieu d'écho
const NOTIFICATION_COOLDOWN = 60000; // 1 minute en ms avant de pouvoir re-déclencher un son pour le même souffle

export default function ImmersiveAudioManager({ 
  currentMode, 
  selectedSouffle 
}: ImmersiveAudioManagerProps) {
  const { 
    settings, 
    playContextualSound, 
    playInteractionSound, 
    setAudioContext 
  } = useAudio();
  const { souffles } = useSouffle();
  const { location } = useLocation();
  
  // Remplacer les états 'lastState' par un seul 'useRef' pour gérer le cooldown
  const recentlyNotified = useRef<Map<string, number>>(new Map());
  const inEchoPlace = useRef(false);

  // --- LOGIQUE CONTEXTUELLE EXISTANTE (Conservée car correcte) ---

  // 1. Gère le contexte audio en fonction du mode de l'application (lecture vs composition)
  useEffect(() => {
    if (currentMode === 'write') {
      setAudioContext('compose');
      if (settings.contextualSounds) {
        playContextualSound('depositing');
      }
    } else {
      setAudioContext('map');
    }
  }, [currentMode, settings.contextualSounds]);

  // 2. Gère le son lors de la révélation d'un souffle
  useEffect(() => {
    if (selectedSouffle && settings.contextualSounds) {
      setAudioContext('reveal');
      playContextualSound('revealing');
      playInteractionSound('reveal');
    }
  }, [selectedSouffle, settings.contextualSounds]);

  // --- LOGIQUE DE PROXIMITÉ (Entièrement Corrigée) ---

  // 3. Déclenche les sons de proximité et de lieu d'écho UNIQUEMENT quand la position change
  useEffect(() => {
    // Ne rien faire si la localisation n'est pas dispo ou si les sons sont désactivés
    if (!location || !settings.contextualSounds) {
      return;
    }

    const now = Date.now();
    let nearbySouffleCount = 0;

    // Itérer sur les souffles pour vérifier la proximité
    souffles.forEach(souffle => {
      if (souffle.isRevealed) return;

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        souffle.latitude,
        souffle.longitude
      );

      // Gestion des lieux d'écho
      if (distance <= ECHO_PLACE_RADIUS) {
        nearbySouffleCount++;
      }

      // Gestion du son de proximité d'un souffle individuel
      const lastNotifiedTime = recentlyNotified.current.get(souffle.id);
      
      if (distance <= PROXIMITY_RADIUS && (!lastNotifiedTime || now - lastNotifiedTime > NOTIFICATION_COOLDOWN)) {
        console.log(`Audio: Proximité détectée pour le souffle ${souffle.id}`);
        playContextualSound('approaching');
        playInteractionSound('proximity');
        recentlyNotified.current.set(souffle.id, now); // Mémoriser le moment du déclenchement
      }
    });

    // Déclencher le son de lieu d'écho si les conditions sont remplies
    const isCurrentlyInEchoPlace = nearbySouffleCount >= ECHO_PLACE_THRESHOLD;
    if (isCurrentlyInEchoPlace && !inEchoPlace.current) {
      console.log("Audio: Entrée dans un lieu d'écho");
      playContextualSound('echo_place');
      playInteractionSound('echo');
    }
    inEchoPlace.current = isCurrentlyInEchoPlace;

  }, [location, souffles, settings.contextualSounds]); // Ce hook ne s'exécute que si ces valeurs changent

  // Ce composant ne rend rien, il gère uniquement la logique audio en arrière-plan
  return null;
}