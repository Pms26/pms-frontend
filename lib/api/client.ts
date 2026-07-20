import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig
} from 'axios';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

const clearLocalSession = () => {
  accessToken = null;
  localStorage.removeItem('pms-token');
  document.cookie =
    'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = accessToken || localStorage.getItem('pms-token');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || '';

    const isAuthRequest =
      requestUrl.includes('/api/auth/login') ||
      requestUrl.includes('/api/auth/refresh');

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthRequest ||
      typeof window === 'undefined'
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshResponse = await apiClient.post('/api/auth/refresh');
      const newAccessToken = refreshResponse.data.accessToken;

      setAccessToken(newAccessToken);
      localStorage.setItem('pms-token', newAccessToken);
      document.cookie = `token=${newAccessToken}; path=/; max-age=900; SameSite=Lax`;

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      clearLocalSession();
      window.location.href = '/login';

      return Promise.reject(refreshError);
    }
  }
);
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export function mockDelay(ms: number = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default apiClient;