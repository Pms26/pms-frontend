import { create } from 'zustand';
import type { User } from '@/types';
import {
  getProfileApi,
  loginApi,
  logoutApi,
  refreshTokenApi
} from '@/lib/api/auth';
import { setAccessToken } from '@/lib/api/client';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (user: User, token: string) => void;
  hydrate: () => Promise<void>;
}

const clearLocalSession = () => {
  setAccessToken(null);
  localStorage.removeItem('pms-token');
  document.cookie =
    'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

const persistAccessToken = (token: string) => {
  setAccessToken(token);
  localStorage.setItem('pms-token', token);
  document.cookie = `token=${token}; path=/; max-age=900; SameSite=Lax`;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrating: true,

  login: async (email, password) => {
    const { token, user } = await loginApi(email, password);

    persistAccessToken(token);

    set({
      user,
      token,
      isAuthenticated: true
    });
  },

  logout: async () => {
    try {
      await logoutApi();
    } finally {
      clearLocalSession();

      set({
        user: null,
        token: null,
        isAuthenticated: false
      });

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },

  setAuth: (user, token) => {
    persistAccessToken(token);

    set({
      user,
      token,
      isAuthenticated: true
    });
  },

  hydrate: async () => {
    if (typeof window === 'undefined') {
      return;
    }

    set({ isHydrating: true });

    try {
      let token = localStorage.getItem('pms-token');

      if (!token) {
        token = await refreshTokenApi();
        persistAccessToken(token);
      } else {
        setAccessToken(token);
      }

      const user = await getProfileApi();

      set({
        user,
        token,
        isAuthenticated: true,
        isHydrating: false
      });
    } catch {
      clearLocalSession();

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isHydrating: false
      });
    }
  }
}));