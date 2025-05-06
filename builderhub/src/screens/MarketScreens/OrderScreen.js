import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    SafeAreaView,
    Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore, auth } from '../../../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

function OrdersScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const currentUser = auth.currentUser;

    const { userId } = route.params || {};
    const profileId = userId;

    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState(null);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!currentUser || !profileId) {
                console.warn('OrdersScreen: Missing currentUser or profileId', { currentUser, profileId });
                setOrdersError('Unable to load orders: Invalid user data.');
                setOrdersLoading(false);
                return;
            }

            setOrdersLoading(true);
            setOrdersError(null);

            try {
                const ordersRef = collection(firestore, 'item_orders');
                const q1 = query(
                    ordersRef,
                    where('itemOwnerId', '==', profileId)
                );
                const q2 = query(
                    ordersRef,
                    where('buyerId', '==', profileId)
                );

                const orderList = [];
                const ownerSnapshot = await getDocs(q1);
                for (const docSnap of ownerSnapshot.docs) {
                    const orderData = { id: docSnap.id, ...docSnap.data() };
                    const buyerDoc = await getDoc(doc(firestore, 'users', orderData.buyerId));
                    const buyerData = buyerDoc.exists() ? buyerDoc.data() : {};
                    orderList.push({
                        ...orderData,
                        buyerName: buyerData.name || 'Unknown Buyer',
                    });
                }

                const buyerSnapshot = await getDocs(q2);
                for (const docSnap of buyerSnapshot.docs) {
                    const orderData = { id: docSnap.id, ...docSnap.data() };
                    const sellerDoc = await getDoc(doc(firestore, 'users', orderData.itemOwnerId));
                    const sellerData = sellerDoc.exists() ? sellerDoc.data() : {};
                    orderList.push({
                        ...orderData,
                        buyerName: currentUser.displayName || 'You',
                        sellerName: sellerData.name || 'Unknown Seller',
                    });
                }

                console.log('OrdersScreen: Fetched orders', { orderCount: orderList.length, orders: orderList });
                setOrders(orderList);
                setOrdersLoading(false);

                // Mark notifications as read
                const notificationsRef = collection(firestore, 'users', profileId, 'notifications');
                const notifQuery = query(
                    notificationsRef,
                    where('type', '==', 'order_status'),
                    where('read', '==', false)
                );
                const notifSnapshot = await getDocs(notifQuery);
                const updates = notifSnapshot.docs
                    .filter((docSnap) => orderList.some((order) => order.id === docSnap.data().orderId))
                    .map((docSnap) =>
                        updateDoc(doc(firestore, 'users', profileId, 'notifications', docSnap.id), {
                            read: true,
                        })
                    );
                await Promise.all(updates);
                console.log(`OrdersScreen: Marked ${updates.length} notifications as read`);
            } catch (error) {
                console.error('OrdersScreen: Error fetching orders:', error);
                setOrdersError('Failed to load orders. Please try again.');
                setOrdersLoading(false);
            }
        };

        fetchOrders();
    }, [profileId, currentUser]);

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            await updateDoc(doc(firestore, 'item_orders', orderId), {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
            Alert.alert('Success', `Order status updated to "${newStatus}".`);
            // Refresh orders
            const ordersRef = collection(firestore, 'item_orders');
            const q1 = query(ordersRef, where('itemOwnerId', '==', profileId));
            const q2 = query(ordersRef, where('buyerId', '==', profileId));
            const orderList = [];
            const ownerSnapshot = await getDocs(q1);
            for (const docSnap of ownerSnapshot.docs) {
                const orderData = { id: docSnap.id, ...docSnap.data() };
                const buyerDoc = await getDoc(doc(firestore, 'users', orderData.buyerId));
                const buyerData = buyerDoc.exists() ? buyerDoc.data() : {};
                orderList.push({
                    ...orderData,
                    buyerName: buyerData.name || 'Unknown Buyer',
                });
            }
            const buyerSnapshot = await getDocs(q2);
            for (const docSnap of buyerSnapshot.docs) {
                const orderData = { id: docSnap.id, ...docSnap.data() };
                const sellerDoc = await getDoc(doc(firestore, 'users', orderData.itemOwnerId));
                const sellerData = sellerDoc.exists() ? sellerDoc.data() : {};
                orderList.push({
                    ...orderData,
                    buyerName: currentUser.displayName || 'You',
                    sellerName: sellerData.name || 'Unknown Seller',
                });
            }
            console.log('OrdersScreen: Refreshed orders after status update', { orderCount: orderList.length });
            setOrders(orderList);
        } catch (error) {
            console.error('OrdersScreen: Error updating order status:', error);
            Alert.alert('Error', 'Failed to update order status.');
        }
    };

    const renderOrder = (order) => {
        if (!order || !order.id || !order.itemOwnerId) {
            console.warn('OrdersScreen: Invalid order data', { order });
            return null;
        }

        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => {
                    console.log('OrdersScreen: Navigating to OrderItemDetails', { orderId: order.id, order });
                    navigation.navigate('OrderItemDetails', { order });
                }}
            >
                <View style={styles.orderHeader}>
                    <Text style={styles.orderItemName}>{order.itemName}</Text>
                    <Text style={styles.orderStatus}>{order.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.orderDetail}>Order ID: {order.id}</Text>
                <Text style={styles.orderDetail}>
                    {order.buyerId === currentUser.uid ? `Seller: ${order.sellerName}` : `Buyer: ${order.buyerName}`}
                </Text>
                <Text style={styles.orderDetail}>Quantity: {order.quantity}</Text>
                <Text style={styles.orderDetail}>
                    Total: Rs. {Number(order.totalPrice).toLocaleString()}
                </Text>
                <Text style={styles.orderDetail}>Date: {new Date(order.orderDate).toLocaleDateString()}</Text>
                {order.itemOwnerId === currentUser.uid && (
                    <View style={styles.statusButtons}>
                        {order.status === 'pending' && (
                            <>
                                <TouchableOpacity
                                    style={[styles.statusButton, styles.shipButton]}
                                    onPress={() => updateOrderStatus(order.id, 'shipped')}
                                >
                                    <Text style={styles.statusButtonText}>Mark as Shipped</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.statusButton, styles.cancelButton]}
                                    onPress={() => updateOrderStatus(order.id, 'cancelled')}
                                >
                                    <Text style={styles.statusButtonText}>Cancel Order</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        {order.status === 'shipped' && (
                            <TouchableOpacity
                                style={[styles.statusButton, styles.deliverButton]}
                                onPress={() => updateOrderStatus(order.id, 'delivered')}
                            >
                                <Text style={styles.statusButtonText}>Mark as Delivered</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonIcon}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Orders</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView style={styles.scrollView}>
                <View style={styles.ordersContainer}>
                    {ordersLoading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#F4B018" />
                            <Text style={styles.loadingText}>Loading orders...</Text>
                        </View>
                    ) : ordersError ? (
                        <View style={styles.centerContainer}>
                            <Text style={styles.errorText}>{ordersError}</Text>
                        </View>
                    ) : orders.length === 0 ? (
                        <View style={styles.centerContainer}>
                            <Text style={styles.emptyText}>
                                {currentUser && profileId === currentUser.uid
                                    ? 'No orders found. Place an order to get started!'
                                    : 'No orders available for this user.'}
                            </Text>
                        </View>
                    ) : (
                        orders.map((order, index) => (
                            <React.Fragment key={order.id || index}>
                                {renderOrder(order)}
                            </React.Fragment>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#F4B018',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    backButtonIcon: {
        padding: 5,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    headerPlaceholder: {
        width: 24,
    },
    scrollView: {
        flex: 1,
    },
    ordersContainer: {
        margin: 16,
        padding: 16,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    orderItemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    orderStatus: {
        fontSize: 14,
        fontWeight: '500',
        color: '#007AFF',
    },
    orderDetail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    statusButtons: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 8,
    },
    statusButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    shipButton: {
        backgroundColor: '#1976D2',
    },
    deliverButton: {
        backgroundColor: '#2E7D32',
    },
    cancelButton: {
        backgroundColor: '#D32F2F',
    },
    statusButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    centerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#F4B018',
        fontWeight: '500',
    },
    errorText: {
        fontSize: 16,
        color: '#ff3b30',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});

export default OrdersScreen;