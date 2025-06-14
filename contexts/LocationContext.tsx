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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionPermanentlyDenied, setPermissionPermanentlyDenied] = useState(false);
  const [watchSubscription, setWatchSubscription] = useState<Location.LocationSubscription | null>(null);
  const [isLocationReady, setIsLocationReady] = useState(false); // Nouveau statut

  // Réf pour s'assurer que la demande initiale de permission ne se déclenche qu'une fois.
  const initialPermissionCheckCompleted = useRef(false);

  // 1. Vérifie la permission au premier montage et tente d'obtenir la position si permise.
  useEffect(() => {
    const checkAndGetInitialLocation = async () => {
      if (initialPermissionCheckCompleted.current) return; // S'assure que cela ne s'exécute qu'une seule fois
      initialPermissionCheckCompleted.current = true;

      setLoading(true); // Indiquer le chargement dès le début de la vérification

      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setError('Géolocalisation non supportée par ce navigateur');
          setHasPermission(false);
          setIsLocationReady(true);
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

      // Logique Native (iOS/Android)
      try {
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

        if (status === 'granted') {
          setHasPermission(true);
          setPermissionPermanentlyDenied(false);
          setError(null);

          // Tenter d'obtenir la position immédiatement si la permission est déjà accordée.
          // Laisser le setLoading à true pendant cette acquisition.
          try {
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
              timeInterval: 1000, // Attendre max 1s pour une position
              // Ne pas utiliser `maximumAge` si vous voulez toujours la position la plus fraîche pour l'initialisation.
            });
            const newLocation = { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude, accuracy: currentLocation.coords.accuracy || undefined };
            setLocation(newLocation);
            console.log('LocationContext: Position obtenue:', newLocation);
          } catch (posError: any) {
            // Gérer les erreurs de positionnement même si la permission est accordée (ex: GPS désactivé)
            if (posError.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
                setError("Paramètres de localisation non satisfaits. Le GPS est peut-être désactivé.");
                Alert.alert(
                    "GPS Désactivé",
                    "Veuillez activer le GPS de votre appareil pour utiliser toutes les fonctionnalités de l'application.",
                    [{ text: "OK" }]
                );
            } else {
                setError("Impossible d'obtenir la localisation initiale.");
                console.error('LocationContext: Erreur lors de la position initiale:', posError);
            }
            setLocation(null); // S'assurer que la localisation est nulle en cas d'erreur
          } finally {
            setLoading(false); // Fin du chargement après la tentative d'acquisition de position
            setIsLocationReady(true); // Le contexte est prêt à être utilisé
          }
        } else {
          // Permission non accordée (soit denied, soit undeterminded, soit limited)
          setHasPermission(false);
          setPermissionPermanentlyDenied(!canAskAgain); // Si canAskAgain est false, c'est permanent.
          setError("Permission de géolocalisation non accordée.");
          setLoading(false); // Fin du chargement
          setIsLocationReady(true); // Le contexte est prêt à être utilisé, mais sans permission
        }
      } catch (err) {
        console.error('LocationContext: Erreur lors de la vérification de permission:', err);
        setError("Erreur interne de permission de localisation.");
        setHasPermission(false);
        setPermissionPermanentlyDenied(false);
        setLoading(false); // Fin du chargement
        setIsLocationReady(true); // Le contexte est prêt à être utilisé
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
      // Logique spécifique au web inchangée, elle est déjà non bloquante ici.
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
        setPermissionPermanentlyDenied(!canAskAgain);
        
        if (!canAskAgain) { // Si la permission est refusée de manière permanente, afficher une alerte claire.
          Alert.alert(
            "Permission requise",
            "Silagora a besoin d'accéder à votre position pour fonctionner. Veuillez l'activer manuellement dans les paramètres de votre appareil.",
            [{ text: 'Compris', style: 'cancel' }]
          );
        }
        setLoading(false);
        setLocation(null); // S'assurer que la localisation est nulle si la permission n'est pas accordée
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
      // Gérer les erreurs spécifiques comme le GPS désactivé
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
      setHasPermission(false); // La permission peut avoir été accordée, mais la position non obtenue.
      setLocation(null); // S'assurer que la localisation est nulle en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  const watchLocation = async () => {
    if (!hasPermission || permissionPermanentlyDenied) {
      console.log("LocationContext: Ne peut pas démarrer le suivi. Permission non accordée ou refusée en permanence.");
      stopWatchingLocation(); // S'assurer d'arrêter tout suivi si les conditions ne sont pas remplies
      return;
    }
    if (watchSubscription) { // Si déjà un abonnement, ne rien faire
      console.log("LocationContext: Suivi déjà actif.");
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
  // et que le `LocationProvider` est marqué comme prêt
  useEffect(() => {
    // Le suivi ne démarre que si:
    // - La permission est accordée
    // - Le contexte de localisation est initialement "prêt" (isLocationReady)
    // - Une position a été obtenue (location n'est pas null)
    // - Aucun abonnement de suivi n'est déjà actif
    if (hasPermission && isLocationReady && location && !watchSubscription) {
      watchLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, isLocationReady, location, watchSubscription]);

  // `effectiveLoading` est à `true` si `loading` est `true` ET que la permission n'est pas refusée de manière permanente.
  // Cela signifie que nous sommes activement en train de chercher la localisation ou la permission.
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
