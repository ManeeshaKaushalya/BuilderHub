import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, TextInput, ScrollView, FlatList } from 'react-native';
import Slider from '@react-native-community/slider';
import { debounce } from 'lodash';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import FormatPrice from './FormatPrice';

const categories = [
  { id: 'all', label: 'All Categories' },
  { id: 'useritem', label: 'User Items' },
  { id: 'paints', label: 'Paint Machines' },
  { id: 'machines', label: 'Machines' },
  { id: 'tools', label: 'Tools' },
  { id: 'furniture', label: 'Furniture' },
];

const colors = [
  { id: 'all', value: '#ddd', label: 'All Colors' },
  { id: 'red', value: 'red', label: 'Red' },
  { id: 'blue', value: 'blue', label: 'Blue' },
  { id: 'green', value: 'green', label: 'Green' },
  { id: 'yellow', value: 'yellow', label: 'Yellow' },
  { id: 'black', value: 'black', label: 'Black' },
  { id: 'white', value: 'white', label: 'White' },
];

const FilterSection = ({ navigation, setSelectedCategory, setSelectedColor, onSearch, setPriceRange }) => {
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedColor, setSelectedColorState] = useState('all');
  const [price, setPrice] = useState(50000); // Mid-range default for better UX

  const debouncedSearch = useCallback(debounce((text) => onSearch(text), 300), [onSearch]);

  const handleSearch = (text) => {
    setSearchText(text);
    debouncedSearch(text);
  };

  const handleCategoryPress = useCallback((category) => {
    setActiveCategory(category.id);
    setSelectedCategory(category.id);
  }, [setSelectedCategory]);

  const handleColorPress = useCallback((colorId) => {
    setSelectedColorState(colorId);
    setSelectedColor(colorId);
  }, [setSelectedColor]);

  const handlePriceChange = (value) => {
    setPrice(value);
    setPriceRange(value);
  };

  return (
    <View style={styles.container}>
      {/* Search Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search Products</Text>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Enter product name..."
            value={searchText}
            onChangeText={handleSearch}
            style={styles.input}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search products"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchText('');
                onSearch('');
              }}
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => handleCategoryPress(category)}
              style={[
                styles.categoryButton,
                activeCategory === category.id && styles.activeCategoryButton,
              ]}
              accessibilityRole="button"
              accessibilityLabel={category.label}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.id && styles.activeCategoryText,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Colors Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filter by Color</Text>
        <FlatList
          horizontal
          data={colors}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleColorPress(item.id)}
              style={[
                styles.colorCircle,
                { backgroundColor: item.value },
                selectedColor === item.id && styles.selectedColorCircle,
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              {selectedColor === item.id && <FontAwesome name="check" size={14} color="#fff" />}
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.colorContainer}
        />
      </View>

      {/* Price Range Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price Range</Text>
        <Slider
          style={styles.slider}
          minimumValue={10000}
          maximumValue={100000}
          step={550}
          value={price}
          onValueChange={handlePriceChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor="#007AFF"
          accessibilityLabel="Price range slider"
        />
        <Text style={styles.priceText}>
          Up to <FormatPrice price={price} />
        </Text>
      </View>

     
     
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  searchContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    paddingRight: 40,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  categoriesContainer: {
    flexDirection: 'row',
  },
  categoryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  activeCategoryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#0066CC',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  activeCategoryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedColorCircle: {
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 8,
  },
  addButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  addButtonContent: {
    height: 48,
  },
  addButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default FilterSection;