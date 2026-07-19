// ═══════════════════════════════════════════════════════════
// OASIS PMS — Auth API (login/logout)
// Mock: génère un faux JWT avec les infos utilisateur
// Réel: POST /api/auth/login vers api-gateway
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { LoginResponse, User } from '@/types';

// ─── Mock: utilisateurs simulés ──────────────────────────

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  admin: {
    password: '1234',
    user: { id: 1, username: 'admin', name: 'Sidi Omar', role: 'admin', email: 'admin@oasis-pms.ma' },
  },
  reception: {
    password: '1234',
    user: { id: 2, username: 'reception', name: 'Fatima Zahra', role: 'reception', email: 'reception@oasis-pms.ma' },
  },
  housekeeping: {
    password: '1234',
    user: { id: 3, username: 'housekeeping', name: 'Youssef B.', role: 'housekeeping', email: 'hk@oasis-pms.ma' },
  },
  manager: {
    password: '1234',
    user: { id: 4, username: 'manager', name: 'Karim Alami', role: 'manager', email: 'manager@oasis-pms.ma' },
  },
  auditor: {
    password: '1234',
    user: { id: 5, username: 'auditor', name: 'Nadia Idrissi', role: 'auditor', email: 'auditor@oasis-pms.ma' },
  },
};

/** Génère un faux JWT (header.payload.signature) */
function generateMockJWT(user: User): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 jours
    })
  );
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
}

// ─── API Functions ───────────────────────────────────────

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  if (USE_MOCKS) {
    await mockDelay(800); // simule la latence réseau

    const entry = MOCK_USERS[username];
    if (!entry || entry.password !== password) {
      throw new Error('Identifiant ou mot de passe incorrect');
    }

    return {
      token: generateMockJWT(entry.user),
      user: entry.user,
    };
  }

  // ─── Appel réel vers api-gateway ──────────────────────
  const response = await apiClient.post('/api/auth/login', {
    email: username,
    password,
  });

  const data = response.data;
  return {
    token: data.accessToken,
    user: {
      id: data.user.id,
      username: username,
      name: data.user.fullName,
      role: data.user.role,
      email: data.user.email,
    },
  };
}

export async function logoutApi(): Promise<void> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return;
  }

  await apiClient.post('/api/auth/logout');
}

export async function refreshTokenApi(): Promise<LoginResponse> {
  if (USE_MOCKS) {
    await mockDelay(200);
    const user = MOCK_USERS['admin'].user;
    return { token: generateMockJWT(user), user };
  }

  const response = await apiClient.post<LoginResponse>('/api/auth/refresh');
  return response.data;
}
