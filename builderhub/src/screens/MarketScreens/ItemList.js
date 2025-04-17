import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../../firebase/firebaseConfig';
import { useUser } from '../../context/UserContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const ItemList = ({ navigation, selectedCategory, searchText, selectedColor, priceRange }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fetchItems();
    return () => unsubscribe && unsubscribe();
  }, [selectedCategory, searchText, selectedColor, priceRange]);

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
          let itemList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log('Fetched items:', itemList);

          if (searchText) {
            const searchLower = searchText.toLowerCase();
            itemList = itemList.filter(
              (item) =>
                item.itemName?.toLowerCase().includes(searchLower) ||
                item.description?.toLowerCase().includes(searchLower)
            );
          }

          if (selectedColor && selectedColor !== 'all') {
            itemList = itemList.filter(
              (item) => item.color?.toLowerCase() === selectedColor.toLowerCase()
            );
          }

          if (priceRange) {
            itemList = itemList.filter((item) => Number(item.price) <= Number(priceRange));
          }

          setItems(itemList);
          setLoading(false);
        },
        (err) => {
          console.error('Firestore error:', err);
          setError('Failed to load items. Please try again.');
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Failed to load items. Please try again.');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    return (
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
            {item.itemName}
          </Text>
          <Text style={styles.price}>Rs. {Number(item.price).toLocaleString('en-IN')}</Text>
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
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchItems}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {searchText || selectedColor !== 'all'
                ? 'No items match your filters.'
                : 'No items available in this category.'}
            </Text>
          </View>
        }
      />
      
      {/* Pinned Add Button that stays visible regardless of scrolling */}
      <View style={styles.pinnedButtonContainer}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => navigation.navigate('AddItem')}
          activeOpacity={0.7}
          accessibilityLabel="Add new item"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContainer: {
    padding: 12,
  },
  card: {
    width: cardWidth,
    margin: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  imageContainer: {
    width: '100%',
    height: cardWidth * 0.9,
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  noImageText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  contentContainer: {
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  companyText: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  pinnedButtonContainer: {
    position: 'absolute',
    top: 100, // Position lower down from the top
    right: 20,
    zIndex: 1000, // Ensure it stays on top of other elements
  },
  circleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default ItemList;