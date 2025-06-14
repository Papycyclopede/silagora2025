// app/_initial.tsx

import 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useLocation } from '@/contexts/LocationContext';
import { View, Text, StyleSheet, Animated, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_LAUNCHED_KEY = '@silagora:has_launched';

export default function AppInitializer() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth(); // Ajout de isAuthenticated
  const { isSoundLoading, initAudio, settings: audioSettings } = useAudio(); // Retire updateSettings car non utilisé ici
  const { loading: locationLoading, requestLocation, hasPermission: hasLocationPermission } = useLocation();

  const [hasCheckedFirstLaunch, setHasCheckedFirstLaunch] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState("Démarrage...");

  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const waveAnimation = (dot: Animated.Value) =>
      Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ]);

    const loop = Animated.loop(
      Animated.stagger(250, [
        waveAnimation(dot1Opacity),
        waveAnimation(dot2Opacity),
        waveAnimation(dot3Opacity),
      ])
    );
    loop.start();
    
    return () => loop.stop();
  }, []);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
        if (hasLaunched === null) {
          setIsFirstLaunch(true);
          // Marquez l'application comme lancée pour les prochaines fois
          await AsyncStorage.setItem(HAS_LAUNCHED_KEY, 'true');
        } else {
          setIsFirstLaunch(false);
        }
      } catch (e) {
        console.error("Failed to check first launch status:", e);
        setIsFirstLaunch(false); // En cas d'erreur, ne pas traiter comme premier lancement
      } finally {
        setHasCheckedFirstLaunch(true);
      }
    };

    if (!hasCheckedFirstLaunch) {
      checkFirstLaunch();
      return; // Ne pas exécuter la suite de l'effet tant que le check initial n'est pas fait
    }

    // Logique de redirection principale après la vérification du premier lancement
    const initializeAndRedirect = async () => {
      if (isFirstLaunch) {
        console.log("Premier lancement détecté. Redirection vers /welcome...");
        setInitializationStatus("Préparation de l'expérience initiale...");
        router.replace('/(auth)/welcome'); // Redirige toujours vers l'écran d'accueil pour la démo
        return;
      }

      // Si ce n'est PAS le premier lancement
      setInitializationStatus("Vérification de l'authentification...");
      if (isAuthLoading) return; // Attendre que l'authentification soit chargée

      setInitializationStatus("Vérification des permissions de localisation...");
      // Si la permission n'est pas acquise et qu'elle n'est pas en cours de chargement, la demander
      // Note: Le LocationContext la demande déjà par défaut si non acquise et non bloquée.
      if (!hasLocationPermission && !locationLoading) {
        await requestLocation(); 
      }
      
      setInitializationStatus("Initialisation de l'audio...");
      // Si l'audio est activé dans les settings et qu'il n'est pas encore prêt, l'initialiser
      if (audioSettings.enabled && !isSoundLoading) {
        await initAudio();
      } else if (!audioSettings.enabled && !isSoundLoading) {
        // L'audio est désactivé dans les paramètres, on considère qu'il est "prêt"
      }

      // Une fois toutes les ressources chargées et les checks faits
      if (!isAuthLoading && !isSoundLoading && !locationLoading) { // Vérifier aussi isAuthenticated pour une navigation cohérente
        console.log("Initialisation complète. Navigation vers /tabs...");
        setInitializationStatus("Prêt pour l'envol !");
        router.replace('/(tabs)');
      } else {
        console.log(`Statuts de chargement: Auth=${!isAuthLoading}, Audio=${!isSoundLoading}, Location=${!locationLoading}`);
      }
    };

    initializeAndRedirect();
  }, [hasCheckedFirstLaunch, isFirstLaunch, isAuthLoading, isSoundLoading, locationLoading, hasLocationPermission, audioSettings.enabled, initAudio]);


  return (
    <ImageBackground
      source={require('../assets/images/fond.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Silagora</Text>
          <Text style={styles.etymology}>
            du latin "silere" (se taire) et du grec "agora" (place publique)
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={styles.loadingContainer}>
            <Animated.View style={[styles.loadingDot, { opacity: dot1Opacity }]} />
            <Animated.View style={[styles.loadingDot, { opacity: dot2Opacity }]} />
            <Animated.View style={[styles.loadingDot, { opacity: dot3Opacity }]} />
          </View>
          <Text style={styles.loadingText}>{initializationStatus}</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 245, 240, 0.5)',
    paddingHorizontal: 20,
  },
  contentContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 84,
    fontFamily: 'Satisfy-Regular',
    color: '#687fb2',
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  etymology: {
    fontSize: 12,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  statusContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B7355',
    marginHorizontal: 4,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    fontStyle: 'italic',
  },
});