import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  // 1. Check la permission au premier montage
  useEffect(() => {
    const checkPermissionStatus = async () => {
      if (Platform.OS === 'web') return;
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'denied') {
        setHasPermission(false);
        setPermissionPermanentlyDenied(true);
        setError("Permission de géolocalisation refusée. Veuillez l'activer dans les paramètres de votre appareil.");
      } else if (status === 'granted') {
        setHasPermission(true);
        setPermissionPermanentlyDenied(false);
        setError(null);
      }
    };
    checkPermissionStatus();
  }, []);

  // 2. DEMANDE la permission automatiquement si pas déjà donnée
  useEffect(() => {
    if (!hasPermission && !permissionPermanentlyDenied && !loading) {
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, permissionPermanentlyDenied, loading]);

  const requestLocation = async () => {
    setLoading(true);
    setError(null);
    setPermissionPermanentlyDenied(false);

    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        setError('Géolocalisation non supportée par ce navigateur');
        setLoading(false);
        setHasPermission(false);
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
          console.log('LocationContext: Position obtenue:', newLocation);
        },
        (geoError) => {
          let errorMessage = "Impossible d'obtenir la localisation";
          let deniedPermanently = false;
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée. Veuillez autoriser la géolocalisation dans votre navigateur.';
              deniedPermanently = true;
              break;
            case geoError.POSITION_UNAVAILABLE:
              errorMessage = 'Position non disponible. Vérifiez votre connexion.';
              break;
            case geoError.TIMEOUT:
              errorMessage = "Délai d'attente dépassé. Réessayez.";
              break;
          }
          setError(errorMessage);
          setHasPermission(false);
          setPermissionPermanentlyDenied(deniedPermanently);
          setLoading(false);
          console.error('LocationContext: Erreur de géolocalisation:', geoError);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
      return;
    }

    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Permission de géolocalisation refusée');
        setHasPermission(false);
        setPermissionPermanentlyDenied(!canAskAgain);
        setLoading(false);

        if (!canAskAgain) {
          Alert.alert(
            'Permission requise',
            "Silagora a besoin d'accéder à votre position pour fonctionner. Veuillez l'activer manuellement dans les paramètres de votre appareil.",
            [{ text: 'Compris', style: 'cancel' }]
          );
        }
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
      console.log('LocationContext: Position obtenue:', newLocation);
    } catch (err) {
      setError("Impossible d'obtenir la localisation");
      setHasPermission(false);
      setPermissionPermanentlyDenied(false);
      console.error('LocationContext: Erreur de géolocalisation:', err);
    } finally {
      setLoading(false);
    }
  };

  const watchLocation = async () => {
    if (!hasPermission || permissionPermanentlyDenied) {
      console.log("LocationContext: Ne peut pas démarrer le suivi. Permission non accordée ou refusée en permanence.");
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
    if (hasPermission && !watchSubscription && location) {
      watchLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, watchSubscription, location]);

  // Si la localisation n'est pas dispo ou l'erreur est permanente, loading à false
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
