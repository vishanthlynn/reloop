import axios from 'axios';
import { API_BASE_URL } from '../config';
import * as Keychain from 'react-native-keychain';

class AuthService {
  constructor() {
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor to add token
    axios.interceptors.request.use(
      async (config) => {
        try {
          const credentials = await Keychain.getInternetCredentials('marketplace_app');
          if (credentials) {
            config.headers.Authorization = `Bearer ${credentials.password}`;
          }
        } catch (error) {
          console.error('Error getting token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const response = await this.refreshToken();
            const { accessToken } = response.data;
            
            await Keychain.setInternetCredentials(
              'marketplace_app',
              'token',
              accessToken
            );

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            await Keychain.resetInternetCredentials('marketplace_app');
            // Navigate to login screen
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(email, password) {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });
    return response.data;
  }

  async register(userData) {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
    return response.data;
  }

  async logout() {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async refreshToken() {
    return axios.post(`${API_BASE_URL}/auth/refresh`);
  }

  async getCurrentUser() {
    const response = await axios.get(`${API_BASE_URL}/auth/me`);
    return response.data.user;
  }

  async updateProfile(updates) {
    const response = await axios.patch(`${API_BASE_URL}/users/profile`, updates);
    return response.data.user;
  }

  async changePassword(currentPassword, newPassword) {
    const response = await axios.post(`${API_BASE_URL}/auth/change-password`, {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  async forgotPassword(email) {
    const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
      email,
    });
    return response.data;
  }

  async resetPassword(token, newPassword) {
    const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
      token,
      newPassword,
    });
    return response.data;
  }

  async verifyEmail(token) {
    const response = await axios.post(`${API_BASE_URL}/auth/verify-email`, {
      token,
    });
    return response.data;
  }
}

export const authService = new AuthService();
