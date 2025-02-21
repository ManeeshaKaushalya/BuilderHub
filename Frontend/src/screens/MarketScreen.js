import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../hooks/ThemeContext'; // Import useTheme hook
import FilterSection from './MarketScreens/FilterSection';
import ItemList from './MarketScreens/ItemList';

function MarketScreen({ navigation }) {
  const { isDarkMode } = useTheme(); // Get dark mode state

  return (
    <FlatList
      data={[{}]} // Dummy data to ensure at least one item in FlatList
      renderItem={() => null} // Render nothing for each item
      keyExtractor={() => 'dummy'} // Ensure unique key
      ListHeaderComponent={<FilterSection navigation={navigation} />} // Filter Section at the top
      ListFooterComponent={<ItemList />} // Item List Section at the bottom
      numColumns={2} // Set the number of columns to 2 for two items per row
      key={isDarkMode ? 'dark' : 'light'} // Change the key based on dark mode to reset FlatList
      style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
