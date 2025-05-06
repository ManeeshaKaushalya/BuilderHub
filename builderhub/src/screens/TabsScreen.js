import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome';
import HomeScreen from './HomeScreen';
import UsersPostsScreen from './UsersPostsScreen';
import MarketScreen from './MarketScreen';
import NotificationScreen from './NotificationScreen';
import MessageScreen from './MessageScreen';
import UploaderProfile from './UploaderProfile'; // Import UploaderProfile
import ShopOrdersScreen from './ShopOrdersScreen';
import { useTheme } from '../context/ThemeContext';
import { getAuth } from 'firebase/auth';
import { firestore } from '../../firebase/firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

const Tab = createBottomTabNavigator();

const TabsScreen = () => {
  const { isDarkMode } = useTheme();
  const auth = getAuth();
  const [accountType, setAccountType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newOrderCount, setNewOrderCount] = useState(0);

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

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.log('No authenticated user, skipping unread notifications');
      setUnreadCount(0);
      return;
    }

    const notificationsRef = collection(firestore, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, where('read', '==', false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const count = snapshot.size;
        console.log('Unread notifications count:', count);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching unread notifications:', error);
        setUnreadCount(0);
      }
    }, (error) => {
      console.error('Snapshot error for unread notifications:', error);
      setUnreadCount(0);
    });

    return () => {
      console.log('Unsubscribing from unread notifications listener');
      unsubscribe();
    };
  }, [auth.currentUser]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || accountType !== 'Shop') {
      console.log('No authenticated user or not a Shop account, skipping new orders');
      setNewOrderCount(0);
      return;
    }

    const ordersRef = collection(firestore, 'orders');
    const q = query(ordersRef, where('shopId', '==', user.uid), where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const count = snapshot.size;
        console.log('New orders count:', count);
        setNewOrderCount(count);
      } catch (error) {
        console.error('Error fetching new orders:', error);
        setNewOrderCount(0);
      }
    }, (error) => {
      console.error('Snapshot error for new orders:', error);
      setNewOrderCount(0);
    });

    return () => {
      console.log('Unsubscribing from new orders listener');
      unsubscribe();
    };
  }, [auth.currentUser, accountType]);

  if (loading) {
    return null; // Optionally render a loading indicator
  }

  const currentUserId = auth.currentUser?.uid;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#F4B018', // Changed from '#007BFF' (blue) to '#F4B018' (yellow)
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
        name="Posts"
        component={UsersPostsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Discover"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="compass" size={size} color={color} />,
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
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#ff6b6b',
            color: '#fff',
            fontSize: 12,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            lineHeight: 20,
            textAlign: 'center',
          },
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
        component={UploaderProfile} // Use UploaderProfile instead of ProfileScreen
        options={{
          tabBarIcon: ({ color, size }) => <Icon name="user" size={size} color={color} />,
        }}
        initialParams={{ userId: currentUserId }} // Pass current user's ID
      />
      {accountType === 'Shop' && (
        <Tab.Screen
          name="Orders"
          component={ShopOrdersScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Icon name="list-alt" size={size} color={color} />,
            tabBarBadge: newOrderCount > 0 ? newOrderCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#ff6b6b',
              color: '#fff',
              fontSize: 12,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              lineHeight: 20,
              textAlign: 'center',
            },
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default TabsScreen;