import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Wind, Heart, MapPin, Users, Crown, Volume2 } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';
import { useAudio } from '@/contexts/AudioContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const HAS_SEEN_PERMISSIONS_SCREEN = '@silagora:has_seen_permissions_screen'; //
const USER_AUDIO_PREFERENCE = '@silagora:user_audio_preference'; //
const USER_LOCATION_PREFERENCE = '@silagora:user_location_preference'; //

export default function WelcomeScreen() {
  const { t } = useLanguage();
  const { requestLocation, hasPermission: hasLocationPermission, error: locationError } = useLocation(); //
  const { updateSettings } = useAudio(); //

  const [showLocationModal, setShowLocationModal] = useState(false); //
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState(false); //

  useEffect(() => {
    const checkUserPreferences = async () => {
      const seenPermissionsScreen = await AsyncStorage.getItem(HAS_SEEN_PERMISSIONS_SCREEN); //
      if (seenPermissionsScreen === 'true') {
        router.replace('/(tabs)'); //
        return;
      }
      
      setHasCheckedPreferences(true);
      setShowLocationModal(true); // Toujours commencer par la modale de localisation
    };

    checkUserPreferences();
  }, []);

  const handleLocationChoice = async (choice: 'activate' | 'later') => {
    setShowLocationModal(false); // Ferme la modale de localisation immédiatement

    if (choice === 'activate') {
      // IMPORTANT: NE PAS AWAIT ICI pour éviter de bloquer l'UI si la pop-up Expo est lente.
      // La promesse sera résolue en arrière-plan dans LocationContext.
      requestLocation(); // Déclenche la demande de permission et acquisition de position

      await AsyncStorage.setItem(USER_LOCATION_PREFERENCE, choice === 'activate' ? 'granted' : 'denied'); //
    } else {
      await AsyncStorage.setItem(USER_LOCATION_PREFERENCE, 'denied'); //
    }

    handleAudioChoice(); // Continue le flux d'initialisation
  };

  const handleAudioChoice = async () => {
    await updateSettings({ enabled: false, contextualSounds: false, spatialAudio: false }); //
    await AsyncStorage.setItem(USER_AUDIO_PREFERENCE, 'disabled'); //

    await AsyncStorage.setItem(HAS_SEEN_PERMISSIONS_SCREEN, 'true'); //
    router.replace('/(auth)/create-account'); // Redirige toujours vers l'écran de création de compte
  };

  if (!hasCheckedPreferences) { //
    return null;
  }

  const features = [ //
    {
      icon: <Wind size={24} color="#8B7355" />,
      title: t('welcome.feature1.title'),
      description: t('welcome.feature1.description'),
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
      {/* Header poétique */}
      <View style={styles.header}>
        <Text style={styles.title}>Silagora</Text>
        <Text style={styles.etymology}>
          {t('about.etymology')}
        </Text>
        <View style={styles.decorativeLine} />
        <Text style={styles.subtitle}>
          {t('about.description')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Fonctionnalités */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>{t('welcome.featuresTitle')}</Text>
          
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
            {t('about.quote.text')}
          </Text>
          <Text style={styles.quoteAuthor}>— {t('about.quote.author')}</Text>
        </View>

        {/* Éthique */}
        <View style={styles.ethicsSection}>
          <Text style={styles.ethicsTitle}>{t('about.ethics.title')}</Text>
          <View style={styles.ethicsGrid}>
            <View style={styles.ethicsItem}>
              <Text style={styles.ethicsEmoji}>🔒</Text>
              <Text style={styles.ethicsText}>{t('about.ethics.point1Short')}</Text>
            </View>
            <View style={styles.ethicsItem}>
              <Text style={styles.ethicsEmoji}>🌱</Text>
              <Text style={styles.ethicsText}>{t('about.ethics.point5Short')}</Text>
            </View>
            <View style={styles.ethicsItem}>
              <Text style={styles.ethicsEmoji}>💝</Text>
              <Text style={styles.ethicsText}>{t('welcome.ethics3Text')}</Text>
            </View>
            <View style={styles.ethicsItem}>
              <Text style={styles.ethicsEmoji}>🤝</Text>
              <Text style={styles.ethicsText}>{t('welcome.ethics4Text')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Boutons d'action : Ces boutons ne sont plus le premier point d'entrée pour les permissions */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/create-account')}
        >
          <Text style={styles.primaryButtonText}>{t('welcome.startButton')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryButtonText}>{t('welcome.alreadyAccountButton')}</Text>
        </TouchableOpacity>

        {/* Bouton d'accès maître discret */}
        <TouchableOpacity
          style={styles.masterButton}
          onPress={() => router.push('/(auth)/master-login')}
        >
          <Crown size={16} color="#8B7355" />
          <Text style={styles.masterButtonText}>{t('welcome.developerAccess')}</Text>
        </TouchableOpacity>
      </View>

      {/* Modal pour la demande de localisation */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => handleLocationChoice('later')}
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
