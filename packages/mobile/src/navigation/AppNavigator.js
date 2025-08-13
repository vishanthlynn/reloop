import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';
import SearchScreen from '../screens/main/SearchScreen';
import CreateListingScreen from '../screens/main/CreateListingScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Product Screens
import ProductDetailScreen from '../screens/product/ProductDetailScreen';
import ProductEditScreen from '../screens/product/ProductEditScreen';

// Order Screens
import OrdersScreen from '../screens/order/OrdersScreen';
import OrderDetailScreen from '../screens/order/OrderDetailScreen';
import CheckoutScreen from '../screens/order/CheckoutScreen';

// Chat Screens
import ChatScreen from '../screens/chat/ChatScreen';

// Profile Screens
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import MyListingsScreen from '../screens/profile/MyListingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="HomeMain" 
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="ProductDetail" 
      component={ProductDetailScreen}
      options={{ title: 'Product Details' }}
    />
    <Stack.Screen 
      name="Checkout" 
      component={CheckoutScreen}
      options={{ title: 'Checkout' }}
    />
  </Stack.Navigator>
);

const SearchStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="SearchMain" 
      component={SearchScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="ProductDetail" 
      component={ProductDetailScreen}
      options={{ title: 'Product Details' }}
    />
  </Stack.Navigator>
);

const MessagesStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="MessagesMain" 
      component={MessagesScreen}
      options={{ title: 'Messages' }}
    />
    <Stack.Screen 
      name="Chat" 
      component={ChatScreen}
      options={({ route }) => ({ 
        title: route.params?.userName || 'Chat' 
      })}
    />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ProfileMain" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
    <Stack.Screen 
      name="EditProfile" 
      component={EditProfileScreen}
      options={{ title: 'Edit Profile' }}
    />
    <Stack.Screen 
      name="MyListings" 
      component={MyListingsScreen}
      options={{ title: 'My Listings' }}
    />
    <Stack.Screen 
      name="Orders" 
      component={OrdersScreen}
      options={{ title: 'My Orders' }}
    />
    <Stack.Screen 
      name="OrderDetail" 
      component={OrderDetailScreen}
      options={{ title: 'Order Details' }}
    />
    <Stack.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
    <Stack.Screen 
      name="ProductEdit" 
      component={ProductEditScreen}
      options={{ title: 'Edit Listing' }}
    />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Home':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'Search':
            iconName = 'magnify';
            break;
          case 'Sell':
            iconName = 'plus-circle';
            break;
          case 'Messages':
            iconName = focused ? 'message' : 'message-outline';
            break;
          case 'Profile':
            iconName = focused ? 'account' : 'account-outline';
            break;
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6366f1',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Search" component={SearchStack} />
    <Tab.Screen 
      name="Sell" 
      component={CreateListingScreen}
      options={{
        tabBarLabel: 'Sell',
      }}
    />
    <Tab.Screen name="Messages" component={MessagesStack} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // You can return a loading screen here
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
