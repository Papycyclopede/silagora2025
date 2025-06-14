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
  const { isLoading: isAuthLoading } = useAuth();
  const { isSoundLoading, initAudio, settings: audioSettings, updateSettings } = useAudio();
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
    // TEMPORARY: FORCING REDIRECTION TO WELCOME SCREEN FOR TESTING
    // THIS SECTION SHOULD BE REVERTED AFTER TESTING
    if (!hasCheckedFirstLaunch) {
      const checkFirstLaunchAndForceRedirect = async () => {
        // You might still want to mark it as launched for future real runs
        // try {
        //   const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
        //   if (hasLaunched === null) {
        //     await AsyncStorage.setItem(HAS_LAUNCHED_KEY, 'true');
        //   }
        // } catch (e) {
        //   console.error("Failed to set first launch status:", e);
        // }
        console.log("FORCING: Redirection vers /welcome pour les tests...");
        router.replace('/(auth)/welcome');
        setHasCheckedFirstLaunch(true); // Marque comme vérifié pour éviter des boucles d'effets
      };
      checkFirstLaunchAndForceRedirect();
      return; // Stop further execution of this effect
    }
    // END TEMPORARY FORCING

    // ORIGINAL LOGIC (commented out for temporary forcing)
    // if (!hasCheckedFirstLaunch) {
    //   const checkFirstLaunch = async () => {
    //     try {
    //       const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
    //       if (hasLaunched === null) {
    //         setIsFirstLaunch(true);
    //         await AsyncStorage.setItem(HAS_LAUNCHED_KEY, 'true');
    //       }
    //     } catch (e) {
    //       console.error("Failed to check first launch status:", e);
    //       setIsFirstLaunch(false);
    //     } finally {
    //       setHasCheckedFirstLaunch(true);
    //     }
    //   };
    //   checkFirstLaunch();
    //   return;
    // }

    // if (isFirstLaunch) {
    //   console.log("Premier lancement détecté. Redirection vers /welcome...");
    //   router.replace('/(auth)/welcome');
    //   return;
    // }

    // ORIGINAL LOGIC CONTINUED (commented out for temporary forcing)
    // const initializeResources = async () => {
    //   setInitializationStatus("Vérification de l'authentification...");
    //   if (isAuthLoading) return;

    //   setInitializationStatus("Vérification des permissions de localisation...");
    //   if (!hasLocationPermission && !locationLoading) {
    //     await requestLocation();
    //   }
      
    //   setInitializationStatus("Initialisation de l'audio...");
    //   if (audioSettings.enabled && !isSoundLoading) {
    //     await initAudio();
    //   } else if (!audioSettings.enabled && !isSoundLoading) {
    //     // Audio disabled, mark as ready
    //   }

    //   if (!isAuthLoading && !isSoundLoading && !locationLoading) {
    //     console.log("Initialisation complète. Navigation vers /tabs...");
    //     router.replace('/(tabs)');
    //   } else {
    //     console.log(`Statuts de chargement: Auth=${!isAuthLoading}, Audio=${!isSoundLoading}, Location=${!locationLoading}`);
    //   }
    // };

    // initializeResources();
  }, [hasCheckedFirstLaunch]); // Only dependent on this flag for the temporary redirect


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