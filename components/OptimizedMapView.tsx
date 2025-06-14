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
  ImageBackground, // Utilisé pour les fonds de souffle
  Dimensions,
  ActivityIndicator,
  Animated, // Import Animated for custom animations
} from 'react-native';
import { Eye, Gift, X } from 'lucide-react-native';

import type MapViewType from 'react-native-maps'; 
import { Region } from 'react-native-maps';

// --- Chargement dynamique de react-native-maps ---
let MapView: any = View;
let Marker: any = View;
let Circle: any = View;
let Polyline: any = View;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Circle = maps.Circle;
    Polyline = maps.Polyline;
  } catch (error) {
    console.error('react-native-maps n\'est pas disponible sur cette plateforme.', error);
  }
}

import { useLocation } from '@/contexts/LocationContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { isWithinRevealDistance, calculateDistance } from '@/utils/distance'; //
import { getStickerById } from '@/utils/stickers'; //
import { getBackgroundById } from '@/utils/backgrounds'; //
import { getEmotionDisplay } from '@/utils/emotionUtils'; //
import { AnimatedHalo, WaveEffect, FloatingParticle } from './MapAnimations'; //
import type { Souffle, SuspendedTicket } from '@/types/souffle'; //

const { width } = Dimensions.get('window');

// --- Interfaces et Constantes ---
interface OptimizedMapViewProps {
  mode: 'read' | 'write';
  onSouffleRevealed?: (souffle: Souffle) => void;
}

export interface MapViewActions {
  locateMe: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleMapType: () => void;
  toggleSimulation: () => void; // À implémenter dans MapView
  toggleTrails: () => void; // À implémenter dans MapView
  regenerateSimulation: () => void; // À implémenter dans MapView
}

const MIN_ZOOM = 8;
const MAX_ZOOM = 20;
const DEFAULT_ZOOM = 16;
const calculateDelta = (zoom: number) => Math.max(0.001, 360 / Math.pow(2, zoom));

// --- Composants de marqueurs optimisés ---

// Composant pour les clusters (groupements de souffles)
const SouffleCluster = React.memo(({ cluster, onPress }: { cluster: any; onPress: (clusterId: string, children: any[]) => void }) => (
  <Marker
    key={`cluster-${cluster.id}`}
    coordinate={cluster.geometry.coordinates}
    onPress={() => onPress(cluster.id, cluster.properties.cluster_children)}
    // tracksViewChanges={false} pourrait être utilisé ici si le cluster ne change pas d'apparence
    // Par défaut, le rendu du cluster peut varier (nombre, taille), donc le laisser à true est souvent ok.
  >
    <View style={styles.clusterMarker}>
      <Text style={styles.clusterCount}>{cluster.properties.point_count}</Text>
      <Text style={styles.clusterLabel}>souffles</Text>
    </View>
  </Marker>
));

