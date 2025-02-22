import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import FilterSection from './MarketScreens/FilterSection';
import ItemList from './MarketScreens/ItemList';

function MarketScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 10000]); // Min and Max price range

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      {/* Filter Section */}
      <FilterSection 
        setSelectedCategory={setSelectedCategory} 
        setSelectedColor={setSelectedColor} 
        onSearch={setSearchQuery} 
        isDarkMode={isDarkMode} 
        setPriceRange={setPriceRange} // Pass the price range setter
      />

      {/* Item List */}
      <ItemList 
        navigation={navigation} 
        selectedCategory={selectedCategory} 
        searchText={searchQuery} 
        selectedColor={selectedColor} 
        priceRange={priceRange} // Pass the selected price range
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#121212' },
});

export default MarketScreen;
