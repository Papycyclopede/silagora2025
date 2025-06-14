import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, AuthState, CreateAccountData, LoginData, OTPVerification } from '@/types/auth';

interface AuthContextType extends AuthState {
  createAccount: (data: CreateAccountData) => Promise<{ success: boolean; error?: string }>;
  login: (data: LoginData) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendOTP: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  createMasterAccount: () => Promise<{ success: boolean; error?: string }>;
  spendTicket: () => Promise<boolean>;
  addPremiumCredit: () => Promise<void>;
  spendPremiumCredit: () => Promise<boolean>;
  pendingVerification: OTPVerification | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState<OTPVerification | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      setIsLoading(true);
      const storedUser = await AsyncStorage.getItem('@souffle:user');
      const storedAuth = await AsyncStorage.getItem('@souffle:authenticated');
      
      if (storedUser && storedAuth === 'true') {
        const userData = JSON.parse(storedUser);
        
        if (typeof userData.ticketCount === 'undefined') userData.ticketCount = 3;
        if (typeof userData.premiumUsageCredits === 'undefined') userData.premiumUsageCredits = 0;
        
        setUser({
          ...userData,
          createdAt: new Date(userData.createdAt),
          lastLoginAt: new Date(userData.lastLoginAt),
        });
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'authentification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOTP = async (contact: string, type: 'email' | 'phone'): Promise<string> => {
    const code = generateOTP();
    console.log(`OTP envoyé à ${contact}: ${code}`);
    if (type === 'email') {
      console.log(`Email OTP envoyé à ${contact}: ${code}`);
    } else {
      console.log(`SMS OTP envoyé à ${contact}: ${code}`);
    }
    return code;
  };

  const createMasterAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const masterUser: User = {
        id: `master_${Date.now()}`,
        email: 'demo@lesouffle.app',
        pseudo: 'Développeur Démo',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isVerified: true,
        preferredContact: 'email',
        isMaster: true,
        premiumAccess: true,
        unlimitedTickets: true, 
        ticketCount: 99,
        premiumUsageCredits: 5,
      };

      setUser(masterUser);
      setIsAuthenticated(true);
      
      await AsyncStorage.setItem('@souffle:user', JSON.stringify(masterUser));
      await AsyncStorage.setItem('@souffle:authenticated', 'true');

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la création du compte maître:', error);
      return { success: false, error: 'Erreur lors de la création du compte maître' };
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async (data: CreateAccountData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      if (data.type === 'email' && !isValidEmail(data.contact)) {
        return { success: false, error: 'Adresse email invalide' };
      }
      if (data.type === 'phone' && !isValidPhone(data.contact)) {
        return { success: false, error: 'Numéro de téléphone invalide' };
      }
      const existingUsers = await AsyncStorage.getItem('@souffle:users');
      const users = existingUsers ? JSON.parse(existingUsers) : [];
      const existingUser = users.find((u: User) => 
        (u.email === data.contact && data.type === 'email') ||
        (u.phone === data.contact && data.type === 'phone')
      );
      if (existingUser) {
        return { success: false, error: 'Un compte existe déjà avec ce contact' };
      }
      const otpCode = await sendOTP(data.contact, data.type);
      const verification: OTPVerification = {
        code: otpCode,
        contact: data.contact,
        type: data.type,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      };
      setPendingVerification(verification);
      await AsyncStorage.setItem('@souffle:pending_account', JSON.stringify({
        ...data,
        verification,
      }));
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
      return { success: false, error: 'Erreur lors de la création du compte' };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      const existingUsers = await AsyncStorage.getItem('@souffle:users');
      const users = existingUsers ? JSON.parse(existingUsers) : [];
      const existingUser = users.find((u: User) => 
        (u.email === data.contact && data.type === 'email') ||
        (u.phone === data.contact && data.type === 'phone')
      );
      if (!existingUser) {
        return { success: false, error: 'Aucun compte trouvé avec ce contact' };
      }
      const otpCode = await sendOTP(data.contact, data.type);
      const verification: OTPVerification = {
        code: otpCode,
        contact: data.contact,
        type: data.type,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      };
      setPendingVerification(verification);
      await AsyncStorage.setItem('@souffle:pending_login', JSON.stringify({
        userId: existingUser.id,
        verification,
      }));
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return { success: false, error: 'Erreur lors de la connexion' };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!pendingVerification) {
        return { success: false, error: 'Aucune vérification en cours' };
      }
      if (new Date() > pendingVerification.expiresAt) {
        setPendingVerification(null);
        await AsyncStorage.removeItem('@souffle:pending_account');
        await AsyncStorage.removeItem('@souffle:pending_login');
        return { success: false, error: 'Le code a expiré. Veuillez en demander un nouveau.' };
      }
      if (pendingVerification.attempts >= 5) {
        setPendingVerification(null);
        await AsyncStorage.removeItem('@souffle:pending_account');
        await AsyncStorage.removeItem('@souffle:pending_login');
        return { success: false, error: 'Trop de tentatives. Veuillez recommencer.' };
      }
      if (code !== pendingVerification.code) {
        const updatedVerification = { ...pendingVerification, attempts: pendingVerification.attempts + 1 };
        setPendingVerification(updatedVerification);
        return { success: false, error: `Code incorrect. ${5 - updatedVerification.attempts} tentatives restantes.` };
      }