// Composant pour les marqueurs de souffle individuels
const MemoizedSouffleMarker = React.memo(({ souffle, location, onPress }: { souffle: Souffle; location: any; onPress: (souffle: Souffle) => void }) => {
  // Utilisation de useMemo pour stabiliser les calculs si souffle ou location ne changent pas.
  const canReveal = useMemo(() => isWithinRevealDistance(location.latitude, location.longitude, souffle.latitude, souffle.longitude), [location, souffle]);
  const sticker = useMemo(() => souffle.sticker ? getStickerById(souffle.sticker) : null, [souffle.sticker]);
  const background = useMemo(() => getBackgroundById(souffle.backgroundId), [souffle.backgroundId]);
  const isSquare = background?.shape === 'square';

  // tracksViewChanges={!souffle.isRevealed && !canReveal}
  // Permet de ne pas recalculer la vue du marqueur si le souffle n'est pas révélé ET n'est pas à portée.
  // Une fois qu'il est révélable ou révélé, ou même s'il devient hors de portée,
  // il faudra un re-rendu, donc `false` sur `tracksViewChanges` est plus risqué pour les marqueurs interactifs.
  // On le retire pour s'assurer des mises à jour visuelles correctes pour `canReveal`.
  return (
    <Marker identifier={souffle.id} coordinate={souffle} onPress={() => onPress(souffle)}
      // Laissez tracksViewChanges à sa valeur par défaut (true) pour les marqueurs interactifs
      // afin que les changements d'état (canReveal, isRevealed) soient toujours reflétés.
      // Si des problèmes de performance persistent, on peut envisager un contrôle plus fin.
    >
      <AnimatedHalo isActive={canReveal} canReveal={canReveal && !souffle.isRevealed} isRevealed={souffle.isRevealed}>
        {/* WaveEffect est actif uniquement quand canReveal est true et le souffle n'est pas révélé. */}
        <WaveEffect isActive={canReveal && !souffle.isRevealed}>
          <ImageBackground
            source={background.source}
            // Utiliser un style conditionnel pour éviter les bugs de borderRadius sur ImageBackground
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
  // useMemo pour stabiliser le calcul canReveal
  const canReveal = useMemo(() => isWithinRevealDistance(location.latitude, location.longitude, ticket.latitude, ticket.longitude), [location, ticket]);

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
  const { location, loading: locationLoading } = useLocation();
  const { souffles, revealSouffle, suspendedTickets, claimSuspendedTicket } = useSouffle();
  const { t } = useLanguage(); 
  const { playInteractionSound } = useAudio();
  const { user, spendTicket, isAuthenticated } = useAuth();
  
  const [selectedSouffle, setSelectedSouffle] = useState<Souffle | null>(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const internalMapRef = useRef<MapViewType | null>(null);

  // Expose les méthodes via ref pour le parent (index.tsx)
  useImperativeHandle(ref, () => ({
    locateMe: () => handleMapAction(DEFAULT_ZOOM),
    zoomIn: () => handleMapAction(zoomLevel + 1),
    zoomOut: () => handleMapAction(zoomLevel - 1),
    toggleMapType: () => setMapType(current => (current === 'standard' ? 'satellite' : current === 'satellite' ? 'hybrid' : 'standard')), // Ajout de 'hybrid'
    toggleSimulation: () => console.log('Toggle Simulation called'), // Placeholder, à implémenter
    toggleTrails: () => console.log('Toggle Trails called'), // Placeholder, à implémenter
    regenerateSimulation: () => console.log('Regenerate Simulation called'), // Placeholder, à implémenter
  }));

  // Anime la carte à une nouvelle région/zoom
  const handleMapAction = useCallback((newZoom: number) => {
    if (internalMapRef.current && location) {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      setZoomLevel(clampedZoom);
      const delta = calculateDelta(clampedZoom);
      internalMapRef.current.animateToRegion({ latitude: location.latitude, longitude: location.longitude, latitudeDelta: delta, longitudeDelta: delta }, 500);
    }
  }, [location, zoomLevel]); // Ajout de zoomLevel aux dépendances pour s'assurer que sa valeur est à jour.

  // Gère le clic sur un cluster
  const handleClusterPress = useCallback((clusterId: string, children: any[]) => {
    if (!internalMapRef.current || !children || children.length === 0) return;

    // Si un cluster est pressé, on zoome sur les marqueurs qu'il contient
    const coordinates = children.map(child => child.geometry.coordinates);
    if (coordinates.length > 0) {
      internalMapRef.current.fitToSuppliedMarkers(
        // Il est important que ces identifiants correspondent aux 'identifier' des Marker réels
        // Si vos marqueurs n'ont pas d'identifiant stable basé sur les coordonnées,
        // vous pourriez avoir besoin de créer une liste d'identifiants unique.
        coordinates.map((coord: { latitude: number, longitude: number }) => `souffle-${coord.latitude}-${coord.longitude}`), 
        { edgePadding: { top: 150, right: 100, bottom: 150, left: 100 }, animated: true }
      );
    }
  }, []);
  
  // Gère le clic sur un marqueur de souffle
  const handleMarkerPress = useCallback(async (souffle: Souffle) => {
    if (mode !== 'read' || !location) return;
    playInteractionSound('navigate');
    
    // IMPORTANT : Créer une COPIE IMMUABLE du souffle
    // Quand vous mettez à jour un souffle révélé, assurez-vous de ne pas muter l'objet original
    // provenant du contexte, car cela pourrait empêcher React.memo de fonctionner correctement
    // pour d'autres instances du marqueur si elles partagent des références.
    const currentSouffleState = souffles.find(s => s.id === souffle.id) || souffle;

    if (currentSouffleState.isRevealed) {
      setSelectedSouffle(currentSouffleState);
      return;
    }

    const canReveal = isWithinRevealDistance(location.latitude, location.longitude, currentSouffleState.latitude, currentSouffleState.longitude);
    
    if (canReveal) {
      // Révélation directe
      await revealSouffle(currentSouffleState.id); // Utilisez l'ID pour la mise à jour globale
      onSouffleRevealed?.({ ...currentSouffleState, isRevealed: true }); // Notifie le parent avec l'état mis à jour
      setSelectedSouffle({ ...currentSouffleState, isRevealed: true }); // Met à jour le souffle pour l'affichage de la modale
    } else {
      // Révélation à distance avec ticket
      if (!isAuthenticated) {
        Alert.alert(t('common.functionalityReserved'), t('common.accountRequiredForDistantReveal'));
        return;
      }
      
      const distance = Math.round(calculateDistance(location.latitude, location.longitude, currentSouffleState.latitude, currentSouffleState.longitude));
      const ticketCount = user?.ticketCount || 0; // Utiliser optional chaining pour user

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
  }, [mode, location, isAuthenticated, user, t, revealSouffle, onSouffleRevealed, spendTicket, playInteractionSound, souffles]); // Ajout de souffles dans les dépendances.

  // Gère le clic sur un marqueur de ticket suspendu
  const handleTicketPress = useCallback(async (ticket: SuspendedTicket) => {
    if (!location || !isAuthenticated) {
      Alert.alert(t('common.functionalityReserved'), t('shop.item_alert_account_required_text'));
      return;
    }

    Alert.alert(
      t('shop.items.suspended_ticket.name'),
      t('shop.items.suspended_ticket.benefit1'), // Utiliser la description du bénéfice
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('shop.item_button_offer', { price: '0,99 €' }), // Ou un texte plus approprié comme "Réclamer"
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
  
  // Prépare les données pour la modale du souffle révélé (useMemo pour la stabilité)
  const modalBackground = useMemo(() => 
    selectedSouffle ? getBackgroundById(selectedSouffle.backgroundId) : null,
    [selectedSouffle]
  );
  const showPremiumModal = modalBackground?.source && modalBackground?.shape === 'square';

  // Rendu du contenu de la modale de souffle révélé (useCallback pour la stabilité)
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
  }, [selectedSouffle, showPremiumModal, modalBackground, getTimeAgo, t]); // Dépendances pour useCallback

  // Affichage si la carte n'est pas disponible (web ou localisation manquante)
  if (!location || Platform.OS === 'web') {
    return (
      <View style={styles.mapUnavailableOverlay}>
        <ActivityIndicator size="large" color="#A8C8E1" />
        <Text style={styles.mapUnavailableText}>
          {locationLoading ? t('locating') : t('locationRequiredToExplore')}
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.mobileMapContainer}>
      <MapView
        ref={internalMapRef}
        style={styles.fullMap}
        initialRegion={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: calculateDelta(DEFAULT_ZOOM), longitudeDelta: calculateDelta(DEFAULT_ZOOM) }}
        showsUserLocation
        mapType={mapType}
        onRegionChangeComplete={(region: Region) => setZoomLevel(Math.log(360 / region.latitudeDelta) / Math.LN2)}
        clusteringEnabled={true}
        renderCluster={(cluster: any) => <SouffleCluster cluster={cluster} onPress={handleClusterPress} />}
      >
        {/* Cercles de portée autour de l'utilisateur */}
        <Circle center={location} radius={500} strokeColor="rgba(139, 125, 107, 0.3)" fillColor="rgba(139, 125, 107, 0.05)" strokeWidth={1} />
        <Circle center={location} radius={15} strokeColor="rgba(168, 200, 225, 0.8)" fillColor="rgba(168, 200, 225, 0.2)" strokeWidth={1} />

        {/* Rendu des marqueurs de souffles (optimisé) */}
        {souffles.map((souffle) => (
          <MemoizedSouffleMarker
            key={souffle.id}
            souffle={souffle}
            location={location}
            onPress={handleMarkerPress}
          />
        ))}

        {/* Rendu des marqueurs de tickets suspendus (optimisé) */}
        {suspendedTickets.map((ticket) => (
          <MemoizedTicketMarker
            key={ticket.id}
            ticket={ticket}
            location={location}
            onPress={handleTicketPress}
          />
        ))}
      </MapView>

      {/* Modale de révélation de souffle */}
      <Modal visible={!!selectedSouffle} transparent animationType="fade" onRequestClose={() => setSelectedSouffle(null)}>
        <TouchableOpacity 
          style={styles.modalOverlaySouffle}
          activeOpacity={1}
          onPress={() => setSelectedSouffle(null)} // Ferme la modale au clic en dehors
        >
          {showPremiumModal && modalBackground?.source ? (
              // ImageBackground est un composant React Native. Pour les performances,
              // assurez-vous que les images (automn.png, soleil.png) sont très optimisées en taille et résolution.
              <ImageBackground 
                source={modalBackground.source} 
                style={[styles.modalContentBaseSouffle, styles.modalContentSquareSouffle]} 
                imageStyle={{ borderRadius: 25 }}
              >
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

export default OptimizedMapView;

// --- Styles ---
const styles = StyleSheet.create({
  mobileMapContainer: { flex: 1, backgroundColor: '#F9F7F4' },
  fullMap: { ...StyleSheet.absoluteFillObject },
  mapUnavailableOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F7F4' },
  mapUnavailableText: { fontSize: 15, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic', marginTop: 20 },
  
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
  souffleMarkerCanReveal: { width: 48, height: 48 }, // Agrandit le marqueur quand il est révélable
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
  modalTextContainerPremium: { backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0, padding: 0 },
  modalTitlePremium: { fontSize: 21, color: '#FFF', textShadowColor: '#000B', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, textAlign: 'center', marginBottom: 16, fontWeight: 'bold' },
  modalEmotionTextPremium: { fontSize: 18, color: '#FFF', fontWeight: '700', textAlign: 'center', textShadowColor: '#000B', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  modalTextPremium: { fontSize: 26, color: '#FFF', fontWeight: '700', textAlign: 'center', lineHeight: 34, textShadowColor: '#000B', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 7, marginBottom: 16 },
  modalTimePremium: { fontSize: 16, color: '#FFF', textAlign: 'center', textShadowColor: '#000A', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, marginTop: 5 },
});
