import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import ChatList from './MarketScreens/ChatList';

function MessageScreen() {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation(); // Get navigation object
  
  return (
    <View style={[
      styles.container, 
      isDarkMode ? styles.darkContainer : styles.lightContainer
    ]}>
      <ChatList navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1
  },
  lightContainer: { 
    backgroundColor: '#fff' 
  },
  darkContainer: { 
    backgroundColor: '#121212' 
  },
  text: { 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  lightText: { 
    color: '#000' 
  },
  darkText: { 
    color: '#fff' 
  },
});

export default MessageScreen;