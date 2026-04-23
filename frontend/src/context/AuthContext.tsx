import { createContext, useContext } from 'react';

export interface User {
  id: number;
  email: string;
  createdAt?: string;
  avatar_url?: string;
  provider: string;
  send_expiration_notifications: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, recaptchaToken: string) => Promise<void>;
  logout: () => Promise<void>;
  socialLogin: (provider: 'google' | 'github') => void;
  setTokenFromCallback: (token: string) => Promise<string>;
  clearError: () => void;
  updateAvatar: (url: string) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
