// app/_initial.tsx

import 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useLocation } from '@/contexts/LocationContext'; // Importez isLocationReady
import { View, Text, StyleSheet, Animated, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_LAUNCHED_KEY = '@silagora:has_launched';

export default function AppInitializer() {
  const { isLoading: isAuthLoading } = useAuth();
  const { isSoundLoading, initAudio, settings: audioSettings } = useAudio();
  const { loading: locationLoading, hasPermission: hasLocationPermission, isLocationReady } = useLocation(); // MODIFIÉ: Ajout de isLocationReady

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
    const checkFirstLaunchAndRedirect = async () => {
      // Étape 1: Vérifier si c'est le premier lancement (si non déjà fait)
      if (!hasCheckedFirstLaunch) {
        try {
          const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
          if (hasLaunched === null) {
            setIsFirstLaunch(true);
            await AsyncStorage.setItem(HAS_LAUNCHED_KEY, 'true');
            console.log("Premier lancement détecté. HAS_LAUNCHED_KEY a été défini.");
          } else {
            setIsFirstLaunch(false);
            console.log("Ce n'est pas le premier lancement.");
          }
        } catch (e) {
          console.error("Failed to check first launch status or set key:", e);
          setIsFirstLaunch(false);
        } finally {
          setHasCheckedFirstLaunch(true); // Marquer que la vérification initiale est terminée
        }
        return; // Attendre le prochain cycle de rendu avec hasCheckedFirstLaunch mis à jour
      }

      // Étape 2: Redirection basée sur isFirstLaunch et l'état des ressources
      if (isFirstLaunch) {
        setInitializationStatus("Préparation de l'expérience initiale...");
        console.log("Redirection vers /welcome (premier lancement)...");
        router.replace('/(auth)/welcome');
        return;
      }

      // Si ce n'est PAS le premier lancement, initialiser et rediriger vers la carte

      setInitializationStatus("Vérification de l'authentification...");
      if (isAuthLoading) {
        // Attendre que l'authentification soit chargée. Ne pas avancer tant que ce n'est pas fait.
        return;
      }

      setInitializationStatus("Vérification des permissions de localisation...");
      // MODIFIÉ: Attendre que `isLocationReady` soit vrai, peu importe si la permission est granted ou denied.
      if (!isLocationReady) { //
        return;
      }
      
      setInitializationStatus("Initialisation de l'audio (désactivée pour le moment)...");
      // L'audio est désactivé pour le moment. Nous n'appelons pas initAudio() et considérons
      // qu'il est prêt (`isAudioConsideredReady = true`) pour ne pas bloquer.
      const isAudioConsideredReady = true;

      // Une fois toutes les ressources chargées ou considérées comme prêtes
      if (!isAuthLoading && isAudioConsideredReady && isLocationReady) { // MODIFIÉ: Utilise isLocationReady
        console.log("Initialisation complète. Navigation vers /tabs...");
        setInitializationStatus("Prêt pour l'envol !");
        router.replace('/(tabs)');
      } else {
        console.log(`Statuts de chargement: Auth=${!isAuthLoading}, Audio=${isAudioConsideredReady}, LocationReady=${isLocationReady}, LocPerm=${hasLocationPermission}`);
      }
    };

    checkFirstLaunchAndRedirect();
  }, [
    hasCheckedFirstLaunch, 
    isFirstLaunch, 
    isAuthLoading, 
    isSoundLoading, 
    locationLoading, 
    hasLocationPermission, 
    isLocationReady, // NOUVELLE DÉPENDANCE CLÉ
    audioSettings.enabled, 
    initAudio 
  ]);


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
