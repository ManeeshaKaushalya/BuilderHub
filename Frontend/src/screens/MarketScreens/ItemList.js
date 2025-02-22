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
  RefreshControl
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../../firebase/firebaseConfig';

const { width } = Dimensions.get('window');
const cardWidth = (width - 36) / 2; // 36 = padding (16) + margin (20)

const ItemList = ({ selectedCategory, searchText, selectedColor,priceRange }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = async () => {
    setError(null);
    try {
      const itemsRef = collection(firestore, 'items');
      let q = itemsRef;
      
      if (selectedCategory && selectedCategory !== "all") {
        q = query(itemsRef, where('category', '==', selectedCategory));
      }

      const querySnapshot = await getDocs(q);
      let itemList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Apply search filter if searchText exists
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        itemList = itemList.filter(item => 
          item.itemName.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        );
      }

      // Apply color filter if selectedColor is not "all"
      if (selectedColor && selectedColor !== "all") {
        itemList = itemList.filter(item => 
          item.color?.toLowerCase() === selectedColor.toLowerCase()
        );

      }

      // Apply price filter
    itemList = itemList.filter(item => 
      item.price >= priceRange[0] && item.price <= priceRange[1]
    );
      setItems(itemList);
    } catch (error) {
      console.error("Error fetching items:", error);
      setError("Failed to load items. Please try again later.");
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchItems().finally(() => setLoading(false));
  }, [selectedCategory, searchText, selectedColor]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.imageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image 
            source={{ uri: item.images[0] }} 
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.itemName} numberOfLines={2}>{item.itemName}</Text>
        <Text style={styles.price}>Rs. {item.price.toLocaleString()}</Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

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
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {searchText || selectedColor !== "all"
              ? "No items match your search or color selection"
              : "No items found in this category"}
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 8,
    paddingBottom: 20,
  },
  card: {
    width: cardWidth,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    width: '100%',
    height: cardWidth, // Square aspect ratio
    backgroundColor: '#f8f9fa',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  noImageText: {
    fontSize: 14,
    color: '#6c757d',
  },
  contentContainer: {
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007bff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ItemList;
