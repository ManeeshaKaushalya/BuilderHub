import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute } from '@react-navigation/native';

const TabBarComponent = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const tabs = [
    { name: 'Home', icon: 'home', screen: 'Home' },
    { name: 'Posts', icon: 'users', screen: 'PostsScreen' },
    { name: 'Market', icon: 'shopping-cart', screen: 'MarketScreen' },
    { name: 'Notifications', icon: 'bell', screen: 'NotificationScreen' },
    { name: 'Messages', icon: 'envelope', screen: 'MessageScreen' },
    { name: 'Profile', icon: 'user', screen: 'ProfileScreen' }
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = route.name === tab.screen; // Check if current screen is active

        return (
          <TouchableOpacity
            key={index}
            style={[styles.tabButton, isActive && styles.activeTab]}
            onPress={() => navigation.navigate(tab.screen)}
          >
            <Icon name={tab.icon} size={26} color={isActive ? "#0056b3" : "#007BFF"} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabButton: {
    padding: 10,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#0056b3",
  },
});

export default TabBarComponent;