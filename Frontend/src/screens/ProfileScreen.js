import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch,Image } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';  // Import useTheme hook
import { useUser } from '../context/UserContext';  // Import user context
import Sidebar from './Sidebar';

function ProfileScreen({ navigation }) {
  const { isDarkMode, toggleDarkMode } = useTheme(); // Get dark mode state
  const { user } = useUser(); // Get user data from context

  const handleLogout = () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => navigation.replace('Login') }
      ]
    );
  };

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>
        Welcome to Profile Screen
      </Text>
       <Sidebar/>


      {/* Logout Button */}
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>

      {/* Dark Mode Toggle */}
      <View style={styles.switchContainer}>
        <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>
          Dark Mode
        </Text>
        <Switch value={isDarkMode} onValueChange={toggleDarkMode} />
      </View>
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
  button: { 
    width: '80%', 
    backgroundColor: '#007BFF', 
    padding: 15, 
    borderRadius: 5, 
    alignItems: 'center', 
    marginTop: 20 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  profession: { fontSize: 16, marginTop: 5, fontStyle: 'italic' },
});

export default ProfileScreen;
