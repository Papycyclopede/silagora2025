import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Linking,
  Platform, // Import Platform for conditional paddingTop
  Image, // Import Image
} from 'react-native';
import { Globe, Volume2, Moon, MapPin, Shield, Bell, Archive, Info, RotateCcw, ChevronRight, X, LogOut, User, UserPlus, ShoppingBag, CircleHelp as HelpCircle } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import PurchaseModal from '../../components/PurchaseModal'; // Assurez-vous que le chemin est correct
import { AVAILABLE_BACKGROUNDS, SouffleBackground } from '@/utils/backgrounds'; // Importez les backgrounds

interface SettingCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function SettingCard({ icon, title, subtitle, children }: SettingCardProps) {
  return (
    <View style={styles.settingCard}>
      <View style={styles.settingHeader}>
        <View style={styles.settingIcon}>{icon}</View>
        <View style={styles.settingTitleContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {/* Correction potentielle ici: assurer que subtitle est une chaîne simple */}
          <Text style={styles.settingSubtitle}>{subtitle}</Text> 
        </View>
      </View>
      <View style={styles.settingContent}>{children}</View>
    </View>
  );
}

interface CustomSliderProps { 
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step: number;
  unit: string;
}

function CustomSlider({ value, onValueChange, minimumValue, maximumValue, step, unit }: CustomSliderProps) {
  const percentage = Math.min(100, Math.max(0, ((value - minimumValue) / (maximumValue - minimumValue)) * 100));

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${percentage}%` }]} />
        <View style={[styles.sliderThumb, { left: `${percentage}%` }]} /> 
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{`${minimumValue}${unit}`}</Text> 
        <Text style={styles.sliderValue}>{`${value}${unit}`}</Text> 
        <Text style={styles.sliderLabel}>{`${maximumValue}${unit}`}</Text> 
      </View>
      <View style={styles.sliderButtons}>
        {[20, 50, 80, 100].map((val) => (
          // Correction potentielle ici: pas d'espace ou de retour à la ligne direct entre les balises
          <TouchableOpacity
            key={val}
            style={[styles.sliderButton, value === val && styles.activeSliderButton]}
            onPress={() => onValueChange(val)}
          ><Text style={[styles.sliderButtonText, value === val && styles.activeSliderButtonText]}>
              {`${val}${unit}`} 
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t, currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const { user, logout, isAuthenticated } = useAuth(); 

  // États des paramètres avec valeurs par défaut
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(50);
  const [soundTheme, setSoundTheme] = useState('breeze');
  const [darkMode, setDarkMode] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [breathRadius, setBreathRadius] = useState(100);
  const [hideLocation, setHideLocation] = useState(true);
  const [moderatedReading, setModeratedReading] = useState(true);
  const [participateModeration, setParticipateModeration] = useState(false);
  const [notifyWhenRead, setNotifyWhenRead] = useState(true);
  const [notifyNearby, setNotifyNearby] = useState(false);
  const [onlyWhenMoving, setOnlyWhenMoving] = useState(true);
  const [saveDrafts, setSaveDrafts] = useState(true);
  const [keepHistory, setKeepHistory] = useState(true);

  // États pour les modales
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSoundThemeModal, setShowSoundThemeModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showModerationInfo, setShowModerationInfo] = useState(false);

  // Thèmes sonores disponibles
  const soundThemes = [
    { id: 'breeze', name: t('breeze'), emoji: '🌬️', description: t('breezeDesc') },
    { id: 'ink', name: t('ink'), emoji: '🫧', description: t('inkDesc') },
    { id: 'night', name: t('night'), emoji: '🌙', description: t('nightDesc') },
    { id: 'silence', name: t('totalSilence'), emoji: '🔇', description: t('totalSilenceDesc') },
  ];

  // Charger les paramètres sauvegardés au démarrage
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('@souffle:settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setSoundEnabled(parsed.soundEnabled ?? true);
        setSoundVolume(parsed.soundVolume ?? 50);
        setSoundTheme(parsed.soundTheme ?? 'breeze');
        setDarkMode(parsed.darkMode ?? false);
        setAutoMode(parsed.autoMode ?? true);
        setBreathRadius(parsed.breathRadius ?? 100);
        setHideLocation(parsed.hideLocation ?? true);
        setModeratedReading(parsed.moderatedReading ?? true);
        setParticipateModeration(parsed.participateModeration ?? false);
        setNotifyWhenRead(parsed.notifyWhenRead ?? true);
        setNotifyNearby(parsed.notifyNearby ?? false);
        setOnlyWhenMoving(parsed.onlyWhenMoving ?? true);
        setSaveDrafts(parsed.saveDrafts ?? true);
        setKeepHistory(parsed.keepHistory ?? true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  };

  // Sauvegarder les paramètres dans AsyncStorage
  const saveSettings = async () => {
    try {
      const settingsToSave = {
        soundEnabled,
        soundVolume,
        soundTheme,
        darkMode,
        autoMode,
        breathRadius,
        hideLocation,
        moderatedReading,
        participateModeration,
        notifyWhenRead,
        notifyNearby,
        onlyWhenMoving,
        saveDrafts,
        keepHistory,
      };
      await AsyncStorage.setItem('@souffle:settings', JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
    }
  };

  // Effet pour sauvegarder automatiquement les changements des paramètres
  useEffect(() => {
    saveSettings();
  }, [
    soundEnabled, soundVolume, soundTheme, darkMode, autoMode, breathRadius,
    hideLocation, moderatedReading, participateModeration, notifyWhenRead,
    notifyNearby, onlyWhenMoving, saveDrafts, keepHistory
  ]);

  // Handler pour changer la langue
  const handleLanguageChange = async (languageCode: string) => { 
    await changeLanguage(languageCode);
    setShowLanguageModal(false);
  };

  // Handlers pour la navigation et l'authentification
  const handleCreateAccount = () => {
    router.push('/(auth)/create-account'); 
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  // Handler pour l'achat simulé
  const handlePurchase = async (itemId: string) => {
    console.log('Achat simulé:', itemId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return Promise.resolve();
  };

  // Handler pour réinitialiser tous les paramètres aux valeurs par défaut
  const handleResetSettings = () => {
    Alert.alert(
      t('settings.resetSettingsTitle'),
      t('settings.resetSettingsMessage'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.clear'),
          style: 'destructive',
          onPress: async () => {
            setSoundEnabled(true);
            setSoundVolume(50);
            setSoundTheme('breeze');
            setDarkMode(false);
            setAutoMode(true);
            setBreathRadius(100);
            setHideLocation(true);
            setModeratedReading(true);
            setParticipateModeration(false);
            setNotifyWhenRead(true);
            setNotifyNearby(false);
            setOnlyWhenMoving(true);
            setSaveDrafts(true);
            setKeepHistory(true);

            await changeLanguage('fr');
            await AsyncStorage.removeItem('@souffle:settings');

            Alert.alert(t('settings.settingsCleared'), t('settings.settingsClearedMessage'));
          },
        },
      ]
    );
  };

  // Handler pour effacer les traces personnelles (souffles, historique)
  const handleClearTraces = () => {
    Alert.alert(
      t('settings.clearTracesTitle'),
      t('settings.clearTracesMessage'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.clear'),
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@souffle:souffles');
            await AsyncStorage.removeItem('@souffle:revealed_souffles');
            await AsyncStorage.removeItem('@souffle:user_activity'); 
            Alert.alert(t('settings.tracesCleared'), t('settings.tracesClearedMessage'));
          },
        },
      ]
    );
  };

  // Fonction utilitaire pour obtenir le nom de la langue actuelle
  const getCurrentLanguageName = () => {
    const lang = availableLanguages.find((l: { code: string; native: string; name: string }) => l.code === currentLanguage);
    return lang?.native || t('settings.languageDefault');
  };

  return (
    <View style={styles.container}>
      {/* Header de l'écran de paramètres */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('tabs.settings')}</Text>
        <Text style={styles.subtitle}>{t('settings.personalizeJourney')}</Text>
        <View style={styles.decorativeLine} />
      </View>

      {/* Contenu principal défilant des paramètres */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section Compte */}
        <SettingCard
          icon={<User size={18} color="#8B7D6B" />}
          title={t('settings.account')}
          subtitle={isAuthenticated ? t('settings.accountInfo') : t('settings.createAccountPrompt')}
        >
          {isAuthenticated && user ? (
            <>
              <View style={styles.profileInfo}>
                <Text style={styles.profileLabel}>{t('settings.contact')}</Text>
                <Text style={styles.profileValue}>
                  {user.email || user.phone}
                </Text>
              </View>
              {user.pseudo && (
                <View style={styles.profileInfo}>
                  <Text style={styles.profileLabel}>{t('settings.pseudo')}</Text>
                  <Text style={styles.profileValue}>{user.pseudo}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileLabel}>{t('settings.memberSince')}</Text>
                <Text style={styles.profileValue}>
                  {user.createdAt.toLocaleDateString(currentLanguage)}
                </Text>
              </View>

              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut size={14} color="#C17B5C" />
                <Text style={styles.logoutButtonText}>{t('settings.logout')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.anonymousSection}>
              <Text style={styles.anonymousText}>
                {t('settings.anonymousText')}
              </Text>
              <View style={styles.anonymousFeatures}>
                <Text>{t('settings.anonymousFeature1')}</Text>
                <Text>{t('settings.anonymousFeature2')}</Text>
                <Text>{t('settings.anonymousFeature3')}</Text>
                <Text>{t('settings.anonymousFeature4')}</Text>
              </View>

              <View style={styles.accountButtons}>
                <TouchableOpacity style={styles.createAccountButton} onPress={handleCreateAccount}>
                  <UserPlus size={14} color="#F9F7F4" />
                  <Text style={styles.createAccountButtonText}>{t('settings.createAccount')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                  <Text style={styles.loginButtonText}>{t('settings.alreadyHaveAccount')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SettingCard>

        {/* Section Boutique */}
        <SettingCard
          icon={<ShoppingBag size={18} color="#8B7D6B" />}
          title={t('shop.title')}
          subtitle={t('shop.subtitle')}
        >
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => setShowPurchaseModal(true)}
          >
            <Text style={styles.shopButtonText}>{t('settings.discoverShop')}</Text>
            <ChevronRight size={14} color="#8B7355" />
          </TouchableOpacity>
        </SettingCard>

        {/* Section Langue */}
        <SettingCard
          icon={<Globe size={18} color="#8B7D6B" />}
          title={t('settings.appLanguage')}
          subtitle={t('settings.languageSubtitle')}
        >
          <TouchableOpacity
            style={styles.languageSelector}
            onPress={() => setShowLanguageModal(true)}
          >
            <Text style={styles.languageText}>{getCurrentLanguageName()}</Text>
            <ChevronRight size={14} color="#8B7D6B" />
          </TouchableOpacity>
        </SettingCard>

        {/* Section Sons & Ambiance */}
        <SettingCard
          icon={<Volume2 size={18} color="#8B7D6B" />}
          title={t('settings.audio.title')}
          subtitle={t('settings.audio.subtitle')}
        >
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.audio.enable')}</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          {soundEnabled && (
            <>
              <View style={styles.volumeContainer}>
                <Text style={styles.volumeLabel}>{t('settings.audio.volume')}</Text>
                <CustomSlider
                  value={soundVolume}
                  onValueChange={setSoundVolume}
                  minimumValue={0}
                  maximumValue={100}
                  step={10}
                  unit="%"
                />
              </View>

              <TouchableOpacity
                style={styles.themeSelector}
                onPress={() => setShowSoundThemeModal(true)}
              >
                <Text style={styles.themeSelectorLabel}>{t('settings.audio.theme')}</Text>
                <View style={styles.themeSelectorValue}>
                  <Text style={styles.themeSelectorEmoji}>
                    {soundThemes.find(theme => theme.id === soundTheme)?.emoji}
                  </Text>
                  <Text style={styles.themeSelectorText}>
                    {soundThemes.find(theme => theme.id === soundTheme)?.name}
                  </Text>
                  <ChevronRight size={14} color="#8B7D6B" />
                </View>
              </TouchableOpacity>
            </>
          )}
        </SettingCard>

        {/* Section Mode visuel */}
        <SettingCard
          icon={<Moon size={18} color="#8B7D6B" />}
          title={t('settings.visualMode')}
          subtitle={t('settings.visualSubtitle')}
        >
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.enableNightMode')}</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.adaptToDaylight')}</Text>
            <Switch
              value={autoMode}
              onValueChange={setAutoMode}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          <Text style={styles.featureNote}>
            {t('settings.visualModeNote')}
          </Text>
        </SettingCard>

        {/* Section Rayon de souffle */}
        <SettingCard
          icon={<MapPin size={18} color="#8B7D6B" />}
          title={t('settings.breathRadius')}
          subtitle={t('settings.radiusSubtitle')}
        >
          <CustomSlider
            value={breathRadius}
            onValueChange={setBreathRadius}
            minimumValue={20}
            maximumValue={500}
            step={10}
            unit="m"
          />
        </SettingCard>

        {/* Section Confidentialité & modération */}
        <SettingCard
          icon={<Shield size={18} color="#8B7D6B" />}
          title={t('settings.privacy')}
          subtitle={t('settings.privacySubtitle')}
        >
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.hideExactLocation')}</Text>
            <Switch
              value={hideLocation}
              onValueChange={setHideLocation}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.moderatedReading')}</Text>
            <Switch
              value={moderatedReading}
              onValueChange={setModeratedReading}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          {isAuthenticated && (
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.switchLabel}>{t('settings.participateModeration')}</Text>
                <TouchableOpacity onPress={() => setShowModerationInfo(true)}>
                  <HelpCircle size={14} color="#8B7D6B" />
                </TouchableOpacity>
              </View>
              <Switch
                value={participateModeration}
                onValueChange={setParticipateModeration}
                trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
                thumbColor="#F9F7F4"
              />
            </View>
          )}
        </SettingCard>

        {/* Section Notifications */}
        <SettingCard
          icon={<Bell size={18} color="#8B7D6B" />}
          title={t('settings.notifications')}
          subtitle={t('settings.notificationsSubtitle')}
        >
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.notifyWhenRead')}</Text>
            <Switch
              value={notifyWhenRead}
              onValueChange={setNotifyWhenRead}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.notifyNearby')}</Text>
            <Switch
              value={notifyNearby}
              onValueChange={setNotifyNearby}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          {notifyNearby && (
            <View style={[styles.switchRow, styles.indentedRow]}>
              <Text style={styles.switchLabel}>{t('settings.onlyWhenMoving')}</Text>
              <Switch
                value={onlyWhenMoving}
                onValueChange={setOnlyWhenMoving}
                trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
                thumbColor="#F9F7F4"
              />
            </View>
          )}
        </SettingCard>

        {/* Section Historique personnel */}
        <SettingCard
          icon={<Archive size={18} color="#8B7D6B" />}
          title={t('settings.personalHistory')}
          subtitle={t('settings.historySubtitle')}
        >
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.saveDrafts')}</Text>
            <Switch
              value={saveDrafts}
              onValueChange={setSaveDrafts}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('settings.keepHistory')}</Text>
            <Switch
              value={keepHistory}
              onValueChange={setKeepHistory}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          <TouchableOpacity style={styles.clearButton} onPress={handleClearTraces}>
            <Text style={styles.clearButtonText}>{t('settings.clearTraces')}</Text>
          </TouchableOpacity>
        </SettingCard>

        {/* Section À propos */}
        <SettingCard
          icon={<Info size={18} color="#8B7D6B" />}
          title={t('settings.aboutUs')}
          subtitle={t('settings.aboutSubtitle')}
        >
          <TouchableOpacity style={styles.aboutButton} onPress={() => router.push('/about')}>
            <Text style={styles.aboutButtonText}>{t('settings.readManifesto')}</Text>
            <ChevronRight size={14} color="#8B7D6B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutButton} onPress={() => Linking.openURL('https://github.com/Papycyclopede/Silagora-final')}>
            <Text style={styles.aboutButtonText}>{t('settings.openSource')}</Text>
            <ChevronRight size={14} color="#8B7D6B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutButton} onPress={() => Linking.openURL('mailto:contact@silagora.app')}>
            <Text style={styles.aboutButtonText}>{t('settings.contactModeration')}</Text>
            <ChevronRight size={14} color="#8B7D6B" />
          </TouchableOpacity>

          <Text style={styles.versionText}>{t('settings.version', { version: '1.0.0' })}</Text>
        </SettingCard>

        {/* Bouton Réinitialiser les préférences */}
        <TouchableOpacity style={styles.resetButton} onPress={handleResetSettings}>
          <RotateCcw size={14} color="#C17B5C" />
          <Text style={styles.resetButtonText}>{t('settings.resetPreferences')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Modale de sélection de la langue */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
              <X size={20} color="#8B7D6B" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('settings.appLanguage')}</Text>
            <View style={styles.placeholder} /> 
          </View>

          <ScrollView style={styles.modalContent}>
            {availableLanguages.map((lang: { code: string; native: string; name: string }) => ( 
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  currentLanguage === lang.code && styles.selectedLanguageOption,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={[
                  styles.languageOptionText,
                  currentLanguage === lang.code && styles.selectedLanguageOptionText,
                ]}>
                  {lang.native}
                </Text>
                <Text style={[
                  styles.languageOptionSubtext,
                  currentLanguage === lang.code && styles.selectedLanguageOptionSubtext,
                ]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modale de sélection du thème sonore */}
      <Modal
        visible={showSoundThemeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSoundThemeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSoundThemeModal(false)}>
              <X size={20} color="#8B7D6B" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('settings.audio.theme')}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {soundThemes.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeOption,
                  soundTheme === theme.id && styles.selectedThemeOption,
                ]}
                onPress={() => {
                  setSoundTheme(theme.id);
                  setShowSoundThemeModal(false);
                }}
              >
                <Text style={styles.themeOptionEmoji}>{theme.emoji}</Text>
                <View style={styles.themeOptionContent}>
                  <Text style={[
                    styles.themeOptionText,
                    soundTheme === theme.id && styles.selectedThemeOptionText,
                  ]}>
                    {theme.name}
                  </Text>
                  <Text style={[
                    styles.themeOptionDescription,
                    soundTheme === theme.id && styles.selectedThemeOptionDescription,
                  ]}>
                    {theme.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modale d'informations sur la modération citoyenne */}
      <Modal
        visible={showModerationInfo}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowModerationInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModal}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>{t('settings.citizenModerationTitle')}</Text>
              <TouchableOpacity onPress={() => setShowModerationInfo(false)}>
                <X size={18} color="#8B7D6B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.infoModalContent}>
              <Text style={styles.infoModalText}>
                {t('settings.citizenModerationIntro')}
              </Text>

              <Text style={styles.infoModalSubtitle}>{t('settings.howItWorksColon')}</Text>
              {/* Correction: encapsuler chaque point dans un Text pour éviter les warnings */}
              <Text style={styles.infoModalText}>
                <Text>{t('settings.moderationPoint1')}</Text>{'\n'}
                <Text>{t('settings.moderationPoint2')}</Text>{'\n'}
                <Text>{t('settings.moderationPoint3')}</Text>{'\n'}
                <Text>{t('settings.moderationPoint4')}</Text>
              </Text>

              <Text style={styles.infoModalSubtitle}>{t('settings.moderationCriteriaColon')}</Text>
              {/* Correction: encapsuler chaque point dans un Text pour éviter les warnings */}
              <Text style={styles.infoModalText}>
                <Text>{t('settings.criteriaPoint1')}</Text>{'\n'}
                <Text>{t('settings.criteriaPoint2')}</Text>{'\n'}
                <Text>{t('settings.criteriaPoint3')}</Text>{'\n'}
                <Text>{t('settings.criteriaPoint4')}</Text>
              </Text>

              <Text style={styles.infoModalNote}>
                {t('settings.moderationParticipationNote')}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.infoModalButton}
              onPress={() => setShowModerationInfo(false)}
            >
              <Text style={styles.infoModalButtonText}>{t('settings.understood')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modale d'achat */}
      <PurchaseModal
        visible={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onPurchase={handlePurchase}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20, // Ajustement pour iOS safe area
    backgroundColor: 'rgba(249, 247, 244, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 125, 107, 0.08)',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    letterSpacing: 1,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  decorativeLine: {
    width: 80,
    height: 1,
    backgroundColor: 'rgba(139, 125, 107, 0.3)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  settingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.08)',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  settingIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  settingTitleContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  settingSubtitle: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  settingContent: {
    marginLeft: 34,
  },
  anonymousSection: {
    backgroundColor: 'rgba(139, 125, 107, 0.04)',
    borderRadius: 16,
    padding: 16,
  },
  anonymousText: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    marginBottom: 10,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  anonymousFeatures: {
    fontSize: 11, // Ces styles ne sont pas nécessaires si chaque ligne est un <Text> séparé
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    marginBottom: 16,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  accountButtons: {
    gap: 10,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A8C8E1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  createAccountButtonText: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#F9F7F4',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  loginButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loginButtonText: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    textDecorationLine: 'underline',
    fontStyle: 'italic',
  },
  profileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileLabel: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
  },
  profileValue: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(193, 123, 92, 0.08)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 123, 92, 0.15)',
    marginTop: 16,
  },
  logoutButtonText: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#C17B5C',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(139, 125, 107, 0.06)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.15)',
  },
  shopButtonText: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  indentedRow: {
    marginLeft: 20,
  },
  switchLabel: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    flex: 1,
    marginRight: 16,
    fontStyle: 'italic',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(139, 125, 107, 0.06)',
    padding: 12,
    borderRadius: 16,
  },
  languageText: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
  },
  volumeContainer: {
    marginTop: 16,
  },
  volumeLabel: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  sliderContainer: {
    marginVertical: 10,
  },
  sliderTrack: {
    height: 3,
    backgroundColor: 'rgba(139, 125, 107, 0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#A8C8E1',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6, 
    width: 15,
    height: 15,
    backgroundColor: '#A8C8E1',
    borderRadius: 8,
    marginLeft: -8, 
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 9,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
  },
  sliderValue: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sliderButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(139, 125, 107, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.15)',
  },
  activeSliderButton: {
    backgroundColor: '#A8C8E1',
    borderColor: '#A8C8E1',
  },
  sliderButtonText: {
    fontSize: 9,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
  },
  activeSliderButtonText: {
    color: '#F9F7F4',
  },
  themeSelector: {
    marginTop: 16,
  },
  themeSelectorLabel: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  themeSelectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 125, 107, 0.06)',
    padding: 12,
    borderRadius: 16,
  },
  themeSelectorEmoji: {
    fontSize: 16,
    marginRight: 10,
  },
  themeSelectorText: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    flex: 1,
    fontStyle: 'italic',
  },
  themeOptionDescription: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
  },
  selectedThemeOptionDescription: {
    color: 'rgba(249, 247, 244, 0.8)',
  },
  featureNote: {
    fontSize: 10,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(139, 125, 107, 0.04)',
    borderRadius: 12,
  },
  clearButton: {
    backgroundColor: 'rgba(193, 123, 92, 0.08)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 123, 92, 0.15)',
    marginTop: 10,
  },
  clearButtonText: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#C17B5C',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  aboutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 125, 107, 0.08)',
  },
  aboutButtonText: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
  },
  versionText: {
    fontSize: 10,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(193, 123, 92, 0.06)',
    padding: 16,
    borderRadius: 18,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(193, 123, 92, 0.12)',
  },
  resetButtonText: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#C17B5C',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9F7F4',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 125, 107, 0.08)',
    backgroundColor: 'rgba(249, 247, 244, 0.98)',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
  },
  placeholder: {
    width: 20,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  languageOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.08)',
  },
  selectedLanguageOption: {
    backgroundColor: '#A8C8E1',
    borderColor: '#A8C8E1',
  },
  languageOptionText: {
    fontSize: 15,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  selectedLanguageOptionText: {
    color: '#F9F7F4',
  },
  languageOptionSubtext: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
  },
  selectedLanguageOptionSubtext: {
    color: 'rgba(249, 247, 244, 0.8)',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.08)',
  },
  selectedThemeOption: {
    backgroundColor: '#A8C8E1',
    borderColor: '#A8C8E1',
  },
  themeOptionEmoji: {
    fontSize: 22,
    marginRight: 16,
  },
  themeOptionContent: {
    flex: 1,
  },
  themeOptionText: {
    fontSize: 15,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  selectedThemeOptionText: {
    color: '#F9F7F4',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(93, 78, 55, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModal: {
    backgroundColor: '#F9F7F4',
    borderRadius: 24,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.15)',
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoModalTitle: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
  },
  infoModalContent: {
    maxHeight: 300,
  },
  infoModalText: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    lineHeight: 18,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  infoModalSubtitle: {
    fontSize: 14,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    marginBottom: 10,
    marginTop: 10,
    fontStyle: 'italic',
  },
  infoModalNote: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
    backgroundColor: 'rgba(139, 125, 107, 0.06)',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  infoModalButton: {
    backgroundColor: '#A8C8E1',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  infoModalButtonText: {
    fontSize: 15,
    fontFamily: 'Georgia',
    color: '#F9F7F4',
    fontStyle: 'italic',
  },
});