      const pendingAccount = await AsyncStorage.getItem('@souffle:pending_account');
      const pendingLogin = await AsyncStorage.getItem('@souffle:pending_login');

      if (pendingAccount) {
        const accountData = JSON.parse(pendingAccount);
        const newUser: User = {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: accountData.type === 'email' ? accountData.contact : undefined,
          phone: accountData.type === 'phone' ? accountData.contact : undefined,
          pseudo: accountData.pseudo || undefined,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          isVerified: true,
          preferredContact: accountData.type,
          ticketCount: 3,
          premiumUsageCredits: 0,
        };
        const existingUsers = await AsyncStorage.getItem('@souffle:users');
        const users = existingUsers ? JSON.parse(existingUsers) : [];
        users.push(newUser);
        await AsyncStorage.setItem('@souffle:users', JSON.stringify(users));
        setUser(newUser);
        setIsAuthenticated(true);
        await AsyncStorage.setItem('@souffle:user', JSON.stringify(newUser));
        await AsyncStorage.setItem('@souffle:authenticated', 'true');
      } else if (pendingLogin) {
        const loginData = JSON.parse(pendingLogin);
        const existingUsers = await AsyncStorage.getItem('@souffle:users');
        const users = existingUsers ? JSON.parse(existingUsers) : [];
        const userToLogin = users.find((u: User) => u.id === loginData.userId);
        if (userToLogin) {
          const updatedUser = { ...userToLogin, lastLoginAt: new Date(), createdAt: new Date(userToLogin.createdAt) };
          const updatedUsers = users.map((u: User) => u.id === userToLogin.id ? updatedUser : u);
          await AsyncStorage.setItem('@souffle:users', JSON.stringify(updatedUsers));
          setUser(updatedUser);
          setIsAuthenticated(true);
          await AsyncStorage.setItem('@souffle:user', JSON.stringify(updatedUser));
          await AsyncStorage.setItem('@souffle:authenticated', 'true');
        }
      }

      setPendingVerification(null);
      await AsyncStorage.removeItem('@souffle:pending_account');
      await AsyncStorage.removeItem('@souffle:pending_login');

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la vérification OTP:', error);
      return { success: false, error: 'Erreur lors de la vérification' };
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!pendingVerification) return { success: false, error: 'Aucune vérification en cours' };
      const newCode = await sendOTP(pendingVerification.contact, pendingVerification.type);
      const newVerification: OTPVerification = { ...pendingVerification, code: newCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 };
      setPendingVerification(newVerification);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors du renvoi OTP:', error);
      return { success: false, error: 'Erreur lors du renvoi du code' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setUser(null);
      setIsAuthenticated(false);
      setPendingVerification(null);
      await AsyncStorage.multiRemove(['@souffle:user', '@souffle:authenticated', '@souffle:pending_account', '@souffle:pending_login']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'Utilisateur non connecté' };
      const updatedUser = { ...user, ...data };
      const existingUsers = await AsyncStorage.getItem('@souffle:users');
      let users = existingUsers ? JSON.parse(existingUsers) : [];
      const userIndex = users.findIndex((u: User) => u.id === user.id);
      if (userIndex > -1) {
        users[userIndex] = updatedUser;
      } else {
        users.push(updatedUser);
      }
      await AsyncStorage.setItem('@souffle:users', JSON.stringify(users));
      await AsyncStorage.setItem('@souffle:user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }
  };

  const spendTicket = async (): Promise<boolean> => {
    if (!user || !isAuthenticated) return false;
    if (user.unlimitedTickets) return true;
    const currentTickets = user.ticketCount || 0;
    if (currentTickets <= 0) return false;
    await updateProfile({ ticketCount: currentTickets - 1 });
    return true;
  };
  
  const addPremiumCredit = async (): Promise<void> => {
    if (!user) return;
    const newCredits = (user.premiumUsageCredits || 0) + 1;
    await updateProfile({ premiumUsageCredits: newCredits });
  };

  const spendPremiumCredit = async (): Promise<boolean> => {
    if (!user) return false;
    const currentCredits = user.premiumUsageCredits || 0;
    if (currentCredits <= 0) return false;
    await updateProfile({ premiumUsageCredits: currentCredits - 1 });
    return true;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    pendingVerification,
    createAccount,
    login,
    verifyOTP,
    resendOTP,
    logout,
    updateProfile,
    createMasterAccount,
    spendTicket,
    addPremiumCredit,
    spendPremiumCredit,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  // CORRIGÉ : Le '}' a été remplacé par ']'
  const phoneRegex = /^(\+33|0)[1-9](\d{8})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}