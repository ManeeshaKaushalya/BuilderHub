import React from 'react';
import { ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-get-random-values';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import CompanyRegister from './src/screens/company/CompanyRegister';
import ShopRegister from './src/screens/shops/ShopRegister';
import UserRegister from './src/screens/users/UserRegister';
import HomeScreen from './src/screens/HomeScreen';
import UsersPostsScreen from './src/screens/UsersPostsScreen';
import MarketScreen from './src/screens/MarketScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MessageScreen from './src/screens/MessageScreen';
import TabsScreen from './src/screens/TabsScreen';
import MapScreen from './src/screens/MapScreen';

// Context Providers
import { ThemeProvider } from './src/hooks/ThemeContext';
import ForgetPassword from './src/screens/ForgetPassword';


const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer fallback={<ActivityIndicator size="large" color="#007AFF" />}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="CompanyRegister" component={CompanyRegister} />
            <Stack.Screen name="ShopRegister" component={ShopRegister} />
            <Stack.Screen name="UserRegister" component={UserRegister} />
            <Stack.Screen name="Tabs" component={TabsScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="PostsScreen" component={UsersPostsScreen} />
            <Stack.Screen name="MarketScreen" component={MarketScreen} />
            <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
            <Stack.Screen name="MessageScreen" component={MessageScreen} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            <Stack.Screen name="MapScreen" component={MapScreen} />
            <Stack.Screen name="forgetpassword" component={ForgetPassword} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
