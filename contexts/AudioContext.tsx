import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TYPES ET INTERFACES (Inchangés) ---
export type SoundTheme = 'breeze' | 'ink' | 'night' | 'silence' | 'urban' | 'forest' | 'ocean';

interface AudioSettings {
  enabled: boolean;
  volume: number;
  theme: SoundTheme;
  spatialAudio: boolean;
  adaptiveVolume: boolean;
  contextualSounds: boolean;
}

// Typage des fonctions de lecture pour qu'elles correspondent aux clés vides
type InteractionSoundType = 'reveal' | 'deposit' | 'navigate' | 'proximity' | 'echo' | 'whisper';
type ContextualSoundType = 'approaching' | 'revealing' | 'depositing' | 'echo_place' | 'wind';

interface AudioContextType {
  settings: AudioSettings;
  updateSettings: (newSettings: Partial<AudioSettings>) => Promise<void>;
  initAudio: () => Promise<boolean>;
  playAmbientSound: () => Promise<void>;
  stopAmbientSound: () => Promise<void>;
  playInteractionSound: (type: InteractionSoundType) => Promise<void>;
  playContextualSound: (context: ContextualSoundType) => Promise<void>;
  setAudioContext: (context: 'map' | 'compose' | 'reveal' | 'settings') => void;
  isPlaying: boolean;
  isAudioReady: boolean;
  isSoundLoading: boolean;
  currentContext: string;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// --- DÉFINITION DES ASSETS VIDÉE ---
// Pour éviter les erreurs, nous déclarons les objets vides. Le code ne tentera plus de charger des fichiers.
const AMBIENT_SOUNDS: Record<SoundTheme, any> = {
  breeze: null, ink: null, night: null, urban: null, forest: null, ocean: null, silence: null,
};
const INTERACTION_SOUNDS: Record<InteractionSoundType, any> = {
  reveal: null, deposit: null, navigate: null, proximity: null, echo: null, whisper: null,
};
const CONTEXTUAL_SOUNDS: Record<ContextualSoundType, any> = {
  approaching: null, revealing: null, depositing: null, echo_place: null, wind: null,
};


export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>({
    enabled: false, // Désactivé par défaut pour la démo
    volume: 0.5,
    theme: 'silence',
    spatialAudio: false,
    adaptiveVolume: true,
    contextualSounds: false,
  });

  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isSoundLoading, setIsSoundLoading] = useState(true);
  
  // Ces références sont gardées pour que le code qui en dépend ne casse pas, mais elles ne seront pas utilisées.
  const soundPool = useRef<Record<string, Audio.Sound>>({});
  const ambientSound = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContext, setCurrentContext] = useState('map');

  // --- Fonctions Fiabilisées (elles ne font plus rien ou presque) ---

  const initAudio = async (): Promise<boolean> => {
    if (isAudioReady) return true;
    // On simule l'initialisation pour que le flux de l'app continue.
    setIsAudioReady(true);
    return true;
  };
  
  const loadAllSounds = async () => {
    // La fonction la plus importante : elle se termine instantanément.
    setIsSoundLoading(false);
    console.log("AudioContext: Chargement des sons ignoré pour la démo.");
  };

  const cleanupSounds = async () => { /* Ne fait rien */ };

  useEffect(() => {
    loadSettings();
    loadAllSounds(); // Se terminera tout de suite
    return () => { cleanupSounds(); };
  }, []);

  // Les fonctions de lecture ne font plus rien pour éviter toute erreur.
  const playAmbientSound = async () => {};
  const stopAmbientSound = async () => {};
  const playInteractionSound = async () => {};
  const playContextualSound = async () => {};

  const getContextualVolume = (baseVolume: number): number => baseVolume;
  const setAudioContext = (context: string) => setCurrentContext(context);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('@souffle:audio_settings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));
    } catch (e) {}
  };
  
  const updateSettings = async (newSettings: Partial<AudioSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    await AsyncStorage.setItem('@souffle:audio_settings', JSON.stringify(updatedSettings));
  };

  const value: AudioContextType = {
    settings,
    updateSettings,
    initAudio,
    playAmbientSound,
    stopAmbientSound,
    playInteractionSound,
    playContextualSound,
    setAudioContext,
    isPlaying,
    isAudioReady,
    isSoundLoading,
    currentContext,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio doit être utilisé à l\'intérieur d\'un AudioProvider');
  return context;
}
