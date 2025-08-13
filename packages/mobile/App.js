import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider } from 'react-native-paper';
import SplashScreen from 'react-native-splash-screen';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';
import { setupNotifications } from './src/services/notification.service';
import theme from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  useEffect(() => {
    // Hide splash screen
    SplashScreen.hide();
    
    // Setup push notifications
    setupNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <SocketProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </SocketProvider>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
