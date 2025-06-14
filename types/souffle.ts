// types/souffle.ts

export interface SouffleContent {
  jeMeSens: string;
  messageLibre: string;
  ceQueJaimerais: string;
}

export interface Souffle {
  id: string;
  content: SouffleContent;
  latitude: number;
  longitude: number;
  createdAt: Date;
  expiresAt: Date;
  isRevealed: boolean;
  reportCount?: number;
  sticker?: string;
  backgroundId?: string;
  hasBeenRead?: boolean;
  isSimulated?: boolean;
}

export interface SuspendedTicket {
  id: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  expiresAt: Date;
  isClaimed: boolean;
  isSystemGenerated?: boolean; // CORRECTION : Ajout de la propriété optionnelle
}

export interface CreateSouffleData {
  content: SouffleContent;
  latitude: number;
  longitude: number;
  duration: 24 | 48;
  sticker?: string;
  backgroundId?: string;
}

export interface EchoPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  souffleCount: number;
  description?: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface SouffleStats {
  totalDeposited: number;
  totalRead: number;
  activeNearby: number;
}