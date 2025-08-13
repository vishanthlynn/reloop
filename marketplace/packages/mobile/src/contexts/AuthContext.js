import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { authService } from '../services/auth.service';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const getStoredToken = async () => {
    try {
      const credentials = await Keychain.getInternetCredentials('marketplace_app');
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  const saveToken = async (token) => {
    try {
      await Keychain.setInternetCredentials(
        'marketplace_app',
        'token',
        token
      );
    } catch (error) {
      console.error('Error saving token:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const { user: userData, accessToken } = response;
      
      await saveToken(accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      const { user: newUser, accessToken } = response;
      
      await saveToken(accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      
      setUser(newUser);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await Keychain.resetInternetCredentials('marketplace_app');
      await AsyncStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const updatedUser = await authService.updateProfile(updates);
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Update failed' 
      };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
