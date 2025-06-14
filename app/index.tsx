// app/_initial.tsx (anciennement app/index.tsx)
import 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react'; // Ajouté useState
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { View, Text, StyleSheet, Animated, ImageBackground } from 'react-native';

export default function AppInitializer() { // Renommé de IndexScreen à AppInitializer pour plus de clarté
  const { isLoading: isAuthLoading } = useAuth();
  const { isSoundLoading } = useAudio();

  // Correction: Si ces fournisseurs sont bien dans _layout.tsx et que cet écran est la première route,
  // alors les hooks useAuth et useAudio sont accessibles.
  // La logique de redirection doit tenir compte de la première fois vs. pas la première fois.
  // Votre ancien _initial.tsx (qui est maintenant AppInitializer) a une logique de redirection vers welcome.
  // Nous allons réintégrer cette logique ici.

  const [initializationStatus, setInitializationStatus] = useState("Démarrage...");

  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  // Animation des points
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

  // Logique de redirection principale
  useEffect(() => {
    const checkAndRedirect = async () => {
      // Pour la démo du hackathon, nous allons simplifier et toujours rediriger vers welcome
      // Si vous voulez la logique de "premier lancement", utilisez AsyncStorage ici.
      setInitializationStatus("Préparation des murmures...");
      
      // Attendez que l'auth et l'audio soient prêts
      if (!isAuthLoading && !isSoundLoading) {
        // Redirige toujours vers l'écran de bienvenue pour la démo/setup initial
        // Après le premier setup, vous pourrez router directement vers (tabs)
        setInitializationStatus("Prêt pour l'envol !");
        console.log("Initialisation complète. Redirection vers /welcome...");
        router.replace('/(auth)/welcome'); // Redirige toujours vers l'écran d'accueil pour la démo
      } else {
        console.log(`Statuts de chargement: Auth=${!isAuthLoading}, Audio=${!isSoundLoading}`);
      }
    };

    checkAndRedirect();
  }, [isAuthLoading, isSoundLoading]);


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