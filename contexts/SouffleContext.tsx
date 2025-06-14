import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import type { Souffle, CreateSouffleData, EchoPlace, SouffleStats, SuspendedTicket } from '@/types/souffle';
import { useLocation } from './LocationContext';
import { useAuth } from './AuthContext';
import { SouffleStorage } from '@/utils/storage';
import { generateInitialSouffleBatch, generateRandomSouffle, generatePoeticalPlaceName } from '@/utils/souffleSimulator';
import { calculateDistance } from '@/utils/distance';

interface SouffleContextType {
  souffles: Souffle[];
  echoPlaces: EchoPlace[];
  suspendedTickets: SuspendedTicket[];
  stats: SouffleStats;
  loading: boolean;
  createSouffle: (data: CreateSouffleData) => Promise<{ success: boolean; error?: string }>;
  revealSouffle: (id: string) => Promise<void>;
  reportSouffle: (id: string) => Promise<void>;
  refreshSouffles: () => Promise<void>;
  getSoufflesNearLocation: (lat: number, lon: number, radius?: number) => Souffle[];
  getEchoPlacesNearLocation: (lat: number, lon: number, radius?: number) => EchoPlace[];
  placeSuspendedTicket: () => Promise<void>;
  claimSuspendedTicket: (ticketId: string) => Promise<boolean>;
  clearSimulatedSouffles: () => Promise<void>; // NOUVELLE FONCTION
}

const SouffleContext = createContext<SouffleContextType | undefined>(undefined);

