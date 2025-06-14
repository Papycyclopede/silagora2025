import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';
import type { UserLocation } from '@/types/souffle';

interface LocationContextType {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  watchLocation: () => void;
  stopWatchingLocation: () => void;
  hasPermission: boolean;
  permissionPermanentlyDenied: boolean;
  isLocationReady: boolean; // Indique si le processus initial de localisation a terminé
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false); // Vrai quand on cherche activement une position ou une permission
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionPermanentlyDenied, setPermissionPermanentlyDenied] = useState(false);
  const [watchSubscription, setWatchSubscription] = useState<Location.LocationSubscription | null>(null);
  const [isLocationReady, setIsLocationReady] = useState(false); // Vrai quand le contexte a fait son check initial

  // Réf pour s'assurer que le check initial de permission ne se déclenche qu'une fois.
  const initialCheckPerformed = useRef(false);

  // Fonction utilitaire pour obtenir la position après avoir la permission
  const getAndSetCurrentLocation = async (isInitialCheck: boolean = false) => {
    setLoading(true);
    setError(null); // Réinitialiser l'erreur avant de tenter

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000, // Attendre max 1s pour une position de bonne qualité
        timeout: 5000, // Timeout global pour l'acquisition de la position (5 secondes)
        // maximumAge: 1000, // Optionnel: accepte une position vieille de 1 seconde pour être plus rapide
      });
      const newLocation = { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude, accuracy: currentLocation.coords.accuracy || undefined };
      setLocation(newLocation);
      setError(null); // S'assurer qu'il n'y a pas d'erreur si la position est trouvée
      console.log(`LocationContext: Position obtenue (${isInitialCheck ? 'initiale' : 'après demande'}):`, newLocation);
      return true; // Position obtenue avec succès
    } catch (posError: any) {
      console.error(`LocationContext: Erreur lors de l'acquisition de la position (${isInitialCheck ? 'initiale' : 'après demande'}):`, posError);
      setLocation(null); // S'assurer que la localisation est nulle en cas d'erreur
      
      let newError = "Impossible d'obtenir la localisation.";
      if (posError.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
          newError = "GPS désactivé. Veuillez l'activer dans les paramètres de votre appareil.";
          Alert.alert(
              "GPS Désactivé",
              "Veuillez activer le GPS de votre appareil pour utiliser toutes les fonctionnalités de l'application.",
              [{ text: "OK" }]
          );
      } else if (posError.message && posError.message.includes('timeout')) {
          newError = "Délai d'attente dépassé pour obtenir la localisation. Essayez de nouveau.";
      }
      setError(newError);
      return false; // Échec de l'acquisition de position
    } finally {
        setLoading(false); // Fin de l'état de chargement d'acquisition de position
    }
  };

  // 1. Check la permission au premier montage et tente d'obtenir la position si permise.
  useEffect(() => {
    const checkInitialLocationStatus = async () => {
      if (initialCheckPerformed.current) return;
      initialCheckPerformed.current = true;

      setLoading(true); // Indiquer le chargement dès le début de la vérification

      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setError('Géolocalisation non supportée par ce navigateur');
          setHasPermission(false);
          setIsLocationReady(true);
          setLoading(false);
          return;
        }
        // Pour le web, getCurrentPosition appelle implicitement la permission
        const success = await getAndSetCurrentLocation(true);
        setHasPermission(success); // La permission est implicitement accordée si la position est obtenue
        setIsLocationReady(true);
        setLoading(false);
        return;
      }

      // Logique Native (iOS/Android) : SEULEMENT VÉRIFIER LE STATUT AU DÉMARRAGE
      try {
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

        if (status === 'granted') {
          setHasPermission(true);
          setPermissionPermanentlyDenied(false);
          setError(null);
          await getAndSetCurrentLocation(true); // Tenter d'obtenir la position
        } else {
          // Permission non accordée (undetermined, denied, limited)
          setHasPermission(false);
          setPermissionPermanentlyDenied(!canAskAgain);
          setError("Permission de géolocalisation non accordée.");
          setLocation(null); // S'assurer que la localisation est nulle
        }
      } catch (err) {
        console.error('LocationContext: Erreur lors de la vérification initiale de permission:', err);
        setError("Erreur interne lors de la vérification de localisation.");
        setHasPermission(false);
        setPermissionPermanentlyDenied(false);
        setLocation(null);
      } finally {
        setLoading(false); // Le processus initial de check est terminé.
        setIsLocationReady(true); // Le contexte est prêt à être utilisé (même si sans permission/position).
      }
    };

    checkInitialLocationStatus();
  }, []); // S'exécute une seule fois au montage.

  // Fonction pour DEMANDER LA PERMISSION (appelée par welcome.tsx ou un bouton de retry)
  const requestLocation = async () => {
    setLoading(true);
    setError(null);
    setPermissionPermanentlyDenied(false);

    if (Platform.OS === 'web') {
        const success = await getAndSetCurrentLocation(false);
        setHasPermission(success);
        setLoading(false);
        return;
    }

    // Logique Native (iOS/Android)
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Permission de géolocalisation refusée');
        setHasPermission(false);
        setPermissionPermanentlyDenied(!canAskAgain);
        
        if (!canAskAgain) {
          Alert.alert(
            "Permission requise",
            "Silagora a besoin d'accéder à votre position pour fonctionner. Veuillez l'activer manuellement dans les paramètres de votre appareil.",
            [{ text: 'Compris' }]
          );
        }
        setLoading(false);
        setLocation(null);
        return;
      }

      setHasPermission(true);
      setPermissionPermanentlyDenied(false);
      await getAndSetCurrentLocation(false); // Tenter d'obtenir la localisation après la permission
    } catch (err: any) {
      console.error('LocationContext: Erreur lors de la demande de géolocalisation:', err);
      // getAndSetCurrentLocation gère déjà les erreurs de GPS/timeout, donc ici, juste une erreur générique.
      setError("Impossible d'obtenir la localisation.");
      setHasPermission(false); 
      setLocation(null); 
    } finally {
      setLoading(false);
    }
  };

  // Les fonctions watchLocation et stopWatchingLocation restent inchangées.
  const watchLocation = async () => {
    if (!hasPermission || permissionPermanentlyDenied || !location) {
      console.log("LocationContext: Ne peut pas démarrer le suivi. Permission non accordée, refusée en permanence ou pas de position initiale.");
      stopWatchingLocation(); 
      return;
    }
    if (watchSubscription) { 
      console.log("LocationContext: Suivi déjà actif.");
      return;
    }

    stopWatchingLocation(); 

    if (Platform.OS === 'web') {
      if (!navigator.geolocation) return;
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
          setLocation(newLocation);
        },
        (error) => console.error('Erreur lors du suivi de position (Web):', error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
      setWatchSubscription({ remove: () => navigator.geolocation.clearWatch(watchId) } as any);
      console.log("LocationContext: Suivi de position démarré (Web).");
      return;
    }

    try {
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (newLocation) => {
          const updatedLocation = { latitude: newLocation.coords.latitude, longitude: newLocation.coords.longitude, accuracy: newLocation.coords.accuracy || undefined };
          setLocation(updatedLocation);
        }
      );
      setWatchSubscription(subscription);
      console.log("LocationContext: Suivi de position démarré.");
    } catch (err) {
      console.error('LocationContext: Erreur lors du démarrage du suivi de position:', err);
      setError("Impossible de démarrer le suivi de la localisation.");
    }
  };

  const stopWatchingLocation = () => {
    if (watchSubscription) {
      watchSubscription.remove();
      setWatchSubscription(null);
      console.log("LocationContext: Suivi de position arrêté.");
    }
  };

  // Démarre le suivi quand la permission est accordée et qu'une première position est obtenue
  useEffect(() => {
    if (hasPermission && location && !watchSubscription) {
      watchLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, location, watchSubscription]);

  const effectiveLoading = loading && !permissionPermanentlyDenied;

  const value: LocationContextType = {
    location,
    loading: effectiveLoading,
    error,
    requestLocation,
    watchLocation,
    stopWatchingLocation,
    hasPermission,
    permissionPermanentlyDenied,
    isLocationReady,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
