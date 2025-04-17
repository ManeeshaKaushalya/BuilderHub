import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const OrderDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { order, orderId } = route.params; // Support both order and orderId
  const [orderData, setOrderData] = useState(order);

  useEffect(() => {
    if (orderId && !order) {
      const fetchOrder = async () => {
        try {
          const orderRef = doc(firestore, 'orders', orderId);
          const orderSnap = await getDoc(orderRef);
          if (orderSnap.exists()) {
            setOrderData({ id: orderId, ...orderSnap.data() });
          }
        } catch (error) {
          console.error('Error fetching order:', error);
        }
      };
      fetchOrder();
    }
  }, [orderId, order]);

  if (!orderData) {
    return <View><Text>Loading...</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{orderData.id.slice(0, 8)}</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <Text style={styles.detailText}>
            Status: {orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}
          </Text>
          <Text style={styles.detailText}>
            Placed: {orderData.createdAt?.toDate().toLocaleDateString() || 'N/A'}
          </Text>
          <Text style={styles.detailText}>Customer ID: {orderData.userId}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {orderData.items.map((item, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.itemText}>
                {item.name} x {item.quantity}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <Text style={styles.detailText}>Address: {orderData.address}</Text>
          <Text style={styles.detailText}>Contact: {orderData.contactNumber}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#0095f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  item: {
    paddingVertical: 4,
  },
  itemText: {
    fontSize: 15,
    color: '#333',
  },
});

export default OrderDetailsScreen;