import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, getDoc } from 'firebase/firestore'; // Added addDoc, getDoc
import { getAuth } from 'firebase/auth';

const ShopOrdersScreen = () => {
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const statusFilters = ['all', 'pending', 'accepted', 'completed', 'rejected'];

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

      // Fetch order to get userId and shop details
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Order not found');
      }
      const orderData = orderSnap.data();
      const customerId = orderData.userId;

      // Fetch shop details
      const shopRef = doc(firestore, 'users', currentUser.uid);
      const shopSnap = await getDoc(shopRef);
      const shopName = shopSnap.exists() ? shopSnap.data().name || 'Shop' : 'Shop';

      // Create notification for the customer
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
          Customer: {item.userId.slice(0, 8)}...
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
        {item.status === 'accepted' && (
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#0095f6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  orderList: {
    padding: 12,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  status_pending: {
    backgroundColor: '#ffe082',
    color: '#333',
  },
  status_accepted: {
    backgroundColor: '#81c784',
    color: '#fff',
  },
  status_completed: {
    backgroundColor: '#4caf50',
    color: '#fff',
  },
  status_rejected: {
    backgroundColor: '#ef5350',
    color: '#fff',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderItems: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 14,
    color: '#666',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#ef5350',
  },
  completeButton: {
    backgroundColor: '#0095f6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});

export default ShopOrdersScreen;