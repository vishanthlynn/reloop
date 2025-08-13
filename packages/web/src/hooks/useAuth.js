import { useQuery, useMutation, useQueryClient } from 'react-query';
import { loginUser, registerUser, logoutUser, refreshAuthToken } from '../api/auth.api';
import { useEffect, useState } from 'react';

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

export default useAuth;
