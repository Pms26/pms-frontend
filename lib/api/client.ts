// ═══════════════════════════════════════════════════════════
// OASIS PMS — Axios API Client
// Point d'entrée unique vers api-gateway (port 4000)
// Le frontend ne parle JAMAIS directement aux services individuels.
// ═══════════════════════════════════════════════════════════

import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: injecte le JWT automatiquement ───
apiClient.interceptors.request.use(
  (config) => {
    // En environnement client uniquement
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms-token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: gère les 401 (token expiré) ────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token invalide ou expiré → nettoyage + redirect login
      localStorage.removeItem('pms-token');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// ─── Helper: vérifie si on utilise les mocks ───────────────
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

// ─── Helper: simule un délai réseau pour les mocks ─────────
export function mockDelay(ms: number = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
