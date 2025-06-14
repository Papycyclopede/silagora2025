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

// --- MODIFICATION CLÉ : Déclarer les types, MAIS NE PAS INITIALISER AVEC DES VUES FACTICES GLOBALES ---
// Les composants MapView, Marker, etc. seront gérés comme des états LOCAUX.
// Nous avons juste besoin des types ici pour TypeScript.
let NativeMapView: typeof MapViewType;
let NativeMarker: React.ComponentType<any>;
let NativeCircle: React.ComponentType<any>;
let NativePolyline: React.ComponentType<any>;


import { useLocation } from '@/contexts/LocationContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { isWithinRevealDistance, calculateDistance } from '@/utils/distance';
import { getStickerById } from '@/utils/stickers';
import { getBackgroundById } => getBackgroundById(souffle.backgroundId), [souffle.backgroundId]);
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


// --- Composants de marqueurs optimisés ---

// Ces composants prendront MapView, Marker, Circle comme props ou utiliseront un fallback.
// La gestion des props permet d'éviter les dépendances directes sur les variables MapView globales.
const SouffleCluster = React.memo(({ cluster, onPress, MapViewComponent, MarkerComponent }: { cluster: any; onPress: (clusterId: string, children: any[]) => void; MapViewComponent: any; MarkerComponent: any }) => {
  const CurrentMarker = MarkerComponent || View; // Fallback to View if MarkerComponent is not yet loaded

  return (
    <CurrentMarker
      key={`cluster-${cluster.id}`}
      coordinate={cluster.geometry.coordinates}
      onPress={() => onPress(cluster.id, cluster.properties.point_count)}
    >
      <View style={styles.clusterMarker}>
        <Text style={styles.clusterCount}>{cluster.properties.point_count}</Text>
        <Text style={styles.clusterLabel}>souffles</Text>
      </View>
    </CurrentMarker>
  );
});

const MemoizedSouffleMarker = React.memo(({ souffle, location, onPress, MarkerComponent }: { souffle: Souffle; location: any; onPress: (souffle: Souffle) => void; MarkerComponent: any }) => {
  const canReveal = useMemo(() => location ? isWithinRevealDistance(location.latitude, location.longitude, souffle.latitude, souffle.longitude) : false, [location, souffle]);
  const sticker = useMemo(() => souffle.sticker ? getStickerById(souffle.sticker) : null, [souffle.sticker]);
  const background = useMemo(() => getBackgroundById(souffle.backgroundId), [souffle.backgroundId]);
  const isSquare = background?.shape === 'square';
  const CurrentMarker = MarkerComponent || View; // Fallback to View if MarkerComponent is not yet loaded

  return (
    <CurrentMarker identifier={souffle.id} coordinate={souffle} onPress={() => onPress(souffle)}>
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
    </CurrentMarker>
  );
});

