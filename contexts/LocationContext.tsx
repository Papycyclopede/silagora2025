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
  // Ajout d'un état pour suivre si l'utilisateur a déjà explicitement refusé la permission
  // Ceci est utile pour ne pas redemander constamment si le refus est intentionnel.
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
  const [permissionPermanentlyDenied, setPermissionPermanentlyDenied] = useState(false); // Nouveau
  const [watchSubscription, setWatchSubscription] = useState<Location.LocationSubscription | null>(null);

  // Charger l'état de la permission au démarrage pour éviter de redemander
  useEffect(() => {
    const checkPermissionStatus = async () => {
      if (Platform.OS === 'web') {
        // Pour le web, on ne peut pas vraiment détecter "permanently denied" facilement
        // On se base sur le succès ou l'échec de getCurrentPosition
        return; 
      }
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'denied') {
        // Si la permission est déjà refusée, on la marque comme telle.
        // L'utilisateur devra l'activer manuellement via les paramètres de l'OS.
        setHasPermission(false);
        setPermissionPermanentlyDenied(true);
        setError("Permission de géolocalisation refusée. Veuillez l'activer dans les paramètres de votre appareil.");
      } else if (status === 'granted') {
        setHasPermission(true);
        setPermissionPermanentlyDenied(false);
      }
    };
    checkPermissionStatus();
  }, []);

  const requestLocation = async () => {
    setLoading(true);
    setError(null);
    setPermissionPermanentlyDenied(false); // Réinitialiser cet état avant une nouvelle tentative

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
              deniedPermanently = true; // On considère que c'est un refus permanent sur le web pour cette session
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

    // Code natif pour iOS/Android
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Permission de géolocalisation refusée');
        setHasPermission(false);
        // Vérifier si la permission est refusée "pour toujours"
        const { canAskAgain } = await Location.getForegroundPermissionsAsync();
        setPermissionPermanentlyDenied(!canAskAgain);
        setLoading(false);
        
        if (!canAskAgain) {
          Alert.alert(
            'Permission requise',
            "Silagora a besoin d'accéder à votre position pour fonctionner. Veuillez l'activer manuellement dans les paramètres de votre appareil.",
            [{ text: 'Compris', style: 'cancel' }]
          );
        } else {
          // Si on peut encore demander, l'alerte a déjà été gérée par l'écran de bienvenue
          // Ou on pourrait ajouter une petite alerte moins intrusive si nécessaire
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
      setPermissionPermanentlyDenied(false); // S'il y a une erreur technique, ce n'est pas un refus permanent de l'utilisateur
      console.error('LocationContext: Erreur de géolocalisation:', err);
    } finally {
      setLoading(false);
    }
  };

  const watchLocation = async () => {
    // Ne pas démarrer le suivi si la permission est refusée en permanence ou non accordée
    if (!hasPermission || permissionPermanentlyDenied) {
      console.log("LocationContext: Ne peut pas démarrer le suivi. Permission non accordée ou refusée en permanence.");
      return;
    }

    // Arrêter l'ancienne souscription si elle existe
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
  // S'assure que le suivi ne démarre qu'une seule fois
  useEffect(() => {
    if (hasPermission && !watchSubscription && location) {
      watchLocation();
    }
  }, [hasPermission, watchSubscription, location]);

  // Si la localisation n'est pas disponible ou l'erreur est permanente, ne pas afficher loading
  const effectiveLoading = loading && !permissionPermanentlyDenied;

  const value: LocationContextType = {
    location,
    loading: effectiveLoading, // Utilisez effectiveLoading
    error,
    requestLocation,
    watchLocation,
    stopWatchingLocation,
    hasPermission,
    permissionPermanentlyDenied, // Expose le nouvel état
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