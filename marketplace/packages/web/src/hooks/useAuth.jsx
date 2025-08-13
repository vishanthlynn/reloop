import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { loginUser, registerUser, logoutUser, refreshAuthToken } from '../api/auth.api';
import { useEffect, useState } from 'react';

const AuthContext = createContext();

const useAuth = () => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const { mutate: login, isLoading: isLoggingIn } = useMutation(loginUser, {
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setUser(data.data.user);
      queryClient.invalidateQueries('user');
    },
  });

  const { mutate: register, isLoading: isRegistering } = useMutation(registerUser, {
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setUser(data.data.user);
      queryClient.invalidateQueries('user');
    },
  });

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    logoutUser(refreshToken);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    queryClient.clear();
  };

  return {
    user,
    login,
    isLoggingIn,
    register,
    isRegistering,
    logout,
    isAuthenticated: !!user,
  };
};

// AuthProvider component
const AuthProvider = ({ children }) => {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export { useAuth, AuthProvider, useAuthContext };
export default useAuth;
