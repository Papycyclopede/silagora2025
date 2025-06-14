import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Alert,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  ViewStyle,
} from 'react-native';
// Note: Settings icône n'est pas importée ici mais utilisée dans les styles. Assurez-vous de l'importer si elle est manquante.
import { CreditCard as Edit3, Eye, RefreshCw, ShoppingBag, Play, Eraser, Navigation, ZoomIn, ZoomOut, Layers, Pause, Waves, Gift, X, Settings } from 'lucide-react-native'; // Ajout de Settings ici
import OptimizedMapView, { MapViewActions } from '@/components/OptimizedMapView';
import SouffleModal from '@/components/SouffleModal';
import PurchaseModal from '@/components/PurchaseModal';
import NotificationSystem from '@/components/NotificationSystem';
import SouffleRevealAnimation from '@/components/SouffleRevealAnimation';
import ImmersiveAudioManager from '@/components/ImmersiveAudioManager';
import SpatialAudioVisualizer from '@/components/SpatialAudioVisualizer';
import { useLocation } from '@/contexts/LocationContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import type { Souffle } from '@/types/souffle';
import { isWithinRevealDistance, calculateDistance } from '@/utils/distance';
import { getBackgroundById } from '@/utils/backgrounds';
import { getStickerById } from '@/utils/stickers';
import { getEmotionDisplay } from '@/utils/emotionUtils';

const { width } = Dimensions.get('window');

const baseControlButtonStyles: ViewStyle = {
  width: 48,
  height: 48,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(139, 125, 107, 0.15)',
  shadowColor: '#5D4E37',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
};

