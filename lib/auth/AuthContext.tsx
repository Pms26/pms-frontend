// ═══════════════════════════════════════════════════════════
// OASIS PMS — Auth Store (Zustand)
// Gère l'état global de l'utilisateur connecté : token, rôle, etc.
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { User, UserRole } from '@/types';

interface AuthStore {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setAuth: (user: User, token: string) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  // ─── Login: envoie les credentials, stocke le token ─────
  login: async (username: string, password: string) => {
    // Import dynamique pour éviter les dépendances circulaires
    const { loginApi } = await import('@/lib/api/auth');
    const { token, user } = await loginApi(username, password);

    // Persister dans localStorage + cookie (cookie lu par middleware SSR)
    localStorage.setItem('pms-token', token);
    document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    set({ user, token, isAuthenticated: true });
  },

  // ─── Logout: nettoie tout ───────────────────────────────
  logout: () => {
    localStorage.removeItem('pms-token');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    set({ user: null, token: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  // ─── Set auth directement (utile après refresh) ─────────
  setAuth: (user: User, token: string) => {
    set({ user, token, isAuthenticated: true });
  },

  // ─── Hydrate: restaure l'état depuis localStorage ───────
  hydrate: () => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('pms-token');
    if (!token) return;

    // Décoder le payload JWT (sans vérification de signature côté client)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const user: User = {
        id: payload.id || 1,
        username: payload.username || 'admin',
        name: payload.name || 'Sidi Omar',
        role: (payload.role as UserRole) || 'admin',
        email: payload.email,
      };
      set({ user, token, isAuthenticated: true });
    } catch {
      // Token invalide → nettoyage
      localStorage.removeItem('pms-token');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  },
}));
