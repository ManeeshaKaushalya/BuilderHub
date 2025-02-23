import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, TextInput, ScrollView, FlatList } from 'react-native';
import Slider from '@react-native-community/slider';
import { debounce } from 'lodash';
import { FontAwesome } from '@expo/vector-icons';
import FormatPrice from './FormatPrice';
import { Button } from 'react-native-paper';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'useritem', label: 'User Item' },
  { id: 'paints', label: 'Paint Machine' },
  { id: 'machines', label: 'Machines' },
  { id: 'tools', label: 'Tools' },
  { id: 'furniture', label: 'Furniture' }
];

const colors = ['all', 'red', 'blue', 'green', 'yellow', 'black', 'white'];



const FilterSection = ({ navigation,setSelectedCategory, setSelectedColor, onSearch , setPriceRange}) => {
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedColor, setSelectedColorState] = useState('all');
  const [price, setPrice] = useState(1000); // Default price value

  const debouncedSearch = useCallback(
    debounce((text) => onSearch(text), 150),
    [onSearch]
  );

  const handleSearch = (text) => {
    setSearchText(text);
    debouncedSearch(text);
  };

  const handleCategoryPress = useCallback((category) => {
    setActiveCategory(category.id);
    setSelectedCategory(category.id);
  }, [setSelectedCategory]);

  const handleColorPress = useCallback((color) => {
    setSelectedColorState(color);
    setSelectedColor(color);
  }, [setSelectedColor]);

  const handlePriceChange = (value) => {
    // You can pass an object with the selected min and max values of the price range
    setPriceRange(value);
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

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => handleCategoryPress(category)}
            style={[styles.categoryButton, activeCategory === category.id && styles.activeCategoryButton]}
            accessibilityRole="button"
          >
            <Text style={[styles.categoryText, activeCategory === category.id && styles.activeCategoryText]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Color Selection */}
      <Text style={styles.label}>Colors</Text>
      <FlatList
        horizontal
        data={colors}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleColorPress(item)}
            style={[
              styles.colorCircle,
              { backgroundColor: item === "all" ? "#ddd" : item },
              selectedColor === item && styles.selectedColorCircle
            ]}
            accessibilityRole="button"
          >
            {selectedColor === item && <FontAwesome name="check" size={12} color="white" />}
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.colorContainer}
      />

      {/* Price Slider */}
      <Text style={styles.label}>Price</Text>
      <Slider
        style={styles.slider}
        minimumValue={10000}
        maximumValue={100000}
        step={100}
        value={price}
        onValueChange={setPrice}
        minimumTrackTintColor="#007bff"
        maximumTrackTintColor="#ccc"
        thumbTintColor="#007bff"
      />
      <Text style={styles.priceText}>
        <FormatPrice price={price} />
      </Text>
       {/* Add Items Button */}
            <Button
              mode="contained"
              onPress={() => navigation.navigate("AddItem")} 
              style={styles.addButton}
            >
              Add Items
            </Button>
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
    shadowOffset: { width: 0, height: 1 },
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    color: '#343a40',
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedColorCircle: {
    borderWidth: 2,
    borderColor: '#000',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    color: '#007bff',
  },
  addButton: {
    marginTop: 10,
    backgroundColor: "#28a745",
  },
});

export default FilterSection;
