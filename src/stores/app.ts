import { create } from 'zustand';
import { User } from '../lib/api';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  isReady: boolean;
  setIsReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  token: null,
  setToken: (token) => set({ token }),
  loading: true,
  setLoading: (loading) => set({ loading }),
  isReady: false,
  setIsReady: (isReady) => set({ isReady }),
}));
