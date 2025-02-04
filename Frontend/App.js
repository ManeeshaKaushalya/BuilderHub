import React from 'react';
import { ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Registration Type Screens
import CompanyRegister from './src/screens/company/CompanyRegister';
import ShopRegister from './src/screens/shops/ShopRegister';
import UserRegister from './src/screens/users/UserRegister';

// Main App Screens
import HomeScreen from './src/screens/HomeScreen';
import UsersPostsScreen from './src/screens/UsersPostsScreen';
import MarketScreen from './src/screens/MarketScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MessageScreen from './src/screens/MessageScreen';
import TabsScreen from './src/screens/TabsScreen';

// Context Providers
import { ThemeProvider } from './src/hooks/ThemeContext';

const Stack = createStackNavigator();

// Screen configurations for better organization
const screenConfigs = {
  auth: [
    { name: 'Login', component: LoginScreen },
    { name: 'Register', component: RegisterScreen },
  ],
  registration: [
    { name: 'CompanyRegister', component: CompanyRegister },
    { name: 'ShopRegister', component: ShopRegister },
    { name: 'UserRegister', component: UserRegister },
  ],
  main: [
    { name: 'Tabs', component: TabsScreen },
    { name: 'Home', component: HomeScreen },
    { name: 'PostsScreen', component: UsersPostsScreen },
    { name: 'MarketScreen', component: MarketScreen },
    { name: 'NotificationScreen', component: NotificationScreen },
    { name: 'MessageScreen', component: MessageScreen },
    { name: 'ProfileScreen', component: ProfileScreen },
  ],
};

// Default screen options
const defaultScreenOptions = {
  headerShown: false,
  // Add any other common screen options here
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer fallback={<ActivityIndicator size="large" color="#007AFF" />}>
          <Stack.Navigator 
            initialRouteName="Login"
            screenOptions={defaultScreenOptions}
          >
            {/* Auth Screens */}
            {screenConfigs.auth.map(screen => (
              <Stack.Screen
                key={screen.name}
                name={screen.name}
                component={screen.component}
              />
            ))}

            {/* Registration Type Screens */}
            {screenConfigs.registration.map(screen => (
              <Stack.Screen
                key={screen.name}
                name={screen.name}
                component={screen.component}
              />
            ))}

            {/* Main App Screens */}
            {screenConfigs.main.map(screen => (
              <Stack.Screen
                key={screen.name}
                name={screen.name}
                component={screen.component}
              />
            ))}
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}