export function SouffleProvider({ children }: { children: ReactNode }) {
  const [souffles, setSouffles] = useState<Souffle[]>([]);
  const [echoPlaces, setEchoPlaces] = useState<EchoPlace[]>([]);
  const [suspendedTickets, setSuspendedTickets] = useState<SuspendedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { location } = useLocation();
  const { addPremiumCredit } = useAuth();
  const dataInitialized = useRef(false);

  const stats: SouffleStats = {
    totalDeposited: souffles.length,
    totalRead: souffles.filter(s => s.hasBeenRead).length,
    activeNearby: souffles.filter(s => new Date() < new Date(s.expiresAt)).length,
  };
  
  useEffect(() => {
    const initData = async () => {
      if (location && !dataInitialized.current) {
        setLoading(true);
        dataInitialized.current = true;
        
        let existingSouffles = await SouffleStorage.loadSouffles();
        if (existingSouffles.length === 0) {
          console.log("SIMULATION: Génération du lot initial de souffles.");
          existingSouffles = generateInitialSouffleBatch(location, 20);
          await SouffleStorage.saveSouffles(existingSouffles);
        }
        const activeSouffles = cleanupExpiredItems(existingSouffles) as Souffle[];
        setSouffles(activeSouffles);
        updateEchoPlaces(activeSouffles);

        const existingTickets = await SouffleStorage.loadSuspendedTickets();
        const activeTickets = cleanupExpiredItems(existingTickets) as SuspendedTicket[];
        setSuspendedTickets(activeTickets);
        
        setLoading(false);
      }
    };
    initData();
  }, [location]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (location && souffles.length > 0) {
        const newSouffle = generateRandomSouffle(location);
        setSouffles(prevSouffles => {
          const updatedSouffles = [...prevSouffles, newSouffle];
          SouffleStorage.saveSouffles(updatedSouffles);
          updateEchoPlaces(updatedSouffles);
          return updatedSouffles;
        });
      }
    }, 90000);
    return () => clearInterval(timer);
  }, [location, souffles]);

  const cleanupExpiredItems = (items: Array<{ expiresAt: Date }>): Array<any> => {
    const now = new Date();
    return items.filter(item => new Date(item.expiresAt) > now);
  };

  const updateEchoPlaces = (currentSouffles: Souffle[]) => {
    const locationGroups: { [key: string]: Souffle[] } = {};
    const PROXIMITY_RADIUS_METERS = 50;
    const ECHO_THRESHOLD = 3;

    currentSouffles.forEach(souffle => {
        let addedToGroup = false;
        for (const key in locationGroups) {
            const groupCenter = locationGroups[key][0];
            if (calculateDistance(souffle.latitude, souffle.longitude, groupCenter.latitude, groupCenter.longitude) < PROXIMITY_RADIUS_METERS) {
                locationGroups[key].push(souffle);
                addedToGroup = true;
                break;
            }
        }
        if (!addedToGroup) {
            const newKey = `${souffle.latitude.toFixed(4)}_${souffle.longitude.toFixed(4)}`;
            locationGroups[newKey] = [souffle];
        }
    });

    const newEchoPlaces: EchoPlace[] = Object.values(locationGroups)
        .filter(group => group.length >= ECHO_THRESHOLD)
        .map(group => {
            const avgLat = group.reduce((sum, s) => sum + s.latitude, 0) / group.length;
            const avgLon = group.reduce((sum, s) => sum + s.longitude, 0) / group.length;
            const id = `echo_${avgLat.toFixed(5)}_${avgLon.toFixed(5)}`;
            return { id, name: generatePoeticalPlaceName(), latitude: avgLat, longitude: avgLon, souffleCount: group.length, description: `${group.length} souffles se croisent en ce lieu.` };
        });
    
    setEchoPlaces(newEchoPlaces);
    SouffleStorage.saveEchoPlaces(newEchoPlaces);
  };

  const createSouffle = async (data: CreateSouffleData): Promise<{ success: boolean; error?: string }> => {
    if (!location) return { success: false, error: "Localisation introuvable." };
    const newSouffle: Souffle = {
      id: `user_${Date.now()}`,
      content: data.content,
      latitude: location.latitude,
      longitude: location.longitude,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + data.duration * 60 * 60 * 1000),
      isRevealed: false, isSimulated: false, hasBeenRead: false,
      sticker: data.sticker, backgroundId: data.backgroundId,
    };
    const updatedSouffles = [...souffles, newSouffle];
    setSouffles(updatedSouffles);
    updateEchoPlaces(updatedSouffles);
    await SouffleStorage.saveSouffles(updatedSouffles);
    return { success: true };
  };

  const placeSuspendedTicket = async (): Promise<void> => {
    if (!location) return;
    const newTicket: SuspendedTicket = {
      id: `suspended_ticket_${Date.now()}`,
      latitude: location.latitude,
      longitude: location.longitude,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      isClaimed: false,
    };
    const updatedTickets = [...suspendedTickets, newTicket];
    setSuspendedTickets(updatedTickets);
    await SouffleStorage.saveSuspendedTickets(updatedTickets);
  };

  const claimSuspendedTicket = async (ticketId: string): Promise<boolean> => {
    const ticketToClaim = suspendedTickets.find(t => t.id === ticketId && !t.isClaimed);
    if (!ticketToClaim) return false;
    await addPremiumCredit();
    const updatedTickets = suspendedTickets.filter(t => t.id !== ticketId);
    setSuspendedTickets(updatedTickets);
    await SouffleStorage.saveSuspendedTickets(updatedTickets);
    return true;
  };

  const revealSouffle = async (id: string) => {
    const updatedSouffles = souffles.map(s => s.id === id ? { ...s, isRevealed: true, hasBeenRead: true } : s);
    setSouffles(updatedSouffles);
    await SouffleStorage.saveSouffles(updatedSouffles);
    const revealedIds = await SouffleStorage.loadRevealedSouffles();
    if (!revealedIds.includes(id)) await SouffleStorage.saveRevealedSouffles([...revealedIds, id]);
  };
  
  const reportSouffle = async (id: string) => {
      const updatedSouffles = souffles.filter(s => s.id !== id);
      setSouffles(updatedSouffles);
      updateEchoPlaces(updatedSouffles);
      await SouffleStorage.saveSouffles(updatedSouffles);
  };

  const refreshSouffles = async () => {
    setLoading(true);
    const storedSouffles = await SouffleStorage.loadSouffles();
    const activeSouffles = cleanupExpiredItems(storedSouffles) as Souffle[];
    setSouffles(activeSouffles);
    updateEchoPlaces(activeSouffles);
    setLoading(false);
  };
  
  // NOUVELLE FONCTION AJOUTÉE
  const clearSimulatedSouffles = async (): Promise<void> => {
    setLoading(true);
    try {
      // On ne garde que les souffles qui ne sont PAS simulés.
      // Un souffle est considéré comme non simulé s'il n'a pas la propriété `isSimulated` ou si elle est fausse.
      const userSouffles = souffles.filter(s => !s.isSimulated);

      setSouffles(userSouffles);
      updateEchoPlaces(userSouffles);
      await SouffleStorage.saveSouffles(userSouffles);
    } catch (e) {
      console.error("Erreur lors du nettoyage des souffles simulés:", e);
    } finally {
      setLoading(false);
    }
  };

  const getSoufflesNearLocation = (lat: number, lon: number, radius: number = 2000): Souffle[] => souffles.filter(s => calculateDistance(lat, lon, s.latitude, s.longitude) <= radius);
  const getEchoPlacesNearLocation = (lat: number, lon: number, radius: number = 2000): EchoPlace[] => echoPlaces.filter(p => calculateDistance(lat, lon, p.latitude, p.longitude) <= radius);

  const value: SouffleContextType = {
    souffles, echoPlaces, suspendedTickets, stats, loading,
    createSouffle, revealSouffle, reportSouffle, refreshSouffles,
    getSoufflesNearLocation, getEchoPlacesNearLocation,
    placeSuspendedTicket, claimSuspendedTicket,
    clearSimulatedSouffles, // Exportée dans le contexte
  };

  return (
    <SouffleContext.Provider value={value}>
      {children}
    </SouffleContext.Provider>
  );
}

export function useSouffle() {
  const context = useContext(SouffleContext);
  if (!context) throw new Error('useSouffle doit être utilisé à l\'intérieur d\'un SouffleProvider');
  return context;
}