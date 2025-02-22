import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { debounce } from 'lodash';

const FilterSection = ({ setSelectedCategory, onSearch }) => {
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState('all');

  // Debounce the search to avoid too many updates
  const debouncedSearch = useCallback(
    debounce((text) => {
      onSearch(text);
    }, 300),
    []
  );

  const handleSearch = (text) => {
    setSearchText(text);
    debouncedSearch(text);
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'paints', label: 'Paint Machine' },
    { id: 'machines', label: 'Machines' },
    { id: 'tools', label: 'Tools' },
    { id: 'furniture', label: 'Furniture' }
  ];

  const handleCategoryPress = (category) => {
    setActiveCategory(category.id);
    setSelectedCategory(category.id);
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search products..."
          value={searchText}
          onChangeText={handleSearch}
          style={styles.input}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => {
              setSearchText('');
              onSearch('');
            }}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Horizontal Scrollable Categories */}
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
              activeCategory === category.id && styles.activeCategoryButton
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                activeCategory === category.id && styles.activeCategoryText
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    padding: 12,
    paddingRight: 40,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dee2e6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: '#495057',
    fontWeight: 'bold',
    lineHeight: 22,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  categoryButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  activeCategoryButton: {
    backgroundColor: '#007bff',
    borderColor: '#0056b3',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  activeCategoryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default FilterSection;