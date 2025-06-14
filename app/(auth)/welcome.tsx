import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  Alert, // Ajout pour les alertes
} from 'react-native';
import { router } from 'expo-router';
import { Wind, Heart, MapPin, Users, Crown, Volume2 } from 'lucide-react-native'; // Ajout de Volume2 pour l'icône audio
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation } from '@/contexts/LocationContext'; // Import du hook de localisation
import { useAudio } from '@/contexts/AudioContext'; // Import du hook audio
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import de AsyncStorage

const { width, height } = Dimensions.get('window');

// Clés AsyncStorage pour les choix de l'utilisateur
const HAS_SEEN_PERMISSIONS_SCREEN = '@silagora:has_seen_permissions_screen';
const USER_AUDIO_PREFERENCE = '@silagora:user_audio_preference'; // 'enabled' | 'disabled' | null
const USER_LOCATION_PREFERENCE = '@silagora:user_location_preference'; // 'granted' | 'denied' | null

export default function WelcomeScreen() {
  const { t } = useLanguage();
  const { requestLocation, hasPermission: hasLocationPermission, error: locationError } = useLocation(); // Utilise le hook de localisation
  const { initAudio, settings: audioSettings, updateSettings } = useAudio(); // Utilise le hook audio

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState(false);

  useEffect(() => {
    const checkUserPreferences = async () => {
      // Vérifie si l'utilisateur a déjà vu cet écran et fait ses choix
      const seenPermissionsScreen = await AsyncStorage.getItem(HAS_SEEN_PERMISSIONS_SCREEN);
      if (seenPermissionsScreen === 'true') {
        // Si l'utilisateur a déjà vu l'écran, on le redirige directement
        // Il gérera ses permissions via les paramètres de l'OS ou l'écran de la carte
        router.replace('/(tabs)');
        return;
      }
      
      // Si c'est la première fois, on affiche la modale de localisation
      setHasCheckedPreferences(true);
      setShowLocationModal(true);
    };

    checkUserPreferences();
  }, []);

  // --- Fonctions de gestion des permissions ---

  const handleLocationChoice = async (choice: 'activate' | 'later') => {
    setShowLocationModal(false); // Ferme la modale de localisation

    if (choice === 'activate') {
      await requestLocation(); // Demande la permission de localisation
      await AsyncStorage.setItem(USER_LOCATION_PREFERENCE, hasLocationPermission ? 'granted' : 'denied');
      if (hasLocationPermission) {
        Alert.alert(t('welcome.locationSuccessTitle'), t('welcome.locationSuccessMessage'));
      } else {
        Alert.alert(t('welcome.locationDeniedTitle'), t('welcome.locationDeniedMessage'));
      }
    } else {
      await AsyncStorage.setItem(USER_LOCATION_PREFERENCE, 'denied');
    }

    // Après le choix de localisation, on passe à la modale audio
    setShowAudioModal(true);
  };

  const handleAudioChoice = async (choice: 'activate' | 'continueWithout') => {
    setShowAudioModal(false); // Ferme la modale audio

    if (choice === 'activate') {
      await updateSettings({ enabled: true, contextualSounds: true, spatialAudio: true }); // Active les sons
      await initAudio(); // Initialise les sons
      await AsyncStorage.setItem(USER_AUDIO_PREFERENCE, 'enabled');
      Alert.alert(t('welcome.audioSuccessTitle'), t('welcome.audioSuccessMessage'));
    } else {
      await updateSettings({ enabled: false }); // Désactive les sons
      await AsyncStorage.setItem(USER_AUDIO_PREFERENCE, 'disabled');
      Alert.alert(t('welcome.audioDeniedTitle'), t('welcome.audioDeniedMessage'));
    }

    // Marque que l'utilisateur a vu l'écran des permissions
    await AsyncStorage.setItem(HAS_SEEN_PERMISSIONS_SCREEN, 'true');
    // Une fois les choix faits, on redirige vers l'écran de création de compte ou de login
    router.replace('/(auth)/create-account');
  };

  // Si les préférences n'ont pas encore été vérifiées, ne rien afficher pour éviter un flash
  if (!hasCheckedPreferences) {
    return null;
  }

  const features = [
    {
      icon: <Wind size={24} color="#8B7355" />,
      title: t('welcome.feature1.title'), // Traduction
      description: t('welcome.feature1.description'), // Traduction
    },
    {
      icon: <MapPin size={24} color="#8B7355" />,
      title: t('welcome.feature2.title'),
      description: t('welcome.feature2.description'),
    },
    {
      icon: <Heart size={24} color="#8B7355" />,
      title: t('welcome.feature3.title'),
      description: t('welcome.feature3.description'),
    },
    {
      icon: <Users size={24} color="#8B7355" />,
      title: t('welcome.feature4.title'),
      description: t('welcome.feature4.description'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header poétique */}
        <View style={styles.header}>
          <Text style={styles.title}>Silagora</Text>
          <Text style={styles.etymology}>
            {t('about.etymology')} {/* Réutilise la traduction existante */}
          </Text>
          <View style={styles.decorativeLine} />
          <Text style={styles.subtitle}>
            {t('about.description')} {/* Réutilise la traduction existante */}
          </Text>
        </View>

        {/* Fonctionnalités */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>{t('welcome.featuresTitle')}</Text> {/* Traduction */}
          
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                {feature.icon}
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Citation inspirante */}
        <View style={styles.quoteSection}>
          <Text style={styles.quoteText}>
            {t('about.quote.text')} {/* Réutilise la traduction existante */}
          </Text>
          <Text style={styles.quoteAuthor}>— {t('about.quote.author')}</Text> {/* Réutilise la traduction existante */}
        </View>

        {/* Éthique */}
        <View style={styles.ethicsSection}>
          <Text style={styles.ethicsTitle}>{t('about.ethics.title')}</Text> {/* Réutilise la traduction existante */}
          <View style={styles.ethicsGrid}>
            <View style={styles.ethicsItem}>
              <Text style={styles.ethicsEmoji}>🔒</Text>
              <Text style={styles.ethicsText}>{t('about.ethics.point1Short')}</Text> {/* Nouvelle traduction plus courte */}
            </View>
            <View style={styles.ethicsItem}>
              <Text style={styles.ethicsEmoji}>🌱</Text>
              <Text style={styles.ethicsText}>{t('about.ethics.point5Short')}</Text> {/* Nouvelle traduction plus courte */}
            </View>
            <View style={styles.ethicsItem}>
              <Text style={styles.ethicsEmoji}>💝</Text>
              <Text style={styles.ethicsText}>{t('welcome.ethics3Text')}</Text> {/* Traduction */}
            </View>
            <View style={styles.ethicsItem}>
              <Text style={styles.ethicsEmoji}>🤝</Text>
              <Text style={styles.ethicsText}>{t('welcome.ethics4Text')}</Text> {/* Traduction */}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Boutons d'action : Ces boutons ne sont plus le premier point d'entrée pour les permissions */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/create-account')} // Redirige vers la création de compte
        >
          <Text style={styles.primaryButtonText}>{t('welcome.startButton')}</Text> {/* Traduction */}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')} // Redirige vers le login
        >
          <Text style={styles.secondaryButtonText}>{t('welcome.alreadyAccountButton')}</Text> {/* Traduction */}
        </TouchableOpacity>

        {/* Bouton d'accès maître discret */}
        <TouchableOpacity
          style={styles.masterButton}
          onPress={() => router.push('/(auth)/master-login')}
        >
          <Crown size={16} color="#8B7355" />
          <Text style={styles.masterButtonText}>{t('welcome.developerAccess')}</Text> {/* Traduction */}
        </TouchableOpacity>
      </View>

      {/* Modal pour la demande de localisation */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => handleLocationChoice('later')} // Gérer le retour arrière
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MapPin size={32} color="#8B7355" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>{t('welcome.locationModalTitle')}</Text>
            <Text style={styles.modalText}>{t('welcome.locationModalText')}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => handleLocationChoice('activate')}>
              <Text style={styles.modalButtonText}>{t('welcome.locationModalButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSkipButton} onPress={() => handleLocationChoice('later')}>
              <Text style={styles.modalSkipButtonText}>{t('welcome.locationModalSkip')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal pour la demande audio */}
      <Modal
        visible={showAudioModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => handleAudioChoice('continueWithout')} // Gérer le retour arrière
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Volume2 size={32} color="#8B7355" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>{t('welcome.audioModalTitle')}</Text>
            <Text style={styles.modalText}>{t('welcome.audioModalText')}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => handleAudioChoice('activate')}>
              <Text style={styles.modalButtonText}>{t('welcome.audioModalButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSkipButton} onPress={() => handleAudioChoice('continueWithout')}>
              <Text style={styles.modalSkipButtonText}>{t('welcome.audioModalSkip')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5F0',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 42,
    fontFamily: 'Satisfy-Regular',
    color: '#4D3B2F',
    letterSpacing: 2,
    marginBottom: 8,
  },
  etymology: {
    fontSize: 12,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  decorativeLine: {
    width: 80,
    height: 1,
    backgroundColor: 'rgba(139, 115, 85, 0.3)',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Regular',
    color: '#4D3B2F',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  featuresSection: {
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 20,
    fontFamily: 'Satisfy-Regular',
    color: '#4D3B2F',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 1,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.1)',
    shadowColor: '#4D3B2F',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    marginRight: 15,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 13,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 20,
  },
  quoteSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 25,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#8B7355',
    marginBottom: 40,
  },
  quoteText: {
    fontSize: 15,
    fontFamily: 'Satisfy-Regular',
    color: '#4D3B2F',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  quoteAuthor: {
    fontSize: 12,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    textAlign: 'right',
  },
  ethicsSection: {
    marginBottom: 40,
  },
  ethicsTitle: {
    fontSize: 18,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    textAlign: 'center',
    marginBottom: 20,
  },
  ethicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ethicsItem: {
    width: '48%',
    backgroundColor: 'rgba(139, 115, 85, 0.08)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  ethicsEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  ethicsText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    textAlign: 'center',
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: 'rgba(249, 245, 240, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.08)',
  },
  primaryButton: {
    backgroundColor: '#8B7355',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#4D3B2F',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#F9F5F0',
    letterSpacing: 0.8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.3)',
    marginBottom: 20,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    letterSpacing: 0.5,
  },
  masterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 115, 85, 0.05)',
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.15)',
  },
  masterButtonText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#F9F5F0',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.1)',
  },
  modalIcon: {
    marginBottom: 20,
    opacity: 0.7,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  modalButton: {
    backgroundColor: '#8B7355',
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#4D3B2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#F9F5F0',
    letterSpacing: 0.8,
  },
  modalSkipButton: {
    paddingVertical: 10,
  },
  modalSkipButtonText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    textDecorationLine: 'underline',
  },
});