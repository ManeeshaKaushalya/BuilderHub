import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../../firebase/firebaseConfig';
import { useUser } from '../../context/UserContext';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { debounce } from 'lodash';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles, COLORS, SPACING, width, cardWidth } from '../../styles/marketplacestyles/ItemBrowserStyles'; 

const categories = [
  { id: 'all', label: 'All Categories' },
  { id: 'useritem', label: 'User Items' },
  { id: 'Paints', label: 'Paint Machines' },
  { id: 'Machines', label: 'Machines' },
  { id: 'Tools', label: 'Tools' },
  { id: 'Furniture', label: 'Furniture' },
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

const ItemBrowser = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isDarkMode] = useState(false);
  const [searchBarHeight, setSearchBarHeight] = useState(0);

  const debouncedSearch = useCallback(
    debounce((text) => {
      setSearchText(text);
    }, 300),
    []
  );

  const handleSearch = (text) => {
    setInputText(text);
    debouncedSearch(text);
  };

  const handleClearSearch = () => {
    setInputText('');
    setSearchText('');
    debouncedSearch.cancel();
  };

  const handleCategoryPress = useCallback((category) => {
    setActiveCategory(category.id);
    setSelectedCategory(category.id);
  }, []);

  const handleColorPress = useCallback((colorId) => {
    setSelectedColor(colorId);
  }, []);

  const onSearchBarLayout = useCallback((event) => {
    setSearchBarHeight(event.nativeEvent.layout.height);
  }, []);

  useEffect(() => {
    if (!user) {
      console.log('No authenticated user, redirecting to Login');
      navigation.replace('Login');
      return;
    }

    setLoading(true);
    let isMounted = true;

    const fetchItems = () => {
      setError(null);
      try {
        const itemsRef = collection(firestore, 'items');
        let q = itemsRef;

        if (selectedCategory === 'useritem' && user?.uid) {
          q = query(itemsRef, where('itemOwnerId', '==', user.uid));
        } else if (selectedCategory && selectedCategory !== 'all') {
          q = query(itemsRef, where('category', '==', selectedCategory));
        }

        return onSnapshot(
          q,
          (querySnapshot) => {
            if (!isMounted) return;
            const itemList = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            console.log('Fetched items:', itemList);
            setAllItems(itemList);
            setLoading(false);
          },
          (err) => {
            if (!isMounted) return;
            console.error('Firestore error:', err);
            setError('Failed to load items. Please try again.');
            setLoading(false);
          }
        );
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching items:', error);
        setError('Failed to load items. Please try again.');
        setLoading(false);
      }
    };

    const unsubscribe = fetchItems();
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user, selectedCategory, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setLoading(true);
    try {
      await fetchItems();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filteredItems = useMemo(() => {
    let result = allItems;

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(
        (item) =>
          (item.itemName || '').toLowerCase().includes(searchLower) ||
          (item.description || '').toLowerCase().includes(searchLower)
      );
    }

    if (selectedColor && selectedColor !== 'all') {
      result = result.filter(
        (item) => (item.color || '').toLowerCase() === selectedColor.toLowerCase()
      );
    }

    return result;
  }, [allItems, searchText, selectedColor]);

  const renderItem = (item) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ItemDetails', { item })}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>No Image Available</Text>
          </View>
        )}
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.itemName || 'Unnamed Item'}
        </Text>
        <Text style={styles.price}>Rs. {(Number(item.price) || 0).toLocaleString('en-IN')}</Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.company && (
          <Text style={styles.companyText}>By {item.company}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchItems()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.darkContainer]}
      edges={['left', 'right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={insets.top}
      >
        <View
          style={[styles.searchBarContainer, { paddingTop: insets.top }]}
          onLayout={onSearchBarLayout}
        >
          <View style={[styles.section, styles.searchSection, isDarkMode && { backgroundColor: COLORS.DARK_GRAY }]}>
            <Text style={[styles.sectionTitleheader, isDarkMode && styles.darkSectionTitle]}>Search Products</Text>
            <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
              <FontAwesome
                name="search"
                size={18}
                color={isDarkMode ? '#9CA3AF' : COLORS.GRAY}
                style={styles.searchIcon}
              />
              <TextInput
                placeholder="Search products..."
                placeholderTextColor={isDarkMode ? '#9CA3AF' : COLORS.GRAY}
                value={inputText}
                onChangeText={handleSearch}
                style={[styles.input, isDarkMode && styles.darkInput]}
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {inputText.length > 0 && (
                <TouchableOpacity
                  style={[styles.clearButton, isDarkMode && styles.darkClearButton]}
                  onPress={handleClearSearch}
                >
                  <FontAwesome name="times-circle" size={18} color={isDarkMode ? COLORS.LIGHT_TEXT : COLORS.GRAY} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.scrollContent, { paddingTop: searchBarHeight || 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
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

          {filteredItems.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {searchText || selectedColor !== 'all'
                  ? 'No items match your filters.'
                  : 'No items available in this category.'}
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filteredItems.map((item, index) => (
                <View key={item.id} style={[styles.gridItem, index % 2 === 0 && styles.gridItemLeft]}>
                  {renderItem(item)}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.pinnedButtonContainer, { bottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => navigation.navigate('AddItem')}
            activeOpacity={0.7}
            accessibilityLabel="Add new item"
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ItemBrowser;