export default function SouffleApp() {
  const [showSouffleModal, setShowSouffleModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [selectedSouffle, setSelectedSouffle] = useState<Souffle | null>(null);
  const [mode, setMode] = useState<'read' | 'write'>('read');

  const mapViewRef = useRef<MapViewActions>(null);

  // MODIFIÉ: Ajout de isLocationReady
  const { location, loading: locationLoading, error: locationError, requestLocation, permissionPermanentlyDenied, isLocationReady } = useLocation();
  const { souffles, loading: souffleLoading, refreshSouffles, clearSimulatedSouffles, suspendedTickets, claimSuspendedTicket, revealSouffle } = useSouffle();
  const { t } = useLanguage();
  const { user, spendTicket, isAuthenticated } = useAuth();

  const {
    settings: audioSettings,
    playInteractionSound,
    isAudioReady,
    initAudio, // Note: initAudio ne fait rien dans AudioContext pour la démo
    playAmbientSound, // Note: playAmbientSound ne fait rien dans AudioContext pour la démo
  } = useAudio();

  const {
    notifications,
    removeNotification,
    showSuccess,
    showError,
    showMagic,
    showInfo
  } = useNotifications();

  // Console log pour vérifier la disponibilité des fonctions de la carte
  useEffect(() => {
    if (mapViewRef.current) {
        console.log('index.tsx: mapViewRef.current a locateMe:', !!mapViewRef.current.locateMe);
        console.log('index.tsx: mapViewRef.current a zoomIn:', !!mapViewRef.current.zoomIn);
    }
  }, [mapViewRef.current]);

  const handleSouffleRevealed = (souffle: Souffle) => {
    setSelectedSouffle(souffle);
    setShowRevealAnimation(true);
    showMagic(t('souffleRevealedTitle'), t('souffleRevealedMessage'), { duration: 3000 });
  };

  const handleMarkerPress = useCallback(async (souffle: Souffle) => {
    if (mode !== 'read' || !location) return; // S'assurer que 'location' est valide ici
    playInteractionSound('navigate');

    // Récupérer l'état le plus récent du souffle depuis le contexte pour éviter les problèmes de stale closure.
    const currentSouffleState = souffles.find(s => s.id === souffle.id) || souffle;

    if (currentSouffleState.isRevealed) {
      setSelectedSouffle(currentSouffleState);
      return;
    }

    const canReveal = isWithinRevealDistance(location.latitude, location.longitude, currentSouffleState.latitude, currentSouffleState.longitude);

    if (canReveal) {
      await revealSouffle(currentSouffleState.id);
      onSouffleRevealed?.({ ...currentSouffleState, isRevealed: true });
      setSelectedSouffle({ ...currentSouffleState, isRevealed: true });
    } else {
      if (!isAuthenticated) {
        Alert.alert(t('common.functionalityReserved'), t('common.accountRequiredForDistantReveal'));
        return;
      }

      const distance = Math.round(calculateDistance(location.latitude, location.longitude, currentSouffleState.latitude, currentSouffleState.longitude));
      const ticketCount = user?.ticketCount || 0;

      Alert.alert(
        t('common.tooFarToRevealTitle'),
        t('common.tooFarToRevealMessage', { distance, ticketCount }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.useOneTicket'),
            onPress: async () => {
              if (ticketCount > 0) {
                const ticketSpent = await spendTicket();
                if (ticketSpent) {
                  await revealSouffle(currentSouffleState.id);
                  handleSouffleRevealed({ ...currentSouffleState, isRevealed: true });
                  Alert.alert(
                    t('common.souffleRevealed'),
                    t('common.ticketsRemaining', { count: (user?.ticketCount || 1) - 1 })
                  );
                }
              } else {
                Alert.alert(t('common.ticketsExhausted'), t('common.visitShopForMoreTickets'));
              }
            },
            style: 'default'
          }
        ]
      );
    }
  }, [mode, location, isAuthenticated, user, t, revealSouffle, onSouffleRevealed, spendTicket, playInteractionSound, souffles]);

  const onSouffleRevealedCallback = useCallback((souffle: Souffle) => {
    handleSouffleRevealed(souffle);
  }, [handleSouffleRevealed]);

  const handleWriteMode = () => {
    if (!location) {
      showError(t('locationRequired'), t('locationRequiredForDeposit'));
      Alert.alert(
        t('locationRequired'),
        t('locationRequiredForDeposit'),
        [{ text: t('later'), style: 'cancel' }, { text: t('activate'), onPress: requestLocation }]
      );
      return;
    }
    setMode('write');
    setShowSouffleModal(true);
  };

  const handleSouffleModalClose = () => {
    setShowSouffleModal(false);
    setMode('read'); // Revenir en mode lecture après la fermeture
  };

  const handleRetryLocation = async () => {
    // Si la permission est définitivement refusée, guider l'utilisateur vers les paramètres de l'OS.
    if (permissionPermanentlyDenied) {
      Alert.alert(
        t('locationPermissionDeniedTitle'),
        t('locationPermissionDeniedMessage'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('openSettings'), onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    // Tenter de redemander la permission ou d'obtenir la position si elle n'est pas encore là
    try {
      showInfo(t('locating'), t('prepareContemplativeSpace'));
      await requestLocation(); // Ceci va déclencher la pop-up de permission si nécessaire, ou chercher la position.
      await refreshSouffles(); // Rafraîchir les souffles après avoir potentiellement une nouvelle position
      if (location) { // Vérifier si la localisation est devenue disponible
        showSuccess(t('locationFound'), t('spaceReady'));
      } else {
        showError(t('locationErrorTitle'), t('locationErrorMessage'));
      }
    } catch (error) {
      console.error('Erreur lors de la relance de localisation:', error);
      showError(t('locationErrorTitle'), t('locationErrorMessage'));
    }
  };

  const handlePurchase = async (itemId: string) => {
    try {
      showInfo(t('processing'), t('preparingPurchase'));
      console.log('Achat simulé:', itemId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSuccess(t('purchaseSuccess'), t('newOrnamentsAvailable'));
      return Promise.resolve();
    } catch (error) {
      showError(t('purchaseErrorTitle'), t('purchaseErrorMessage'));
      throw error;
    }
  };

  const handleClearMap = () => {
    playInteractionSound('navigate');
    Alert.alert(
      t('clearSimulatedSoufflesTitle'),
      t('clearSimulatedSoufflesMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('clear'),
          style: 'destructive',
          onPress: async () => {
            await clearSimulatedSouffles();
            showSuccess(t('mapCleared'), t('mapClearedMessage'));
          }
        }
      ]
    );
  };

  const handleLocateMe = () => {
    mapViewRef.current?.locateMe();
  };
  const handleZoomIn = () => {
    mapViewRef.current?.zoomIn();
  };
  const handleZoomOut = () => {
    mapViewRef.current?.zoomOut();
  };
  const handleToggleMapType = () => {
    mapViewRef.current?.toggleMapType();
  };
  const handleToggleSimulation = () => {
    mapViewRef.current?.toggleSimulation();
  };
  const handleToggleTrails = () => {
    mapViewRef.current?.toggleTrails();
  };
  const handleRegenerateSimulation = () => {
    mapViewRef.current?.regenerateSimulation();
  };

  const getTimeAgo = useCallback((date: Date): string => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("justNow");
    if (minutes < 60) return t("minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    return t("hoursAgo", { count: hours });
  }, [t]);

  const modalBackground = selectedSouffle ? getBackgroundById(selectedSouffle.backgroundId) : null;
  const showPremiumModal = modalBackground?.source && modalBackground?.shape === 'square';

  const renderModalContent = useCallback(() => {
    const isPremium = !!(showPremiumModal && modalBackground?.source);
    return (
      <View style={[
        styles.modalTextContainer,
        isPremium ? styles.modalTextContainerPremium : undefined
      ]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedSouffle(null)}>
          <X size={18} color="#8B7D6B" />
        </TouchableOpacity>
        {selectedSouffle && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[
              styles.modalTitle,
              isPremium ? styles.modalTitlePremium : undefined
            ]}>
              {t('souffleRevealed')}
            </Text>
            {selectedSouffle.content.jeMeSens && (
              <View style={styles.modalEmotionContainer}>
                <Text style={[
                  styles.modalEmotionText,
                  isPremium ? styles.modalEmotionTextPremium : undefined
                ]}>
                  {getEmotionDisplay(selectedSouffle.content.jeMeSens)?.emoji} {t(`emotions.${selectedSouffle.content.jeMeSens}`)}
                </Text>
              </View>
            )}
            <Text style={[
              styles.modalText,
              isPremium ? styles.modalTextPremium : undefined
            ]}>
              {selectedSouffle.content.messageLibre}
            </Text>
            {selectedSouffle.sticker && (
              <Text style={styles.modalSticker}>
                {getStickerById(selectedSouffle.sticker)?.emoji}
              </Text>
            )}
            <Text style={[
              styles.modalTime,
              isPremium ? styles.modalTimePremium : undefined
            ]}>
              {getTimeAgo(selectedSouffle.createdAt)}
            </Text>
          </ScrollView>
        )}
      </View>
    );
  }, [selectedSouffle, showPremiumModal, modalBackground, getTimeAgo, t]);

  return (
    <ImageBackground source={require('../../assets/images/fond.png')} style={styles.backgroundImage}>
      <SafeAreaView style={styles.container}>
        <ImmersiveAudioManager currentMode={mode} selectedSouffle={selectedSouffle} />
        <SpatialAudioVisualizer isVisible={audioSettings.enabled && audioSettings.spatialAudio} intensity={mode === 'write' ? 0.8 : 0.5} />
        <NotificationSystem notifications={notifications} onDismiss={removeNotification} />
        <SouffleRevealAnimation visible={showRevealAnimation} onComplete={() => setShowRevealAnimation(false)} />

        <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClearMap}>
                <Eraser size={16} color="#8B7D6B" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
                <Text style={styles.title}>{t('title')}</Text>
                <Text style={styles.subtitle}>{t('subtitle')}</Text>
                <View style={styles.decorativeLine} />
            </View>
            <TouchableOpacity style={styles.shopButton} onPress={() => { playInteractionSound('navigate'); setShowPurchaseModal(true); }}>
                <ShoppingBag size={16} color="#8B7D6B" />
            </TouchableOpacity>
        </View>

        <View style={styles.mainContainer}>
          {/* MODIFIÉ : Affiche OptimizedMapView si ses composants sont chargés, sinon l'overlay. */}
          {/* OptimizedMapView gère lui-même l'overlay si la localisation n'est pas là. */}
          <View style={styles.mapWrapper}>
            <OptimizedMapView
              ref={mapViewRef}
              mode={mode}
              onSouffleRevealed={onSouffleRevealedCallback} // Utilisez la version useCallback ici
            />
          </View>

          <View style={styles.controlBar}>
            {/* Les boutons de contrôle ne sont affichés que si la localisation est disponible. */}
            {location && (
              <>
                <TouchableOpacity style={styles.controlButtonCircle} onPress={handleLocateMe}>
                    <Navigation size={20} color="#5D4E37" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButtonCircle} onPress={handleZoomIn}>
                    <ZoomIn size={20} color="#5D4E37" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButtonCircle} onPress={handleZoomOut}>
                    <ZoomOut size={20} color="#5D4E37" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButtonCircle} onPress={handleToggleMapType}>
                    <Layers size={20} color="#5D4E37" />
                </TouchableOpacity>

                <View style={styles.separator} />

                <TouchableOpacity style={styles.controlButtonPinkSquare} onPress={handleToggleSimulation}>
                    <Play size={18} color="#4D3B2F" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButtonPinkSquare} onPress={handleToggleTrails}>
                    <Waves size={18} color="#4D3B2F" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButtonPinkSquare} onPress={handleRegenerateSimulation}>
                    <RefreshCw size={18} color="#4D3B2F" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonActiveColor,
                !location && styles.disabledButton // Désactiver le bouton "composer" si pas de localisation
              ]}
              onPress={handleWriteMode}
              disabled={!location} // Rendre le bouton réellement non cliquable si pas de localisation
            >
              <Edit3 size={16} color={'#5D4E37'} />
              <Text style={[styles.buttonText, { color: '#5D4E37', fontSize: 16 }]}>{t('write')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statusIndicator}>
            <View style={styles.statusIconContainer}>
              <View style={[styles.breathingDot, audioSettings.enabled && audioSettings.contextualSounds && styles.breathingDotActive]} />
            </View>
            {/* Logique d'affichage du statut de localisation plus détaillée */}
            {location ? (
                <Text style={styles.statusText}>
                    {mode === 'read' ? t('approachAura') : t('chooseLocation')}
                </Text>
            ) : isLocationReady ? ( // Si isLocationReady est true mais pas de location
                 <View style={styles.locationErrorSection}>
                    <Text style={styles.locationErrorText}>
                        {permissionPermanentlyDenied ? t('locationPermissionDeniedPermanent') : locationError || t('locationRequiredToExplore')}
                    </Text>
                    {!locationLoading && !permissionPermanentlyDenied && (
                        <TouchableOpacity style={styles.locationRetryButton} onPress={handleRetryLocation}>
                            <RefreshCw size={12} color="#8B7D6B" />
                            <Text style={styles.locationRetryButtonText}>{t('retry')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : ( // Si isLocationReady est false, on est encore en phase de démarrage du contexte de localisation
                <Text style={styles.statusText}>{t('locating')}</Text>
            )}
          </View>
        </View>

        <SouffleModal visible={showSouffleModal} onClose={handleSouffleModalClose} />
        <PurchaseModal visible={showPurchaseModal} onClose={() => { playInteractionSound('navigate'); setShowPurchaseModal(false); }} onPurchase={handlePurchase} />

        <Modal visible={!!selectedSouffle} transparent animationType="fade" onRequestClose={() => setSelectedSouffle(null)}>
          <TouchableOpacity
            style={styles.modalOverlaySouffle}
            activeOpacity={1}
            onPress={() => setSelectedSouffle(null)}
          >
            {showPremiumModal && modalBackground?.source ? (
                <ImageBackground source={modalBackground.source} style={[styles.modalContentBaseSouffle, styles.modalContentSquareSouffle]} imageStyle={{ borderRadius: 25 }}>
                    {renderModalContent()}
                </ImageBackground>
            ) : (
                <View style={[styles.modalContentBaseSouffle, styles.modalContentOptimizedSouffle]}>
                    {renderModalContent()}
                </View>
            )}
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, resizeMode: 'cover', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 20, paddingTop: Platform.OS === 'ios' ? 15 : 40, backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(139, 125, 107, 0.08)' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 40, fontFamily: 'Satisfy-Regular', color: '#687fb2', letterSpacing: 1.2, marginBottom: 8, fontStyle: 'italic' },
  subtitle: { fontSize: 11, fontFamily: 'Quicksand-Regular', color: '#8B7D6B', textAlign: 'center', letterSpacing: 0.5, marginBottom: 16, fontStyle: 'italic', lineHeight: 16, paddingHorizontal: 20 },
  decorativeLine: { width: 80, height: 1, backgroundColor: 'rgba(139, 125, 107, 0.2)', marginBottom: 12 },
  shopButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  mapWrapper: {
    flex: 1,
    overflow: 'hidden',
    margin: 10,
    marginRight: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.1)',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8
  },
  controlBar: {
    width: 70,
    paddingVertical: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  controlButtonCircle: {
    ...baseControlButtonStyles,
    backgroundColor: 'rgba(168, 200, 225, 0.8)',
    borderRadius: 24,
  },
  controlButtonPinkSquare: {
    ...baseControlButtonStyles,
    borderRadius: 12,
    backgroundColor: 'rgba(252, 230, 236, 0.8)',
  },
  controlButtonSquare: {
    ...baseControlButtonStyles,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 228, 188, 0.8)',
  },
  separator: {
    height: 1,
    width: '60%',
    backgroundColor: 'rgba(139, 125, 107, 0.2)',
    marginVertical: 6,
  },
  bottomBar: { backgroundColor: 'transparent', borderTopWidth: 1, borderTopColor: 'rgba(139, 125, 107, 0.08)', paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 20 : 15, paddingTop: 15 },
  actionButtons: {
    justifyContent: 'center',
    marginBottom: 15
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(139, 125, 107, 0.08)',
    width: '60%',
    alignSelf: 'center',
  },
  actionButtonActiveColor: {
    backgroundColor: 'rgba(168, 200, 225, 0.8)',
    borderColor: 'rgba(168, 200, 225, 0.8)',
    shadowOpacity: 0.1,
  },
  disabledButton: { // Style pour les boutons désactivés
    opacity: 0.5,
    backgroundColor: 'rgba(139, 125, 107, 0.3)',
  },
  buttonText: {
    fontSize: 10,
    fontFamily: 'Quicksand-Regular',
    marginTop: 4,
    letterSpacing: 0.3,
    fontStyle: 'italic'
  },
  statusIndicator: { backgroundColor: 'rgba(255, 255, 255, 0.8)', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.08)' },
  statusIconContainer: { marginRight: 12 },
  breathingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A8C8E1', opacity: 0.6 },
  breathingDotActive: { opacity: 1, shadowColor: '#A8C8E1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 4 },
  statusText: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic', letterSpacing: 0.3, flex: 1, lineHeight: 16 },
  locationErrorSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  locationErrorText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#C17B5C',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 16,
  },
  locationRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 125, 107, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.2)',
  },
  locationRetryButtonText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Medium',
    color: '#8B7D6B',
    marginLeft: 6,
  },
  locationRetryButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A8C8E1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationRetryButtonTextLarge: {
    fontSize: 15,
    fontFamily: 'Quicksand-Medium',
    color: '#F9F7F4',
    marginLeft: 8,
  },
  locationOverlay: { // Overlay qui se superpose sur la carte si pas de localisation
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 247, 244, 0.95)', // Un fond opaque par-dessus la carte si pas de localisation
    zIndex: 4, // Juste en dessous du mapUnavailableOverlayContainer
  },
  locationLoadingOverlay: { // Overlay pour le chargement de la localisation
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 247, 244, 0.95)',
    zIndex: 4,
  },
  locationLoadingText: {
    fontSize: 15,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  mapUnavailableOverlayContainer: { // Nouveau conteneur pour l'overlay de MapView indisponible (prend toute la place du MapWrapper)
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    margin: 10,
    marginRight: 5,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.1)',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden', // Pour que le borderRadius s'applique
  },
  mapUnavailableOverlay: { // Styles pour l'overlay de carte non disponible (prend toute la place du conteneur)
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F7F4',
    padding: 20,
  },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(193, 123, 92, 0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
  errorText: { fontSize: 9, fontFamily: 'Quicksand-Regular', color: '#C17B5C', flex: 1, marginRight: 8, fontStyle: 'italic' },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 125, 107, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  retryText: { fontSize: 8, fontFamily: 'Quicksand-Regular', color: '#8B7D6B', marginLeft: 4, fontStyle: 'italic' },
  statsContainer: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  breathDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A8C8E1', marginRight: 8, opacity: 0.7 },
  statText: { fontSize: 10, fontFamily: 'Quicksand-Regular', color: '#8B7D6B', fontStyle: 'italic' },
  modalOverlaySouffle: { flex: 1, backgroundColor: 'rgba(93, 78, 55, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContentBaseSouffle: { borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.2)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12, overflow: 'hidden' },
  modalContentOptimizedSouffle: { backgroundColor: '#F9F7F4', borderRadius: 25, maxWidth: 320, width: '100%', maxHeight: '80%' },
  modalContentSquareSouffle: { width: width * 0.9, height: width * 0.9, maxWidth: 400, maxHeight: 400, borderRadius: 25, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  modalTextContainer: { position: 'relative', width: '90%', maxHeight: '90%', backgroundColor: 'rgba(249, 247, 244, 0.85)', padding: 28, borderRadius: 20, borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.7)' },
  closeButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139, 125, 107, 0.1)', borderRadius: 16, zIndex: 10 },
  modalTitle: { fontSize: 15, fontFamily: 'Georgia', color: '#5D4E37', textAlign: 'center', marginBottom: 16, fontStyle: 'italic', paddingHorizontal: 20, marginTop: 30 },
  modalEmotionContainer: { backgroundColor: 'rgba(139, 125, 107, 0.08)', borderRadius: 12, padding: 10, marginBottom: 16, alignSelf: 'center' },
  modalEmotionText: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic' },
  modalText: { fontSize: 13, fontFamily: 'Georgia', color: '#5D4E37', textAlign: 'center', lineHeight: 20, marginBottom: 16, fontStyle: 'italic' },
  modalSticker: { fontSize: 26, textAlign: 'center', marginBottom: 16 },
  modalTime: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic' },
  modalTextContainerPremium: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    padding: 0,
  },
  modalTitlePremium: {
    fontSize: 21,
    color: '#FFF',
    textShadowColor: '#000B',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  modalEmotionTextPremium: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: '#000B',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  modalTextPremium: {
    fontSize: 26,
    color: '#FFF',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    textShadowColor: '#000B',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
    marginBottom: 16,
  },
  modalTimePremium: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: '#000A',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginTop: 5,
  },
});
