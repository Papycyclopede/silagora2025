import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  ScrollView,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Eye, Gift, X } from 'lucide-react-native';

import type MapViewType from 'react-native-maps'; 
import { Region } from 'react-native-maps';

// --- MODIFICATION CLÉ POUR LE WEB : CHARGEMENT DYNAMIQUE DE REACT-NATIVE-MAPS ---
// Ces variables seront remplies par l'import dynamique sur native.
// Sur le web, elles resteront View pour MapView et View pour Marker/Circle/Polyline.
let MapView: typeof MapViewType | React.ComponentType<any> = View;
let Marker: React.ComponentType<any> = View;
let Circle: React.ComponentType<any> = View;
let Polyline: React.ComponentType<any> = View; // Si Polyline est utilisé ailleurs

import { useLocation } from '@/contexts/LocationContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { isWithinRevealDistance, calculateDistance } from '@/utils/distance';
import { getStickerById } from '@/utils/stickers';
import { getBackgroundById } from '@/utils/backgrounds';
import { getEmotionDisplay } from '@/utils/emotionUtils';
import { AnimatedHalo, WaveEffect, FloatingParticle } from './MapAnimations';
import type { Souffle, SuspendedTicket } from '@/types/souffle';

const { width } = Dimensions.get('window');

// --- Interfaces et Constantes (inchangées) ---
interface OptimizedMapViewProps {
  mode: 'read' | 'write';
  onSouffleRevealed?: (souffle: Souffle) => void;
}

export interface MapViewActions {
  locateMe: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleMapType: () => void;
  toggleSimulation: () => void; 
  toggleTrails: () => void; 
  regenerateSimulation: () => void; 
}

const MIN_ZOOM = 8;
const MAX_ZOOM = 20;
const DEFAULT_ZOOM = 16;
const calculateDelta = (zoom: number) => Math.max(0.001, 360 / Math.pow(2, zoom));

// Composant pour les clusters (groupements de souffles)
const SouffleCluster = React.memo(({ cluster, onPress }: { cluster: any; onPress: (clusterId: string, children: any[]) => void }) => (
  // Marker sera un View factice sur le web, donc cela ne causera pas d'erreur.
  <Marker
    key={`cluster-${cluster.id}`}
    coordinate={cluster.geometry.coordinates}
    onPress={() => onPress(cluster.id, cluster.properties.cluster_children)}
  >
    <View style={styles.clusterMarker}>
      <Text style={styles.clusterCount}>{cluster.properties.point_count}</Text>
      <Text style={styles.clusterLabel}>souffles</Text>
    </View>
  </Marker>
));

// Composant pour les marqueurs de souffle individuels
const MemoizedSouffleMarker = React.memo(({ souffle, location, onPress }: { souffle: Souffle; location: any; onPress: (souffle: Souffle) => void }) => {
  const canReveal = useMemo(() => location ? isWithinRevealDistance(location.latitude, location.longitude, souffle.latitude, souffle.longitude) : false, [location, souffle]);
  const sticker = useMemo(() => souffle.sticker ? getStickerById(souffle.sticker) : null, [souffle.sticker]);
  const background = useMemo(() => getBackgroundById(souffle.backgroundId), [souffle.backgroundId]);
  const isSquare = background?.shape === 'square';

  // Marker sera un View factice sur le web. Sur native, il est un vrai MapView.Marker.
  return (
    <Marker identifier={souffle.id} coordinate={souffle} onPress={() => onPress(souffle)}>
      <AnimatedHalo isActive={canReveal} canReveal={canReveal && !souffle.isRevealed} isRevealed={souffle.isRevealed}>
        <WaveEffect isActive={canReveal && !souffle.isRevealed}>
          <ImageBackground
            source={background.source}
            style={[
              styles.souffleMarkerBase,
              isSquare ? styles.souffleMarkerSquare : styles.souffleMarkerCircle,
              souffle.isRevealed ? styles.souffleMarkerRevealed : (canReveal ? styles.souffleMarkerCanReveal : styles.souffleMarkerHidden)
            ]}
            imageStyle={isSquare ? { borderRadius: 6 } : { borderRadius: 24 }}
          >
            <View style={styles.markerContentContainer}>
              <Text style={styles.souffleMarkerEmoji}>{souffle.isRevealed ? (sticker?.emoji || '💬') : '🤫'}</Text>
              {canReveal && !souffle.isRevealed && (
                <FloatingParticle>
                  <View style={styles.canRevealMarkerBadge}><Eye size={10} color="#F9F7F4" /></View>
                </FloatingParticle>
              )}
            </View>
          </ImageBackground>
        </WaveEffect>
      </AnimatedHalo>
    </Marker>
  );
});

