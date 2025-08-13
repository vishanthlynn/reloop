import apiClient from './apiClient';

export const registerUser = async (userData) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
};

export const logoutUser = async (refreshToken) => {
  const response = await apiClient.post('/auth/logout', { refreshToken });
  return response.data;
};

export const refreshAuthToken = async (refreshToken) => {
  const response = await apiClient.post('/auth/refresh-token', { refreshToken });
  return response.data;
};
