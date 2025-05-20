import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import BillFormModal from './BillFormModal'; // Import the new modal component
import styles from '../../styles/shopstyles/ShopOrdersScreenStyles'; // Import styles

const ShopOrdersScreen = () => {
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const statusFilters = ['all', 'pending', 'accepted', 'completed', 'rejected'];
  const [customerNames, setCustomerNames] = useState({});
  const [isBillModalVisible, setIsBillModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to view orders.');
      setLoading(false);
      return;
    }

    const ordersQuery = query(
      collection(firestore, 'orders'),
      where('shopId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const fetchedOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(fetchedOrders);
      filterOrders(fetchedOrders, selectedStatus);
      setLoading(false);

      fetchedOrders.forEach((order) => {
        if (!customerNames[order.id]) {
          fetchCustomerName(order.id, order.userId);
        }
      });
    }, (error) => {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    filterOrders(orders, selectedStatus);
  }, [selectedStatus, orders]);

  const fetchCustomerName = async (orderId, userId) => {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setCustomerNames((prev) => ({
          ...prev,
          [orderId]: userSnap.data().name || 'Unknown User',
        }));
      } else {
        setCustomerNames((prev) => ({
          ...prev,
          [orderId]: 'Unknown User',
        }));
      }
    } catch (error) {
      console.error('Error fetching customer name for order', orderId, ':', error);
      setCustomerNames((prev) => ({
        ...prev,
        [orderId]: 'Unknown User',
      }));
    }
  };

  const filterOrders = (ordersList, status) => {
    if (status === 'all') {
      setFilteredOrders(ordersList);
    } else {
      setFilteredOrders(ordersList.filter((order) => order.status === status));
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(firestore, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Order not found');
      }
      const orderData = orderSnap.data();
      const customerId = orderData.userId;

      const shopRef = doc(firestore, 'users', currentUser.uid);
      const shopSnap = await getDoc(shopRef);
      const shopName = shopSnap.exists() ? shopSnap.data().name || 'Shop' : 'Shop';

      const notificationRef = collection(firestore, 'users', customerId, 'notifications');
      await addDoc(notificationRef, {
        type: 'order_status',
        actorId: currentUser.uid,
        orderId: orderId,
        message: `Your order has been ${newStatus} by ${shopName}`,
        read: false,
        timestamp: serverTimestamp(),
      });

      Alert.alert('Success', `Order ${newStatus} successfully.`);
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', `Failed to update order status: ${error.message}`);
    }
  };

  const handleMakeBill = (order) => {
    setSelectedOrder(order);
    setIsBillModalVisible(true);
  };

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      {statusFilters.map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.filterButton,
            selectedStatus === status && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedStatus(status)}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedStatus === status && styles.filterButtonTextActive,
            ]}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('OrderDetailsScreen', { order: item })
        }
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
          <Text style={[styles.orderStatus, styles[`status_${item.status}`]]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.orderDate}>
          Placed: {item.createdAt?.toDate().toLocaleDateString() || 'N/A'}
        </Text>
        <Text style={styles.orderItems}>
          Items: {item.items.length} ({item.items.map((i) => i.name).join(', ')})
        </Text>
        <Text style={styles.orderCustomer}>
          Customer: {customerNames[item.id] || 'Loading...'}
        </Text>
      </TouchableOpacity>
      <View style={styles.orderActions}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => updateOrderStatus(item.id, 'accepted')}
            >
              <MaterialCommunityIcons name="check" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => updateOrderStatus(item.id, 'rejected')}
            >
              <MaterialCommunityIcons name="close" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'accepted' && !item.bill && (
          <TouchableOpacity
            style={[styles.actionButton, styles.billButton]}
            onPress={() => handleMakeBill(item)}
          >
            <MaterialCommunityIcons name="receipt" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Make Bill</Text>
          </TouchableOpacity>
        )}
        {item.status === 'accepted' && item.bill && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => updateOrderStatus(item.id, 'completed')}
          >
            <MaterialCommunityIcons name="check-all" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop Orders</Text>
      </View>
      {renderStatusFilter()}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="cart-off" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No orders found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.orderList}
          showsVerticalScrollIndicator={false}
        />
      )}
      {selectedOrder && (
        <BillFormModal
          visible={isBillModalVisible}
          onClose={() => setIsBillModalVisible(false)}
          order={selectedOrder}
          shopId={currentUser.uid}
        />
      )}
    </SafeAreaView>
  );
};

export default ShopOrdersScreen;