import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const OrderDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { order, orderId, showBill } = route.params; // Support showBill prop
  const [orderData, setOrderData] = useState(order);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    // Fetch order data if only orderId is provided
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

  useEffect(() => {
    // Fetch customer name using userId from orderData
    if (orderData?.userId) {
      const fetchCustomerName = async () => {
        try {
          const userRef = doc(firestore, 'users', orderData.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setCustomerName(userData.name || 'Unknown User');
          } else {
            setCustomerName('Unknown User');
          }
        } catch (error) {
          console.error('Error fetching customer name:', error);
          setCustomerName('Unknown User');
        }
      };
      fetchCustomerName();
    }
  }, [orderData]);

  const handleOpenGoogleMaps = () => {
    if (orderData.location) {
      const [latitude, longitude] = orderData.location.split(',').map(coord => parseFloat(coord.trim()));
      if (latitude && longitude) {
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        Linking.openURL(url).catch(err => {
          console.error('Error opening Google Maps:', err);
          Alert.alert('Error', 'Unable to open Google Maps. Please try again.');
        });
      } else {
        Alert.alert('Error', 'Invalid location data.');
      }
    }
  };

  if (!orderData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
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
          <Text style={styles.detailText}>Customer Name: {customerName}</Text>
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
        {showBill && orderData.bill && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill Details</Text>
            <View style={styles.billHeader}>
              <Text style={styles.billHeaderText}>Item</Text>
              <Text style={styles.billHeaderText}>Qty</Text>
              <Text style={styles.billHeaderText}>Price (Rs)</Text>
              <Text style={styles.billHeaderText}>Total (Rs)</Text>
            </View>
            {orderData.bill.items.map((item, index) => (
              <View key={index} style={styles.billItem}>
                <Text style={styles.billItemText}>{item.name}</Text>
                <Text style={styles.billItemText}>{item.quantity}</Text>
                <Text style={styles.billItemText}>{item.price.toFixed(2)}</Text>
                <Text style={styles.billItemText}>{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.billTotalContainer}>
              <Text style={styles.billTotalLabel}>Total:</Text>
              <Text style={styles.billTotalAmount}>Rs{orderData.bill.total.toFixed(2)}</Text>
            </View>
            <Text style={styles.deliveryNote}>Pay the bill to our delivery person</Text>
          </View>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.detailText}>Location: {orderData.location || 'N/A'}</Text>
            {orderData.location && (
              <TouchableOpacity style={styles.mapButton} onPress={handleOpenGoogleMaps}>
                <MaterialCommunityIcons name="google-maps" size={18} color="#0095f6" />
                <Text style={styles.mapButtonText}>Open in Google Maps</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.detailText}>Contact: {orderData.contactNumber || 'N/A'}</Text>
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
    backgroundColor: '#F4B018',
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
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  billHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  billItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  billTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
  },
  billTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  billTotalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F4B018',
  },
  deliveryNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  locationContainer: {
    marginBottom: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#e6f0fa',
    borderRadius: 8,
    marginTop: 4,
  },
  mapButtonText: {
    color: '#0095f6',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
  },
});

export default OrderDetailsScreen;