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

  // 1. Check la permission au premier montage et tente d'obtenir la position si permise.
  useEffect(() => {
    const checkInitialLocationStatus = async () => {
      if (initialCheckPerformed.current) return; // S'assure que cela ne s'exécute qu'une seule fois
      initialCheckPerformed.current = true; // Marque le check comme effectué

      setLoading(true); // Indiquer le chargement dès le début de la vérification

      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setError('Géolocalisation non supportée par ce navigateur');
          setHasPermission(false);
          setIsLocationReady(true); // Prêt pour le web même sans géoloc
          setLoading(false);
          return;
        }

        // Pour le web, on demande la position (et donc la permission si elle n'est pas là)
        // car il n'y a pas de pop-up Expo Go spécifique.
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            setLocation(newLocation);
            setHasPermission(true); // Supposons la permission accordée si la position est obtenue
            setError(null);
            setIsLocationReady(true);
            setLoading(false);
            console.log('LocationContext: Position obtenue (Web):', newLocation);
          },
          (geoError) => {
            let errorMessage = "Impossible d'obtenir la localisation (Web)";
            let deniedPermanently = false;
            if (geoError.code === geoError.PERMISSION_DENIED) {
              errorMessage = 'Permission de géolocalisation refusée (Web).';
              deniedPermanently = true;
            }
            setError(errorMessage);
            setHasPermission(false);
            setPermissionPermanentlyDenied(deniedPermanently);
            setIsLocationReady(true);
            setLoading(false);
            console.error('LocationContext: Erreur de géolocalisation (Web):', geoError);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
        return;
      }

      // Logique Native (iOS/Android) : SEULEMENT VÉRIFIER LE STATUT AU DÉMARRAGE
      try {
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync(); //

        if (status === 'granted') {
          setHasPermission(true);
          setPermissionPermanentlyDenied(false);
          setError(null);

          // Si la permission est accordée, TENTER d'obtenir la position initiale.
          try {
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
              timeInterval: 1000, // Attendre max 1s pour une position de bonne qualité
              // maximumAge: 60000, // Peut être utilisé pour des positions plus anciennes si la fraîcheur n'est pas critique
            });
            const newLocation = { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude, accuracy: currentLocation.coords.accuracy || undefined };
            setLocation(newLocation);
            console.log('LocationContext: Position obtenue (initiale):', newLocation);
          } catch (posError: any) {
            // La permission est là, mais pas la position (ex: GPS désactivé, pas de signal)
            console.warn('LocationContext: Permission accordée mais impossible d\'obtenir la position initiale:', posError);
            setError(posError.code === 'E_LOCATION_SETTINGS_UNSATISFIED' ? "GPS désactivé ou signal faible." : "Position initiale non obtenue.");
            setLocation(null); // S'assurer que la localisation est nulle
          }
        } else {
          // Permission non accordée (undetermined, denied, limited)
          setHasPermission(false);
          setPermissionPermanentlyDenied(!canAskAgain); // Déterminer si c'est refus permanent
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

    // Pas de changements majeurs ici, cette fonction est celle qui déclenche la pop-up
    // et tente d'obtenir la position après.
    if (Platform.OS === 'web') {
        // La logique web demande déjà la position et met à jour les états.
        if (!navigator.geolocation) {
          setError('Géolocalisation non supportée par ce navigateur.');
          setHasPermission(false);
          setLoading(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
            setHasPermission(true);
            setError(null);
            setLoading(false);
          },
          (geoError) => {
            let errorMessage = "Impossible d'obtenir la localisation.";
            let deniedPermanently = false;
            if (geoError.code === geoError.PERMISSION_DENIED) {
              errorMessage = 'Permission de géolocalisation refusée. Veuillez autoriser la géolocalisation dans votre navigateur.';
              deniedPermanently = true;
            }
            setError(errorMessage);
            setHasPermission(false);
            setPermissionPermanentlyDenied(deniedPermanently);
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
        return;
    }

    // Logique Native (iOS/Android)
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync(); //

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
        setLocation(null); // Si la permission n'est pas accordée, la localisation est nulle.
        return;
      }

      setHasPermission(true);
      setPermissionPermanentlyDenied(false);

      // Tenter d'obtenir la localisation après avoir obtenu la permission
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
      };

      setLocation(newLocation);
      setError(null);
      console.log('LocationContext: Position obtenue (demande explicite):', newLocation);
    } catch (err: any) {
      if (err.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
          setError("GPS désactivé. Veuillez l'activer dans les paramètres de votre appareil.");
          Alert.alert(
              "GPS Désactivé",
              "Veuillez activer le GPS de votre appareil pour utiliser toutes les fonctionnalités de l'application.",
              [{ text: "OK" }]
          );
      } else {
          setError("Impossible d'obtenir la localisation.");
          console.error('LocationContext: Erreur lors de la demande de géolocalisation:', err);
      }
      setHasPermission(false); 
      setLocation(null); 
    } finally {
      setLoading(false);
    }
  };

  // Les fonctions watchLocation et stopWatchingLocation restent inchangées.
  const watchLocation = async () => {
    if (!hasPermission || permissionPermanentlyDenied || !location) { // Ajout de !location
      console.log("LocationContext: Ne peut pas démarrer le suivi. Permission non accordée, refusée en permanence ou pas de position initiale.");
      stopWatchingLocation();
      return;
    }
    if (watchSubscription) { 
      console.log("LocationContext: Suivi déjà actif.");
      return;
    }

    // Arrête tout abonnement précédent avant d'en créer un nouveau.
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
    // Le suivi ne démarre que si:
    // - La permission est accordée (`hasPermission`)
    // - Une position a été obtenue (`location` n'est pas null)
    // - Aucun abonnement de suivi n'est déjà actif (`!watchSubscription`)
    // `isLocationReady` n'est plus une dépendance ici car il indique juste la fin du *check initial*.
    if (hasPermission && location && !watchSubscription) {
      watchLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, location, watchSubscription]);

  // `effectiveLoading` est à `true` si `loading` est `true` ET que la permission n'est pas refusée de manière permanente.
  // `isLocationReady` indique si le processus INITIAL de la localisation est terminé.
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
    isLocationReady, // Exporter le nouvel état
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
