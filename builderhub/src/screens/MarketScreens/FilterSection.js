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
      <View style={[styles.section, styles.searchSection, isDarkMode && { backgroundColor: '#4B5563' }]}>
        <Text style={[styles.sectionTitleheader, isDarkMode && styles.darkSectionTitle]}>Search Products</Text>
        <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
          <FontAwesome
            name="search"
            size={18}
            color={isDarkMode ? '#9CA3AF' : '#6B7280'}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search products..."
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            value={searchText}
            onChangeText={handleSearch}
            style={[styles.input, isDarkMode && styles.darkInput]}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search products input"
            accessibilityHint="Enter product name to search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              style={[styles.clearButton, isDarkMode && styles.darkClearButton]}
              onPress={() => {
                setSearchText('');
                onSearch('');
              }}
              accessibilityLabel="Clear search input"
              accessibilityHint="Clears the search text"
            >
              <FontAwesome name="times-circle" size={18} color={isDarkMode ? '#F9FAFB' : '#6B7280'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>Categories</Text>
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
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>Filter by Color</Text>
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
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  searchSection: {
    backgroundColor: '#F4B018',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginTop: -16, // Adjust to minimize top white space
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    letterSpacing: 0.2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sectionTitleheader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    letterSpacing: 0.2,
    backgroundColor: '#F4B018',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0,
    width: '100%',
    marginHorizontal: 0,
  },
  darkSectionTitle: {
    color: '#F9FAFB',
    backgroundColor: '#4B5563',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    paddingHorizontal: 12,
    marginHorizontal: 16,
  },
  darkSearchContainer: {
    backgroundColor: '#374151',
    borderColor: '#F9FAFB',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: 'transparent',
  },
  darkInput: {
    color: '#F9FAFB',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  darkClearButton: {
    backgroundColor: 'transparent',
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
    backgroundColor: '#F4B018',
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
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    marginBottom: 8,
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