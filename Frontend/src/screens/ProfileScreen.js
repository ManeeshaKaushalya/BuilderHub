import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';  
import { useUser } from '../context/UserContext';  
import Sidebar from './Sidebar';

function ProfileScreen() {
  const { isDarkMode } = useTheme(); 
  const { user } = useUser(); 

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>
        Welcome to Profile Screen
      </Text>
      
      <Sidebar /> 
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#121212' },
  text: { fontSize: 18, fontWeight: 'bold' },
  lightText: { color: '#000' },
  darkText: { color: '#fff' },
});

export default ProfileScreen;