const MemoizedTicketMarker = React.memo(({ ticket, location, onPress, MarkerComponent }: { ticket: SuspendedTicket; location: any; onPress: (ticket: SuspendedTicket) => void; MarkerComponent: any }) => {
  const canReveal = useMemo(() => location ? isWithinRevealDistance(location.latitude, location.longitude, ticket.latitude, ticket.longitude) : false, [location, ticket]);
  const CurrentMarker = MarkerComponent || View; // Fallback to View if MarkerComponent is not yet loaded

  return (
    <CurrentMarker key={ticket.id} coordinate={ticket} tracksViewChanges={false}>
      <AnimatedHalo isActive={true} canReveal={canReveal}>
        <TouchableOpacity style={styles.ticketMarker} onPress={() => onPress(ticket)}>
          <Gift size={20} color="#C17B5C" />
        </TouchableOpacity>
      </AnimatedHalo>
    </CurrentMarker>
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

  // MODIFIÉ: Gérer les composants de carte comme des états locaux
  const [MapViewComponent, setMapViewComponent] = useState<typeof MapViewType | React.ComponentType<any>>(View);
  const [MarkerComponent, setMarkerComponent] = useState<React.ComponentType<any>>(View);
  const [CircleComponent, setCircleComponent] = useState<React.ComponentType<any>>(View);
  const [PolylineComponent, setPolylineComponent] = useState<React.ComponentType<any>>(View);

  const [isMapComponentsLoaded, setIsMapComponentsLoaded] = useState(false); // État pour MapView components

  // Chargement dynamique de react-native-maps pour les plateformes natives
  // Ce useEffect est essentiel et doit rester tel quel.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('react-native-maps').then(maps => {
        setMapViewComponent(() => maps.default); // Utiliser une fonction pour éviter les problèmes de référence
        setMarkerComponent(() => maps.Marker);
        setCircleComponent(() => maps.Circle);
        setPolylineComponent(() => maps.Polyline || View); // Fallback pour Polyline si non dispo
        setIsMapComponentsLoaded(true);
      }).catch(error => {
        console.error('Failed to load react-native-maps on native (check installation and linking):', error);
        setIsMapComponentsLoaded(false);
        // Optionnel : Afficher une alerte ou un message à l'utilisateur ici.
      });
    } else {
      // Pour le web, les composants resteront les View factices, et MapView n'est pas chargé.
      setIsMapComponentsLoaded(false);
      // Optionnel: Afficher un message spécifique pour le web ici si OptimizedMapView était destiné à être vu sur web.
    }
  }, []); // Ce useEffect ne s'exécute qu'une fois au montage.

  // Expose les méthodes via ref pour le parent (index.tsx)
  useImperativeHandle(ref, () => ({
    locateMe: () => {
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
  }), [location, zoomLevel, isMapComponentsLoaded]); // Ajout de isMapComponentsLoaded aux dépendances.

  // Anime la carte à une nouvelle région/zoom
  const handleMapAction = useCallback((newZoom: number) => {
    if (isMapComponentsLoaded && internalMapRef.current && location) {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      setZoomLevel(clampedZoom);
      const delta = calculateDelta(clampedZoom);
      internalMapRef.current.animateToRegion({ latitude: location.latitude, longitude: location.longitude, latitudeDelta: delta, longitudeDelta: delta }, 500);
    }
  }, [location, zoomLevel, isMapComponentsLoaded]);

  // Gère le clic sur un cluster
  const handleClusterPress = useCallback((clusterId: string, children: any[]) => {
    if (!isMapComponentsLoaded || !internalMapRef.current || !children || children.length === 0) return;

    const coordinates = children.map((child: any) => child.geometry?.coordinates || child.coordinate);

    if (coordinates.length > 0) {
        internalMapRef.current.fitToSuppliedMarkers(
          coordinates.map((coord: { latitude: number, longitude: number }) => `marker-${coord.latitude}-${coord.longitude}`),
          { edgePadding: { top: 150, right: 100, bottom: 150, left: 100 }, animated: true }
        );
    }
  }, [isMapComponentsLoaded]);
  
  // Gère le clic sur un marqueur de souffle
  const handleMarkerPress = useCallback(async (souffle: Souffle) => {
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
  
  const modalBackground = useMemo(() => 
    selectedSouffle ? getBackgroundById(selectedSouffle.backgroundId) : null,
    [selectedSouffle]
  );
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
  // Note: Ce bloc est le rendu conditionnel principal de OptimizedMapView.
  if (Platform.OS === 'web' || !isMapComponentsLoaded) {
    return (
      <View style={styles.mapUnavailableOverlayContainer}> {/* Nouveau conteneur pour l'overlay */}
        <View style={styles.mapUnavailableOverlay}>
          <ActivityIndicator size="large" color="#A8C8E1" />
          <Text style={styles.mapUnavailableText}>
            {Platform.OS === 'web' ? t('mapUnavailableWeb') : t('loadingMapComponents')}
          </Text>
          <Text style={styles.mapUnavailableErrorText}>
            {Platform.OS === 'web' ? t('mapUnavailableWebMessage') : t('mapComponentsLoadingError')}
          </Text>
        </View>
      </View>
    );
  }

  // Rendu principal de la carte si les composants MapView sont chargés (plateforme native uniquement).
  // OptimizedMapView ne sera rendu que si isMapComponentsLoaded est true.
  return (
    <View style={styles.mobileMapContainer}>
      <MapViewComponent // Utiliser le composant MapView chargé dynamiquement
        ref={internalMapRef}
        style={styles.fullMap}
        // Utiliser la localisation ou une valeur par défaut (Châteauroux) si `location` est null.
        initialRegion={location ?
          { latitude: location.latitude, longitude: location.longitude, latitudeDelta: calculateDelta(DEFAULT_ZOOM), longitudeDelta: calculateDelta(DEFAULT_ZOOM) } :
          // Coordonnées par défaut pour Châteauroux (France) pour éviter le 0,0 en cas d'absence de localisation
          { latitude: 46.792781, longitude: 1.689698, latitudeDelta: calculateDelta(DEFAULT_ZOOM), longitudeDelta: calculateDelta(DEFAULT_ZOOM) }
        }
        showsUserLocation={!!location} // Affichera le point utilisateur uniquement si la localisation est disponible.
        mapType={mapType}
        onRegionChangeComplete={useCallback((region: Region) => setZoomLevel(Math.log(360 / region.latitudeDelta) / Math.LN2), [])}
        clusteringEnabled={true}
        renderCluster={(cluster: any) => <SouffleCluster cluster={cluster} onPress={handleClusterPress} MapViewComponent={MapViewComponent} MarkerComponent={MarkerComponent} />}
      >
        {/* Cercles de portée autour de l'utilisateur (afficher uniquement si la localisation est disponible) */}
        {location && (
          <>
            <CircleComponent center={location} radius={500} strokeColor="rgba(139, 125, 107, 0.3)" fillColor="rgba(139, 125, 107, 0.05)" strokeWidth={1} />
            <CircleComponent center={location} radius={15} strokeColor="rgba(168, 200, 225, 0.8)" fillColor="rgba(168, 200, 225, 0.2)" strokeWidth={1} />
          </>
        )}

        {/* Rendu des marqueurs de souffles */}
        {souffles.map((souffle) => (
          <MemoizedSouffleMarker
            key={souffle.id}
            souffle={souffle}
            location={location}
            onPress={handleMarkerPress}
            MarkerComponent={MarkerComponent} // Passe le composant Marker
          />
        ))}

        {/* Rendu des marqueurs de tickets suspendus */}
        {suspendedTickets.map((ticket) => (
          <MemoizedTicketMarker
            key={ticket.id}
            ticket={ticket}
            location={location}
            onPress={handleTicketPress}
            MarkerComponent={MarkerComponent} // Passe le composant Marker
          />
        ))}
        {/* Vous pouvez ajouter PolylineComponent ici si vous avez des chemins à afficher. */}
      </MapView>

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
    </View>
  );
});

// Styles (inclure les styles pour les nouveaux éléments, MapUnavailable, etc.)
const styles = StyleSheet.create({
  mobileMapContainer: { flex: 1, backgroundColor: '#F9F7F4' },
  fullMap: { ...StyleSheet.absoluteFillObject },
  mapUnavailableOverlayContainer: { // Conteneur pour l'overlay de MapView indisponible (prend toute la place du MapWrapper)
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
  mapUnavailableText: { fontSize: 15, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic', marginTop: 20, marginBottom: 10 },
  mapUnavailableErrorText: { fontSize: 13, fontFamily: 'Georgia', color: '#C17B5C', textAlign: 'center', fontStyle: 'italic', marginTop: 5, lineHeight: 18 },

  clusterMarker: {
    backgroundColor: 'rgba(168, 200, 225, 0.95)',
    padding: 10,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  },
  clusterCount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    fontWeight: 'bold',
  },
  clusterLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Quicksand-Regular',
  },

  souffleMarkerBase: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.9)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2, overflow: 'hidden', backgroundColor: 'rgba(249, 247, 244, 0.6)' },
  souffleMarkerCircle: { borderRadius: 19 },
  souffleMarkerSquare: { borderRadius: 8 },
  souffleMarkerRevealed: { borderColor: '#F4E4BC' },
  souffleMarkerCanReveal: { width: 48, height: 48 },
  souffleMarkerHidden: { backgroundColor: 'rgba(184, 160, 130, 0.7)' },
  markerContentContainer: { flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  souffleMarkerEmoji: { fontSize: 18, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  canRevealMarkerBadge: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#A8C8E1', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 },

  ticketMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(252, 237, 230, 0.9)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(193, 123, 92, 0.8)', shadowColor: '#C17B5C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },

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
