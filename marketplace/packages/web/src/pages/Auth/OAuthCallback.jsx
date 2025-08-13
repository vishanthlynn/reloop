import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../../hooks/useAuth.jsx';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthTokens } = useAuthContext();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/login');
      return;
    }

    if (token && refreshToken) {
      // Store tokens in localStorage
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Update auth context
      if (setAuthTokens) {
        setAuthTokens({ accessToken: token, refreshToken });
      }
      
      // Redirect to home or dashboard
      navigate('/');
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, setAuthTokens]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Completing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
