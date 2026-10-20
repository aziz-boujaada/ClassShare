import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  unreadCount: number;
  login: (email: string, password?: string) => Promise<void>;
  register: (data: { full_name: string; email: string; password?: string; study_program?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUser = async () => {
    try {
      const u = await api.getCurrentUser();
      setUser(u);
    } catch (e) {
      console.error('Error fetching user:', e);
      setUser(null);
    }
  };

  const refreshUnreadCount = async () => {
    try {
      const count = await api.getUnreadCount();
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshUser();
      await refreshUnreadCount();
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password?: string) => {
    const u = await api.login(email, password);
    setUser(u);
    await refreshUnreadCount();
  };

  const register = async (data: { full_name: string; email: string; password?: string; study_program?: string }) => {
    const u = await api.register(data);
    setUser(u);
    await refreshUnreadCount();
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setUnreadCount(0);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    const updated = await api.updateProfile(updates);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        unreadCount,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
        refreshUnreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
