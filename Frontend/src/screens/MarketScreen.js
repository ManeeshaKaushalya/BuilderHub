import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';  // Import useTheme hook

function MarketScreen() {
  const { isDarkMode } = useTheme(); // Get dark mode state
  const [searchItemQuery, setSearchItemQuery] = useState('');

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      
      {/* Search Bar */}
      <TextInput
        style={[styles.searchInput, isDarkMode ? styles.darkInput : styles.lightInput]}
        placeholder="Search items..."
        placeholderTextColor={isDarkMode ? "#bbb" : "#666"}
        value={searchItemQuery}
        onChangeText={setSearchItemQuery}
      />

      {/* Title */}
      <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>
        Welcome to Market Screen
      </Text>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#121212' },
  
  text: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  lightText: { color: '#000' },
  darkText: { color: '#fff' },

  searchInput: {
    width: '90%',
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 20,
    fontSize: 16,
  },
  lightInput: {
    backgroundColor: '#f0f0f0',
    color: '#000',
  },
  darkInput: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
  }
});

export default MarketScreen;
