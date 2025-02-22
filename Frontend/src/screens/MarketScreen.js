import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/ThemeContext'; // Import useTheme hook
import FilterSection from './MarketScreens/FilterSection';
import ItemList from './MarketScreens/ItemList';

function MarketScreen({ navigation }) {
  const { isDarkMode } = useTheme(); // Get dark mode state
  const [selectedCategory, setSelectedCategory] = useState("All"); // State to manage selected category
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      {/* Filter Section */}
      <FilterSection setSelectedCategory={setSelectedCategory} onSearch={setSearchQuery}/>

      {/* Item List */}
      <ItemList navigation={navigation} selectedCategory={selectedCategory}  searchText={searchQuery} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#121212' },
});

export default MarketScreen;