// Composant pour les marqueurs de tickets suspendus
const MemoizedTicketMarker = React.memo(({ ticket, location, onPress }: { ticket: SuspendedTicket; location: any; onPress: (ticket: SuspendedTicket) => void }) => {
  const canReveal = useMemo(() => location ? isWithinRevealDistance(location.latitude, location.longitude, ticket.latitude, ticket.longitude) : false, [location, ticket]);

  return (
    <Marker key={ticket.id} coordinate={ticket} tracksViewChanges={false}>
      <AnimatedHalo isActive={true} canReveal={canReveal}>
        <TouchableOpacity style={styles.ticketMarker} onPress={() => onPress(ticket)}>
          <Gift size={20} color="#C17B5C" />
        </TouchableOpacity>
      </AnimatedHalo>
    </Marker>
  );
});


// --- Composant Principal OptimizedMapView ---
const OptimizedMapView = forwardRef<MapViewActions, OptimizedMapViewProps>(({ mode, onSouffleRevealed }, ref) => {
  const { location, loading: locationLoading, error: locationError, hasPermission, permissionPermanentlyDenied } = useLocation();
  const { souffles, revealSouffle, suspendedTickets, claimSuspendedTicket } = useSouffle();
  const { t } = useLanguage(); 
  const { playInteractionSound } = useAudio();
  const { user, spendTicket, isAuthenticated } = useAuth();
  
  const [selectedSouffle, setSelectedSouffle] = useState<Souffle | null>(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const internalMapRef = useRef<MapViewType | null>(null);
  const [isMapComponentsLoaded, setIsMapComponentsLoaded] = useState(false); // État pour MapView components

  // Chargement dynamique de react-native-maps pour les plateformes natives
  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('react-native-maps').then(maps => {
        // Assignation des composants MapView après chargement.
        MapView = maps.default;
        Marker = maps.Marker;
        Circle = maps.Circle;
        Polyline = maps.Polyline;
        setIsMapComponentsLoaded(true);
      }).catch(error => {
        console.error('Failed to load react-native-maps on native:', error);
        setIsMapComponentsLoaded(false); // Échec du chargement
      });
    } else {
      // Pour le web, isMapComponentsLoaded reste false et MapView restera View.
      setIsMapComponentsLoaded(false);
    }
  }, []);

  // Expose les méthodes via ref pour le parent (index.tsx)
  useImperativeHandle(ref, () => ({
    locateMe: () => {
      // S'assurer que MapView est bien chargé et qu'on a une localisation.
      if (isMapComponentsLoaded && location && internalMapRef.current) {
        handleMapAction(DEFAULT_ZOOM);
      } else {
        console.warn("Impossible de localiser : MapView non chargé ou position non disponible.");
      }
    },
    zoomIn: () => {
      if (isMapComponentsLoaded && internalMapRef.current) handleMapAction(zoomLevel + 1);
    },
    zoomOut: () => {
      if (isMapComponentsLoaded && internalMapRef.current) handleMapAction(zoomLevel - 1);
    },
    toggleMapType: () => setMapType(current => (current === 'standard' ? 'satellite' : current === 'satellite' ? 'hybrid' : 'standard')),
    toggleSimulation: () => console.log('Toggle Simulation called'),
    toggleTrails: () => console.log('Toggle Trails called'),
    regenerateSimulation: () => console.log('Regenerate Simulation called'),
  }));

  // Anime la carte à une nouvelle région/zoom
  const handleMapAction = useCallback((newZoom: number) => {
    // S'assurer que internalMapRef.current et location sont valides.
    if (isMapComponentsLoaded && internalMapRef.current && location) {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      setZoomLevel(clampedZoom);
      const delta = calculateDelta(clampedZoom);
      internalMapRef.current.animateToRegion({ latitude: location.latitude, longitude: location.longitude, latitudeDelta: delta, longitudeDelta: delta }, 500);
    }
  }, [location, zoomLevel, isMapComponentsLoaded]);

  // Gère le clic sur un cluster
  const handleClusterPress = useCallback((clusterId: string, children: any[]) => {
    // S'assurer que MapView est chargé avant d'interagir.
    if (!isMapComponentsLoaded || !internalMapRef.current || !children || children.length === 0) return;

    const coordinates = children.map(child => child.geometry.coordinates);
    if (coordinates.length > 0) {
      internalMapRef.current.fitToSuppliedMarkers(
        coordinates.map((coord: { latitude: number, longitude: number }) => `souffle-${coord.latitude}-${coord.longitude}`), 
        { edgePadding: { top: 150, right: 100, bottom: 150, left: 100 }, animated: true }
      );
    }
  }, [isMapComponentsLoaded]);
  
  // Gère le clic sur un marqueur de souffle
  const handleMarkerPress = useCallback(async (souffle: Souffle) => {
    // S'assurer que 'location' est valide ici.
    if (mode !== 'read' || !location) return;
    playInteractionSound('navigate');
    
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
                  onSouffleRevealed?.({ ...currentSouffleState, isRevealed: true });
                  setSelectedSouffle({ ...currentSouffleState, isRevealed: true });
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

  // Gère le clic sur un marqueur de ticket suspendu
  const handleTicketPress = useCallback(async (ticket: SuspendedTicket) => {
    if (!location || !isAuthenticated) {
      Alert.alert(t('common.functionalityReserved'), t('shop.item_alert_account_required_text'));
      return;
    }

    Alert.alert(
      t('shop.items.suspended_ticket.name'),
      t('shop.items.suspended_ticket.benefit1'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('shop.item_button_offer', { price: '0,99 €' }),
          onPress: async () => {
            const claimed = await claimSuspendedTicket(ticket.id);
            if (claimed) {
              Alert.alert(t('shop.item_alert_thanks_title'), t('shop.item_alert_thanks_text'));
            } else {
              Alert.alert(t('error'), t('shop.item_alert_error_text'));
            }
          },
        },
      ]
    );
  }, [location, isAuthenticated, claimSuspendedTicket, t]);
  
  // Fonction utilitaire pour le temps écoulé
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

  // Si Platform.OS est 'web' OU si les composants MapView ne sont pas encore chargés.
  // Dans ce cas, nous affichons un composant de chargement/indisponibilité.
  if (Platform.OS === 'web' || !isMapComponentsLoaded) {
    return (
      <View style={styles.mapUnavailableOverlayContainer}> {/* Nouveau conteneur pour l'overlay */}
        <View style={styles.mapUnavailableOverlay}>
          <ActivityIndicator size="large" color="#A8C8E1" />
          <Text style={styles.mapUnavailableText}>
            {Platform.OS === 'web' ? t('mapUnavailableWeb') : t('loadingMapComponents')}
          </Text>
          {Platform.OS !== 'web' && !isMapComponentsLoaded && (
            <Text style={styles.mapUnavailableErrorText}>
              {t('mapComponentsError')}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Rendu principal de la carte si les composants MapView sont chargés et la plateforme est native.
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
          {/* La carte est toujours rendue ici si isMapComponentsLoaded est true. */}
          <View style={styles.mapWrapper}>
            <MapView 
              ref={internalMapRef} 
              style={styles.fullMap}
              // Utiliser la localisation ou une valeur par défaut si `location` est null pour éviter le gel initial.
              initialRegion={location ? 
                { latitude: location.latitude, longitude: location.longitude, latitudeDelta: calculateDelta(DEFAULT_ZOOM), longitudeDelta: calculateDelta(DEFAULT_ZOOM) } :
                // Région par défaut si la localisation est nulle, pour permettre à la carte de s'initialiser.
                { latitude: 46.792781, longitude: 1.689698, latitudeDelta: calculateDelta(DEFAULT_ZOOM), longitudeDelta: calculateDelta(DEFAULT_ZOOM) } 
              }
              showsUserLocation={!!location} // Affichera le point utilisateur uniquement si la localisation est disponible.
              mapType={mapType}
              onRegionChangeComplete={useCallback((region: Region) => setZoomLevel(Math.log(360 / region.latitudeDelta) / Math.LN2), [])}
              clusteringEnabled={true}
              renderCluster={(cluster: any) => <SouffleCluster cluster={cluster} onPress={handleClusterPress} />}
            >
              {/* Cercles de portée autour de l'utilisateur (afficher uniquement si la localisation est disponible) */}
              {location && (
                <>
                  <Circle center={location} radius={500} strokeColor="rgba(139, 125, 107, 0.3)" fillColor="rgba(139, 125, 107, 0.05)" strokeWidth={1} />
                  <Circle center={location} radius={15} strokeColor="rgba(168, 200, 225, 0.8)" fillColor="rgba(168, 200, 225, 0.2)" strokeWidth={1} />
                </>
              )}

              {/* Rendu des marqueurs de souffles */}
              {souffles.map((souffle) => (
                <MemoizedSouffleMarker
                  key={souffle.id}
                  souffle={souffle}
                  location={location} 
                  onPress={handleMarkerPress}
                />
              ))}

              {/* Rendu des marqueurs de tickets suspendus */}
              {suspendedTickets.map((ticket) => (
                <MemoizedTicketMarker
                  key={ticket.id}
                  ticket={ticket}
                  location={location} 
                  onPress={handleTicketPress}
                />
              ))}
            </MapView>

            {/* Overlay pour l'état de la localisation (par-dessus la carte) */}
            {(!location && isLocationReady && !locationLoading) && (
              <View style={styles.locationOverlay}>
                <Text style={styles.mapUnavailableErrorIcon}>🗺️</Text> {/* Icône d'erreur */}
                <Text style={styles.mapUnavailableText}>
                  {locationError || (hasPermission ? t('locationNotFoundTryAgain') : t('locationRequiredToExplore'))}
                </Text>
                {permissionPermanentlyDenied && (
                  <Text style={styles.mapUnavailableErrorText}>{t('locationPermissionDeniedPermanent')}</Text>
                )}
                {/* Bouton de réessai : visible si la localisation n'est pas en cours de chargement
                    ET que le contexte est prêt, ET qu'il n'y a pas de permission permanente. */}
                {!locationLoading && !permissionPermanentlyDenied && (
                  <TouchableOpacity style={styles.locationRetryButtonLarge} onPress={handleRetryLocation}>
                      <RefreshCw size={18} color="#F9F7F4" />
                      <Text style={styles.locationRetryButtonTextLarge}>{t('retry')}</Text>
                  </TouchableOpacity>
                )}
                {permissionPermanentlyDenied && (
                   <TouchableOpacity style={styles.locationRetryButtonLarge} onPress={() => Linking.openSettings()}>
                      <Text style={styles.locationRetryButtonTextLarge}>{t('openSettings')}</Text>
                   </TouchableOpacity>
                )}
              </View>
            )}

            {/* Indicateur de chargement de la localisation par-dessus la carte */}
            {locationLoading && !location && (
              <View style={styles.locationLoadingOverlay}>
                <ActivityIndicator size="large" color="#A8C8E1" />
                <Text style={styles.locationLoadingText}>{t('locating')}</Text>
              </View>
            )}
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
  mapUnavailableOverlayContainer: { // Nouveau conteneur pour l'overlay d'indisponibilité, prend la place de MapWrapper
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
    elevation: 8,
  },
  mapUnavailableOverlay: { // Styles pour l'overlay de carte non disponible
    ...StyleSheet.absoluteFillObject, // Prend toute la place du conteneur
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 247, 244, 0.95)', // Semi-transparent pour voir un peu le fond
    zIndex: 5, // S'assure qu'il est au-dessus
    padding: 20,
  },
  mapUnavailableText: { 
    fontSize: 15, 
    fontFamily: 'Georgia', 
    color: '#8B7D6B', 
    textAlign: 'center', 
    fontStyle: 'italic', 
    marginTop: 20,
    marginBottom: 10,
  },
  mapUnavailableErrorText: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#C17B5C',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 5,
    lineHeight: 18,
  },
  mapUnavailableErrorIcon: { // Nouveau style pour une icône d'erreur plus grande
    fontSize: 50,
    marginBottom: 10,
    color: '#8B7D6B',
  },
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
  modalTextContainerPremium: { backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0, padding: 0 },
  modalTitlePremium: { fontSize: 21, color: '#FFF', textShadowColor: '#000B', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, textAlign: 'center', marginBottom: 16, fontWeight: 'bold' },
  modalEmotionTextPremium: { fontSize: 18, color: '#FFF', fontWeight: '700', textAlign: 'center', textShadowColor: '#000B', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  modalTextPremium: { fontSize: 26, color: '#FFF', fontWeight: '700', textAlign: 'center', lineHeight: 34, textShadowColor: '#000B', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 7, marginBottom: 16 },
  modalTimePremium: { fontSize: 16, color: '#FFF', textAlign: 'center', textShadowColor: '#000A', textShadowColor: '#000A', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, marginTop: 5 },
});
