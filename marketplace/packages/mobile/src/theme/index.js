import { DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366f1',
    accent: '#8b5cf6',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    disabled: '#9ca3af',
    placeholder: '#6b7280',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  roundness: 8,
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
};

export default theme;
