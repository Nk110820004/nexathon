'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  points: number;
  streak: number;
}

interface Goals {
  target_calories: number;
  target_protein: number;
  target_water: number;
  target_workout_minutes: number;
}

interface UserContextType {
  user: User | null;
  goals: Goals | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  updateGoals: (newGoals: Goals) => void;
  updatePoints: (newPoints: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setGoals(data.goals);
      } else {
        setUser(null);
        setGoals(null);
      }
    } catch (error) {
      console.error('Failed to fetch user context:', error);
      setUser(null);
      setGoals(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setGoals(null);
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const updateGoals = (newGoals: Goals) => {
    setGoals(newGoals);
  };

  const updatePoints = (newPoints: number) => {
    if (user) {
      setUser({ ...user, points: newPoints });
    }
  };

  useEffect(() => {
    refreshUser();
  }, [pathname]); // Refresh user details on page navigation

  return (
    <UserContext.Provider
      value={{
        user,
        goals,
        loading,
        refreshUser,
        logout,
        updateGoals,
        updatePoints,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
