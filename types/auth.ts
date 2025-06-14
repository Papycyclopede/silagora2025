// types/auth.ts

export interface User {
  id: string;
  email?: string;
  phone?: string;
  pseudo?: string;
  createdAt: Date;
  lastLoginAt: Date;
  isVerified: boolean;
  preferredContact: 'email' | 'phone';
  isMaster?: boolean;
  premiumAccess?: boolean;
  unlimitedTickets?: boolean;
  ticketCount?: number;
  premiumUsageCredits?: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// L'interface OTPVerification doit avoir 'contact' et 'type' comme 'string' car ils sont toujours présents
export interface OTPVerification {
  code: string;
  contact: string; 
  type: 'email' | 'phone'; 
  expiresAt: Date;
  attempts: number;
}

export interface CreateAccountData {
  contact: string;
  type: 'email' | 'phone';
  pseudo?: string;
}

export interface LoginData {
  contact: string;
  type: 'email' | 'phone';
}