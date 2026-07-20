import apiClient from './client';
import type { LoginResponse, User } from '@/types';

interface BackendUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
}

interface BackendLoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: BackendUser;
}

interface BackendProfileResponse {
  success: boolean;
  user: BackendUser;
}

const mapBackendUser = (user: BackendUser): User => {
  return {
    id: user.id,
    username: user.email,
    name: user.fullName,
    email: user.email,
    role: user.role as User['role']
  };
};

export async function loginApi(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await apiClient.post<BackendLoginResponse>(
    '/api/auth/login',
    {
      email,
      password
    }
  );

  return {
    token: response.data.accessToken,
    user: mapBackendUser(response.data.user)
  };
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/api/auth/logout');
}

export async function refreshTokenApi(): Promise<string> {
  const response = await apiClient.post<{
    success: boolean;
    accessToken: string;
  }>('/api/auth/refresh');

  return response.data.accessToken;
}

export async function getProfileApi(): Promise<User> {
  const response = await apiClient.get<BackendProfileResponse>(
    '/api/auth/me'
  );

  return mapBackendUser(response.data.user);
}

export async function registerApi(
  fullName: string,
  email: string,
  password: string
): Promise<User> {
  const response = await apiClient.post<{
    success: boolean;
    user: BackendUser;
  }>('/api/auth/register', {
    fullName,
    email,
    password
  });

  return mapBackendUser(response.data.user);
}

export async function forgotPasswordApi(email: string): Promise<void> {
  await apiClient.post('/api/auth/forgot-password', {
    email
  });
}

export async function resetPasswordApi(
  token: string,
  newPassword: string
): Promise<void> {
  await apiClient.post('/api/auth/reset-password', {
    token,
    newPassword
  });
}