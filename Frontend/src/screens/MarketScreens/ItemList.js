import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../../firebase/firebaseConfig'; // Adjust the path

const ItemList = ({ selectedCategory }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const itemsRef = collection(firestore, 'items');
        let q = selectedCategory === "All" ? itemsRef : query(itemsRef, where('category', '==', selectedCategory));

        const querySnapshot = await getDocs(q);
        const itemList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setItems(itemList);
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [selectedCategory]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.images && item.images.length > 0 ? ( // Ensure images exist
            <Image source={{ uri: item.images[0] }} style={styles.image} />
          ) : (
            <Text style={styles.noImageText}>No Image</Text>
          )}
          <Text style={styles.text}>{item.itemName}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No items found</Text>}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 10,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 5,
  },
  noImageText: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'center',
    marginTop: 10,
  },
  text: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    color: 'gray',
  },
  loader: {
    marginTop: 50,
  },
});

export default ItemList;
