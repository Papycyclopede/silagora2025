import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';
import type { UserLocation } from '@/types/souffle'; //

interface LocationContextType {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  watchLocation: () => void;
  stopWatchingLocation: () => void;
  hasPermission: boolean;
  permissionPermanentlyDenied: boolean;
  // Ajout de isLocationReady pour un meilleur contrôle dans _initial.tsx
  isLocationReady: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionPermanentlyDenied, setPermissionPermanentlyDenied] = useState(false);
  const [watchSubscription, setWatchSubscription] = useState<Location.LocationSubscription | null>(null);
  const [isLocationReady, setIsLocationReady] = useState(false); // Nouveau statut

  // Réf pour s'assurer que la demande initiale de permission ne se déclenche qu'une fois.
  const initialPermissionRequested = useRef(false);

  // 1. Vérifie la permission au premier montage et tente d'obtenir la position si permise.
  useEffect(() => {
    const checkAndGetInitialLocation = async () => {
      if (Platform.OS === 'web') {
        // Logique spécifique au web inchangée
        if (!navigator.geolocation) {
          setError('Géolocalisation non supportée par ce navigateur');
          setHasPermission(false);
          setIsLocationReady(true); // Prêt pour le web même sans géoloc
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            setLocation(newLocation);
            setHasPermission(true);
            setError(null);
            setIsLocationReady(true);
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
            console.error('LocationContext: Erreur de géolocalisation (Web):', geoError);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
        return;
      }

      // Logique Native (iOS/Android)
      try {
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

        if (status === 'granted') {
          setHasPermission(true);
          setPermissionPermanentlyDenied(false);
          setError(null);

          // Tenter d'obtenir la position immédiatement si la permission est déjà accordée.
          try {
            setLoading(true);
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            const newLocation = { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude, accuracy: currentLocation.coords.accuracy || undefined };
            setLocation(newLocation);
            console.log('LocationContext: Position obtenue:', newLocation);
          } catch (posError) {
            setError("Impossible d'obtenir la localisation initiale.");
            console.error('LocationContext: Erreur lors de la position initiale:', posError);
          } finally {
            setLoading(false);
            setIsLocationReady(true); // La localisation est prête, même s'il y a eu une erreur de positionnement
          }
        } else {
          setHasPermission(false);
          setPermissionPermanentlyDenied(!canAskAgain);
          setError("Permission de géolocalisation refusée.");
          setIsLocationReady(true); // La permission a été vérifiée, on est prêt à continuer.
        }
      } catch (err) {
        console.error('LocationContext: Erreur lors de la vérification de permission:', err);
        setError("Erreur interne de permission de localisation.");
        setHasPermission(false);
        setPermissionPermanentlyDenied(false); // Supposons non permanent en cas d'erreur inattendue.
        setIsLocationReady(true);
      }
    };

    checkAndGetInitialLocation();
  }, []); // Exécute une seule fois au montage.

  // Fonction pour demander la permission (utilisée par welcome.tsx ou le bouton de retry)
  const requestLocation = async () => {
    setLoading(true);
    setError(null);
    setPermissionPermanentlyDenied(false);

    if (Platform.OS === 'web') {
      // La logique web a déjà été gérée au démarrage.
      // Si on arrive ici, c'est probablement un retry après un refus initial web.
      if (!navigator.geolocation) {
        setError('Géolocalisation non supportée par ce navigateur.');
        setHasPermission(false);
        setLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(newLocation);
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
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Permission de géolocalisation refusée');
        setHasPermission(false);
        setPermissionPermanentlyDenied(!canAskAgain); // Si canAskAgain est false, c'est permanent.
        
        if (!canAskAgain) {
          Alert.alert(
            "Permission requise",
            "Silagora a besoin d'accéder à votre position pour fonctionner. Veuillez l'activer manuellement dans les paramètres de votre appareil.",
            [{ text: 'Compris', style: 'cancel' }]
          );
        }
        setLoading(false);
        return;
      }

      setHasPermission(true);
      setPermissionPermanentlyDenied(false);

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
      console.log('LocationContext: Position obtenue (demande):', newLocation);
    } catch (err) {
      setError("Impossible d'obtenir la localisation");
      setHasPermission(false);
      // Ne mettez pas permissionPermanentlyDenied à true ici, car l'erreur pourrait être temporaire.
      console.error('LocationContext: Erreur lors de la demande de géolocalisation:', err);
    } finally {
      setLoading(false);
    }
  };

  const watchLocation = async () => {
    if (!hasPermission || permissionPermanentlyDenied) {
      console.log("LocationContext: Ne peut pas démarrer le suivi. Permission non accordée ou refusée en permanence.");
      return;
    }

    stopWatchingLocation(); // Arrête tout abonnement précédent

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
  // et que le `LocationProvider` est marqué comme prêt
  useEffect(() => {
    if (hasPermission && isLocationReady && location && !watchSubscription) {
      watchLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, isLocationReady, location, watchSubscription]);

  // `effectiveLoading` ne doit pas bloquer si la permission est refusée en permanence.
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
