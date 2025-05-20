import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import styles from '../../styles/shopstyles/OrderDetailsScreenStyles'; 

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

export default OrderDetailsScreen;