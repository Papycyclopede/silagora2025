import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Souffle, EchoPlace, SuspendedTicket } from '@/types/souffle'; // MODIFIÉ

const STORAGE_KEYS = {
  SOUFFLES: '@souffle:souffles',
  ECHO_PLACES: '@souffle:echo_places',
  USER_STATS: '@souffle:user_stats',
  REVEALED_SOUFFLES: '@souffle:revealed_souffles',
  SUSPENDED_TICKETS: '@souffle:suspended_tickets', // NOUVEAU
} as const;

export class SouffleStorage {
  static async saveSouffles(souffles: Souffle[]): Promise<void> {
    try {
      const serializedSouffles = souffles.map(souffle => ({
        ...souffle,
        createdAt: souffle.createdAt.toISOString(),
        expiresAt: souffle.expiresAt.toISOString(),
      }));
      await AsyncStorage.setItem(STORAGE_KEYS.SOUFFLES, JSON.stringify(serializedSouffles));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des souffles:', error);
    }
  }

  static async loadSouffles(): Promise<Souffle[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SOUFFLES);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return parsed.map((souffle: any) => ({
        ...souffle,
        createdAt: new Date(souffle.createdAt),
        expiresAt: new Date(souffle.expiresAt),
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des souffles:', error);
      return [];
    }
  }

  static async saveEchoPlaces(places: EchoPlace[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ECHO_PLACES, JSON.stringify(places));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des lieux d\'écho:', error);
    }
  }

  static async loadEchoPlaces(): Promise<EchoPlace[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ECHO_PLACES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors du chargement des lieux d\'écho:', error);
      return [];
    }
  }

  static async saveRevealedSouffles(revealedIds: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REVEALED_SOUFFLES, JSON.stringify(revealedIds));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des souffles révélés:', error);
    }
  }

  static async loadRevealedSouffles(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.REVEALED_SOUFFLES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors du chargement des souffles révélés:', error);
      return [];
    }
  }

  // NOUVEAU : Sauvegarder les tickets suspendus
  static async saveSuspendedTickets(tickets: SuspendedTicket[]): Promise<void> {
    try {
      const serializedTickets = tickets.map(ticket => ({
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        expiresAt: ticket.expiresAt.toISOString(),
      }));
      await AsyncStorage.setItem(STORAGE_KEYS.SUSPENDED_TICKETS, JSON.stringify(serializedTickets));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des tickets suspendus:', error);
    }
  }

  // NOUVEAU : Charger les tickets suspendus
  static async loadSuspendedTickets(): Promise<SuspendedTicket[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SUSPENDED_TICKETS);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return parsed.map((ticket: any) => ({
        ...ticket,
        createdAt: new Date(ticket.createdAt),
        expiresAt: new Date(ticket.expiresAt),
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des tickets suspendus:', error);
      return [];
    }
  }

  static async clearExpiredSouffles(): Promise<void> {
    try {
      const souffles = await this.loadSouffles();
      const now = new Date();
      const activeSouffles = souffles.filter(souffle => souffle.expiresAt > now);
      await this.saveSouffles(activeSouffles);
    } catch (error) {
      console.error('Erreur lors du nettoyage des souffles expirés:', error);
    }
  }
}