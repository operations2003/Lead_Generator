import { apiClient } from './client';
import { User, LoginCredentials, AuthResponse } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
    if (response.data.token) {
      apiClient.setToken(response.data.token);
    }
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      apiClient.setToken(null);
    }
  },

  async verifySession(): Promise<boolean> {
    try {
      const response = await apiClient.get<{ valid: boolean }>('/auth/verify-session');
      return response.data.valid === true;
    } catch {
      return false;
    }
  },
};
