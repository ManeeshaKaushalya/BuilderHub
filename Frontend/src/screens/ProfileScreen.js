import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';  // Import useTheme hook

function ProfileScreen({ navigation }) {
  const { isDarkMode, toggleDarkMode } = useTheme(); // Get dark mode state

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
});

export default ProfileScreen;
