import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import styles from '../../styles/marketplacestyles/OrderDetailsStyles'; // Import styles

const OrderItemDetails = ({ route, navigation }) => {
  const { order } = route.params || {};

  useEffect(() => {
    if (!order || !order.id || !order.itemOwnerId) {
      console.warn('OrderItemDetails: Invalid or missing order data', { order });
      return;
    }

    const markNotificationsAsRead = async () => {
      try {
        const notificationsRef = collection(firestore, 'users', order.itemOwnerId, 'notifications');
        const q = query(
          notificationsRef,
          where('orderId', '==', order.id),
          where('read', '==', false)
        );
        const snapshot = await getDocs(q);
        const updates = snapshot.docs.map((docSnap) =>
          updateDoc(doc(firestore, 'users', order.itemOwnerId, 'notifications', docSnap.id), {
            read: true,
          })
        );
        await Promise.all(updates);
        console.log(`Marked ${updates.length} notifications as read for order ${order.id}`);
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    };

    markNotificationsAsRead();
  }, [order?.id, order?.itemOwnerId]);

  if (!order || !order.id) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholderRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: Order details not found</Text>
          <TouchableOpacity
            style={styles.backButtonFallback}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholderRight} />
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <Text style={styles.detail}>Order ID: {order.id}</Text>
          <Text style={styles.detail}>Item: {order.itemName}</Text>
          <Text style={styles.detail}>Status: {order.status.toUpperCase()}</Text>
          <Text style={styles.detail}>
            Date: {new Date(order.orderDate).toLocaleDateString()}
          </Text>
          <Text style={styles.detail}>Quantity: {order.quantity}</Text>
          <Text style={styles.detail}>
            Total: Rs. {Number(order.totalPrice).toLocaleString()}
          </Text>
          <Text style={styles.detail}>Payment Method: {order.paymentMethod}</Text>
          {order.paypalOrderId && (
            <Text style={styles.detail}>PayPal Order ID: {order.paypalOrderId}</Text>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buyer Information</Text>
          <Text style={styles.detail}>Name: {order.buyerName}</Text>
          <Text style={styles.detail}>Contact: {order.contactNumber}</Text>
          <Text style={styles.detail}>Delivery Address: {order.deliveryAddress}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default OrderItemDetails;