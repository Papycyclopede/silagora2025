// app/_initial.tsx

import 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useLocation } from '@/contexts/LocationContext';
import { View, Text, StyleSheet, Animated, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Toujours importé pour d'autres usages dans l'app

// HAS_LAUNCHED_KEY n'est PLUS utilisé ici pour la redirection initiale.
// const HAS_LAUNCHED_KEY = '@silagora:has_launched';

export default function AppInitializer() {
  // MODIFIÉ: Ajout de isAuthenticated
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  // isSoundLoading et initAudio sont toujours là mais ne seront pas appelés si l'audio est "désactivé pour le moment"
  const { isSoundLoading, initAudio, settings: audioSettings } = useAudio();
  // MODIFIÉ: Ajout de isLocationReady
  const { loading: locationLoading, hasPermission: hasLocationPermission, isLocationReady } = useLocation();

  // hasCheckedFirstLaunch et isFirstLaunch sont PLUS utilisés pour le démarrage initial.
  // const [hasCheckedFirstLaunch, setHasCheckedFirstLaunch] = useState(false);
  // const [isFirstLaunch, setIsFirstLaunch] = useState(false);
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
    const initializeAndRedirect = async () => {
      setInitializationStatus("Vérification des ressources...");

      // Attendre que l'authentification soit chargée.
      if (isAuthLoading) {
        console.log("Initialisation: En attente de l'Auth...");
        return;
      }

      // Attendre que le contexte de localisation ait fini son check initial.
      if (!isLocationReady) {
        console.log("Initialisation: En attente de la Localisation (isLocationReady)...");
        return;
      }
      
      // L'audio est désactivé pour le moment. Nous le considérons prêt.
      const isAudioConsideredReady = true;

      // Une fois toutes les ressources chargées ou considérées comme prêtes
      if (!isAuthLoading && isAudioConsideredReady && isLocationReady) {
        if (isAuthenticated) {
          console.log("Initialisation complète. Utilisateur authentifié. Redirection vers /tabs...");
          setInitializationStatus("Prêt pour l'envol !");
          router.replace('/(tabs)');
        } else {
          console.log("Initialisation complète. Utilisateur non authentifié. Redirection vers /welcome...");
          setInitializationStatus("Prêt pour l'envol !");
          router.replace('/(auth)/welcome');
        }
      } else {
        console.log(`Statuts de chargement finaux (avant redirection): Auth=${!isAuthLoading}, Audio=${isAudioConsideredReady}, LocationReady=${isLocationReady}`);
      }
    };

    initializeAndRedirect();
  }, [isAuthLoading, isAuthenticated, isLocationReady, isSoundLoading, locationLoading, hasLocationPermission, audioSettings.enabled, initAudio]);


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
