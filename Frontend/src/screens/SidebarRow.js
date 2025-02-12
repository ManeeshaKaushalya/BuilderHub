import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/ThemeContext'; // Import useTheme hook
import { useNavigation } from '@react-navigation/native'; // Import navigation hook

const SidebarRow = ({ imageLink, title, isUser }) => {
  const { isDarkMode } = useTheme(); // Get dark mode state
  const navigation = useNavigation();

  // Handle dark mode toggle when clicking the row
  const handleDarkModeToggle = () => {
    navigation.navigate('darkmodescreen'); // Navigate to DarkModeScreen
  };

  return (
    <TouchableOpacity 
      style={[
        styles.row, 
        isUser && styles.userRow, 
        isDarkMode ? styles.darkRow : styles.lightRow
      ]}
      onPress={handleDarkModeToggle}
    >
      {imageLink ? (
        <Image source={{ uri: imageLink }} style={isUser ? styles.avatar : styles.icon} />
      ) : (
        <View style={styles.placeholderIcon} /> // Placeholder if no image
      )}
      <Text 
        style={[
          styles.title, 
          isUser && styles.userName, 
          isDarkMode ? styles.darkText : styles.lightText
        ]}
      >
        {title || "Unknown"}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 5,
  },
  lightRow: {
    backgroundColor: '#fff',
  },
  darkRow: {
    backgroundColor: '#333', // Dark background for dark mode
  },
  icon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20, // Circular avatar
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  userRow: {
    backgroundColor: '#f0f2f5', // Light gray background for user profile row
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholderIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#ccc',
    borderRadius: 15,
    marginRight: 10,
  },
  lightText: {
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
});

export default SidebarRow;
