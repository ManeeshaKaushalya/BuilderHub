import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { firestore } from "../../../firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import Ionicons from "react-native-vector-icons/Ionicons";
import FormatPrice from "./FormatPrice";

const ItemList = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from Firestore on component mount
    const fetchItems = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestore, "items"));
        const fetchedItems = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(fetchedItems);
      } catch (error) {
        console.error("Error fetching items: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.imageWrapper}>
        {/* Display item image */}
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
        ) : (
          <Ionicons name="image-outline" size={40} color="#ccc" />
        )}
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.itemPrice}>
        <FormatPrice price={item.price} />
      </Text>
      </View>

      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => navigation.navigate("ItemDetails", { itemId: item.id })}
      >
        <Text style={styles.viewButtonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );

  return loading ? (
    <ActivityIndicator size="large" color="#28a745" style={styles.loader} />
  ) : (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 10,
  },
  itemContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    marginRight: 10,
  },
  itemImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  itemCategory: {
    fontSize: 14,
    color: "#888",
    marginBottom: 5,
  },
  itemDescription: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#28a745",
  },
  viewButton: {
    backgroundColor: "#28a745",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  viewButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ItemList;
