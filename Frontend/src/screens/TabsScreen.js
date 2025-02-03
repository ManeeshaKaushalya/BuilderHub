import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import UsersPostsScreen from './UsersPostsScreen';

const Tab = createBottomTabNavigator();

// Placeholder components for each tab
const HomeTab = () => (
    <View style={styles.screenContainer}>
      <Text>Home Screen</Text>
    </View>
  );
  
  const UsersPostsTab = () => (
    <View style={styles.screenContainer}>
      <Text>Users Posts Screen</Text>
    </View>
  );
  
  const MarketTab = () => (
    <View style={styles.screenContainer}>
      <Text>Market Screen</Text>
    </View>
  );
  
  const NotificationTab = () => (
    <View style={styles.screenContainer}>
      <Text>Notifications Screen</Text>
    </View>
  );
  
  const MessageTab = () => (
    <View style={styles.screenContainer}>
      <Text>Messages Screen</Text>
    </View>
  );
  
  const ProfileTab = () => (
    <View style={styles.screenContainer}>
      <Text>Profile Screen</Text>
    </View>
  );

function TabsScreen() {
  return (
    <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#007BFF',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {
        height: 60,
        padding: 5,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
      },
      headerShown: false,
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeTab}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="home" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Posts"
      component={UsersPostsTab}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="users" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Market"
      component={MarketTab}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="shopping-cart" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Notifications"
      component={NotificationTab}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="bell" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Messages"
      component={MessageTab}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="envelope" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileTab}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="user" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);
};

const styles = StyleSheet.create({
screenContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#fff',
},
});


export default TabsScreen