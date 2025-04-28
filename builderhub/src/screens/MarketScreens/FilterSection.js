import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { debounce } from 'lodash';
import { FontAwesome } from '@expo/vector-icons';

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

const FilterSection = ({
  navigation,
  setSelectedCategory,
  setSelectedColor,
  onSearch,
  isDarkMode,
}) => {
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedColor, setSelectedColorState] = useState('all');

  const debouncedSearch = useCallback(debounce((text) => onSearch(text), 300), [onSearch]);

  const handleSearch = (text) => {
    setSearchText(text);
    debouncedSearch(text);
  };

  const handleCategoryPress = useCallback(
    (category) => {
      setActiveCategory(category.id);
      setSelectedCategory(category.id);
    },
    [setSelectedCategory]
  );

  const handleColorPress = useCallback(
    (colorId) => {
      setSelectedColorState(colorId);
      setSelectedColor(colorId);
    },
    [setSelectedColor]
  );

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Search Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Search Products</Text>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Enter product name..."
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            value={searchText}
            onChangeText={handleSearch}
            style={[styles.input, isDarkMode && styles.darkInput]}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search products"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              style={[styles.clearButton, isDarkMode && styles.darkClearButton]}
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
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Categories</Text>
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
                isDarkMode && styles.darkCategoryButton,
              ]}
              accessibilityRole="button"
              accessibilityLabel={category.label}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.id && styles.activeCategoryText,
                  isDarkMode && styles.darkCategoryText,
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
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Filter by Color</Text>
        <View style={styles.colorContainer}>
          {colors.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleColorPress(item.id)}
              style={[
                styles.colorCircle,
                { backgroundColor: item.value },
                selectedColor === item.id && styles.selectedColorCircle,
                isDarkMode && styles.darkColorCircle,
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              {selectedColor === item.id && <FontAwesome name="check" size={14} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
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
  darkContainer: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
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
  darkText: {
    color: '#F9FAFB',
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
  darkInput: {
    borderColor: '#4B5563',
    backgroundColor: '#374151',
    color: '#F9FAFB',
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
  darkClearButton: {
    backgroundColor: '#4B5563',
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
  darkCategoryButton: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
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
  darkCategoryText: {
    color: '#D1D5DB',
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
  darkColorCircle: {
    borderColor: '#4B5563',
  },
  selectedColorCircle: {
    borderWidth: 2,
    borderColor: '#1F2937',
  },
});

export default FilterSection;