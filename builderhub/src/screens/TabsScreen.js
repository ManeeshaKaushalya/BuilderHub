import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome';
import HomeScreen from './HomeScreen';
import UsersPostsScreen from './UsersPostsScreen';
import MarketScreen from './MarketScreen';
import NotificationScreen from './NotificationScreen';
import MessageScreen from './MessageScreen';
import ProfileScreen from './ProfileScreen';
import ShopOrdersScreen from './ShopOrdersScreen'; // Import ShopOrdersScreen
import { useTheme } from '../context/ThemeContext';
import { getAuth } from 'firebase/auth';
import { firestore } from '../../firebase/firebaseConfig'; // Adjust path as needed
import { doc, getDoc } from 'firebase/firestore';

const Tab = createBottomTabNavigator();

const TabsScreen = () => {
  const { isDarkMode } = useTheme();
  const auth = getAuth();
  const [accountType, setAccountType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountType = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setAccountType(userData.accountType || 'Person');
          } else {
            console.log('User document does not exist');
            setAccountType('Person');
          }
        } catch (error) {
          console.error('Error fetching account type:', error);
          setAccountType('Person');
        }
      } else {
        setAccountType('Person');
      }
      setLoading(false);
    };

    fetchAccountType();
  }, []);

  if (loading) {
    return null; // Optionally render a loading indicator
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007BFF',
        tabBarInactiveTintColor: isDarkMode ? '#BBBBBB' : 'gray',
        tabBarStyle: {
          height: 60,
          padding: 5,
          backgroundColor: isDarkMode ? '#121212' : '#ffffff',
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
      {accountType === 'Shop' && (
        <Tab.Screen
          name="Orders"
          component={ShopOrdersScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Icon name="list-alt" size={size} color={color} />,
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default TabsScreen;