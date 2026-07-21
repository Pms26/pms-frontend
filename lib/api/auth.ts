import apiClient from './client';
import type { LoginResponse, User } from '@/types';

interface BackendUser {
  _id?: string;
  id?: string;
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

interface BackendUsersListResponse {
  success: boolean;
  users: BackendUser[];
}

interface BackendUpdateRoleResponse {
  success: boolean;
  user: BackendUser;
}

const mapBackendUser = (user: BackendUser): User => {
  const identifier = user._id ?? user.id;

  if (!identifier) {
    throw new Error(
      'Réponse backend invalide : identifiant utilisateur manquant.'
    );
  }

  return {
    id: identifier,
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

export async function getUsersApi(): Promise<User[]> {
  const response = await apiClient.get<BackendUsersListResponse>(
    '/api/auth/users'
  );

  return response.data.users.map(mapBackendUser);
}

export async function updateUserRoleApi(
  userId: string,
  role: string
): Promise<User> {
  const response = await apiClient.patch<BackendUpdateRoleResponse>(
    `/api/auth/users/${userId}/role`,
    { role }
  );

  return mapBackendUser(response.data.user);
}

export async function deleteUserApi(userId: string): Promise<void> {
  await apiClient.delete(`/api/auth/users/${userId}`);
}

