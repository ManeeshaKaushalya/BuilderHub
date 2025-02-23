import React, { useState } from 'react';
import { View, ScrollView, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import FilterSection from './MarketScreens/FilterSection';
import ItemList from './MarketScreens/ItemList';

function MarketScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 10000]); // Min and Max price range

  const data = []; // Example data, you can replace with actual item data

  return (
    <ScrollView
      style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Filter Section */}
      <FilterSection
        navigation={navigation}
        setSelectedCategory={setSelectedCategory}
        setSelectedColor={setSelectedColor}
        onSearch={setSearchQuery}
        isDarkMode={isDarkMode}
        setPriceRange={setPriceRange}
      />

      {/* Item List */}
      <View style={styles.listContainer}>
        <ItemList
          navigation={navigation}
          selectedCategory={selectedCategory}
          searchText={searchQuery}
          selectedColor={selectedColor}
          priceRange={priceRange}
          nestedScrollEnabled={true} // Allow nested scrolling inside ItemList
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#121212' },
  listContainer: { flex: 1 }, // Ensure `ItemList` can expand inside `ScrollView`
});

export default MarketScreen;