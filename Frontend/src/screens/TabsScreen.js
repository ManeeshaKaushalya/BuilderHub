import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome';
import HomeScreen from './HomeScreen';
import UsersPostsScreen from './UsersPostsScreen';
import MarketScreen from './MarketScreen';
import NotificationScreen from './NotificationScreen';
import MessageScreen from './MessageScreen';
import ProfileScreen from './ProfileScreen';
import { useTheme } from '../context/ThemeContext';  // Import useTheme hook

const Tab = createBottomTabNavigator();

const TabsScreen = () => {
  const { isDarkMode } = useTheme(); // Get dark mode state

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007BFF',
        tabBarInactiveTintColor: isDarkMode ? '#BBBBBB' : 'gray',
        tabBarStyle: {
          height: 60,
          padding: 5,
          backgroundColor: isDarkMode ? '#121212' : '#ffffff', // Dark or Light mode
          borderTopWidth: 1,
          borderTopColor: isDarkMode ? '#333' : '#f0f0f0',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Posts"
        component={UsersPostsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="users" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Market"
        component={MarketScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="shopping-cart" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="bell" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessageScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="envelope" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="user" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default TabsScreen;
