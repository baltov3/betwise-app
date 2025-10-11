'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  role: string;
  referralCode: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  age?: number;
  city?: string;
  country?: string;
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeChargesEnabled?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  referralCode: string;
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
  // age се изпраща, но backend така или иначе смята сам от birthDate
  age: number;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  // register вече НЕ сетва token/user, само извиква API и връща флагове
  register: (payload: RegisterPayload) => Promise<{ stripeOnboardingUrl?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
    } catch {
      localStorage.removeItem('token');
      delete (api.defaults.headers as any).Authorization;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, token } = response.data.data;
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
  };

  const register = async (payload: RegisterPayload) => {
    const response = await api.post('/auth/register', payload);
    const { stripeOnboardingUrl } = response.data.data;
    // НЕ пазим token/user тук, за да върнем към /login
    return { stripeOnboardingUrl };
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete (api.defaults.headers as any).Authorization;
    setUser(null);
  };

  const value = { user, loading, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}