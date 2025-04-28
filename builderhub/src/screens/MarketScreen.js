import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import FilterSection from './MarketScreens/FilterSection';
import ItemList from './MarketScreens/ItemList';

function MarketScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState('all');

  return (
    <ScrollView
      style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <FilterSection
        navigation={navigation}
        setSelectedCategory={setSelectedCategory}
        setSelectedColor={setSelectedColor}
        onSearch={setSearchQuery}
        isDarkMode={isDarkMode}
      />
      <View style={styles.listContainer}>
        <ItemList
          navigation={navigation}
          selectedCategory={selectedCategory}
          searchText={searchQuery}
          selectedColor={selectedColor}
          nestedScrollEnabled={true}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#121212' },
  listContainer: { flex: 1 },
});

export default MarketScreen;