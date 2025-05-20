import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    SafeAreaView,
    Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { firestore, auth } from '../../../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../../styles/marketplacestyles/OrdersScreenStyles'; 

function OrdersScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const currentUser = auth.currentUser;

    const { userId } = route.params || {};
    const profileId = userId;

    const [boughtOrders, setBoughtOrders] = useState([]);
    const [soldOrders, setSoldOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState(null);
    const [updatingOrder, setUpdatingOrder] = useState({});
    const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'

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
                const sellerQuery = query(
                    ordersRef,
                    where('itemOwnerId', '==', profileId)
                );
                const buyerQuery = query(
                    ordersRef,
                    where('buyerId', '==', profileId)
                );

                // Fetch sold orders
                const soldOrderList = [];
                const sellerSnapshot = await getDocs(sellerQuery);
                for (const docSnap of sellerSnapshot.docs) {
                    const orderData = { id: docSnap.id, ...docSnap.data() };
                    const buyerDoc = await getDoc(doc(firestore, 'users', orderData.buyerId));
                    const buyerData = buyerDoc.exists() ? buyerDoc.data() : {};
                    soldOrderList.push({
                        ...orderData,
                        buyerName: buyerData.name || 'Unknown Buyer',
                    });
                }

                // Fetch bought orders
                const boughtOrderList = [];
                const buyerSnapshot = await getDocs(buyerQuery);
                for (const docSnap of buyerSnapshot.docs) {
                    const orderData = { id: docSnap.id, ...docSnap.data() };
                    const sellerDoc = await getDoc(doc(firestore, 'users', orderData.itemOwnerId));
                    const sellerData = sellerDoc.exists() ? sellerDoc.data() : {};
                    boughtOrderList.push({
                        ...orderData,
                        buyerName: currentUser.displayName || 'You',
                        sellerName: sellerData.name || 'Unknown Seller',
                    });
                }

                console.log('OrdersScreen: Fetched orders', {
                    boughtOrderCount: boughtOrderList.length,
                    soldOrderCount: soldOrderList.length
                });
                setBoughtOrders(boughtOrderList);
                setSoldOrders(soldOrderList);
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
                    .filter((docSnap) => 
                        [...boughtOrderList, ...soldOrderList].some((order) => order.id === docSnap.data().orderId)
                    )
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
        setUpdatingOrder((prev) => ({ ...prev, [orderId]: true }));
        try {
            await updateDoc(doc(firestore, 'item_orders', orderId), {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
            Alert.alert('Success', `Order status updated to "${newStatus}".`);
            // Refresh orders
            const ordersRef = collection(firestore, 'item_orders');
            const sellerQuery = query(ordersRef, where('itemOwnerId', '==', profileId));
            const buyerQuery = query(ordersRef, where('buyerId', '==', profileId));
            
            const soldOrderList = [];
            const sellerSnapshot = await getDocs(sellerQuery);
            for (const docSnap of sellerSnapshot.docs) {
                const orderData = { id: docSnap.id, ...docSnap.data() };
                const buyerDoc = await getDoc(doc(firestore, 'users', orderData.buyerId));
                const buyerData = buyerDoc.exists() ? buyerDoc.data() : {};
                soldOrderList.push({
                    ...orderData,
                    buyerName: buyerData.name || 'Unknown Buyer',
                });
            }
            
            const boughtOrderList = [];
            const buyerSnapshot = await getDocs(buyerQuery);
            for (const docSnap of buyerSnapshot.docs) {
                const orderData = { id: docSnap.id, ...docSnap.data() };
                const sellerDoc = await getDoc(doc(firestore, 'users', orderData.itemOwnerId));
                const sellerData = sellerDoc.exists() ? sellerDoc.data() : {};
                boughtOrderList.push({
                    ...orderData,
                    buyerName: currentUser.displayName || 'You',
                    sellerName: sellerData.name || 'Unknown Seller',
                });
            }
            
            console.log('OrdersScreen: Refreshed orders after status update', {
                boughtOrderCount: boughtOrderList.length,
                soldOrderCount: soldOrderList.length
            });
            setBoughtOrders(boughtOrderList);
            setSoldOrders(soldOrderList);
        } catch (error) {
            console.error('OrdersScreen: Error updating order status:', error);
            Alert.alert('Error', 'Failed to update order status.');
        } finally {
            setUpdatingOrder((prev) => ({ ...prev, [orderId]: false }));
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
                    <Text style={styles.orderItemName} numberOfLines={1}>{order.itemName}</Text>
                    <Text style={styles.orderStatus}>{order.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.orderDetail}>Order ID: {order.id.slice(0, 8)}...</Text>
                <Text style={styles.orderDetail}>
                    {order.buyerId === currentUser.uid ? `Seller: ${order.sellerName}` : `Buyer: ${order.buyerName}`}
                </Text>
                <Text style={styles.orderDetail}>Qty: {order.quantity}</Text>
                <Text style={styles.orderDetail}>
                    Total: Rs. {Number(order.totalPrice).toLocaleString()}
                </Text>
                <Text style={styles.orderDetail}>Date: {new Date(order.orderDate).toLocaleDateString()}</Text>
                {order.itemOwnerId === currentUser.uid && (
                    <View style={styles.statusButtons}>
                        {order.status === 'pending' && (
                            <>
                                {updatingOrder[order.id] ? (
                                    <ActivityIndicator size="small" color="#1976D2" />
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.statusButton, styles.shipButton]}
                                        onPress={() => updateOrderStatus(order.id, 'shipped')}
                                    >
                                        <Text style={styles.statusButtonText}>Mark as Shipped</Text>
                                    </TouchableOpacity>
                                )}
                                {updatingOrder[order.id] ? (
                                    <ActivityIndicator size="small" color="#D32F2F" />
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.statusButton, styles.cancelButton]}
                                        onPress={() => updateOrderStatus(order.id, 'cancelled')}
                                    >
                                        <Text style={styles.statusButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                        {order.status === 'shipped' && (
                            updatingOrder[order.id] ? (
                                <ActivityIndicator size="small" color="#2E7D32" />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.statusButton, styles.deliverButton]}
                                    onPress={() => updateOrderStatus(order.id, 'delivered')}
                                >
                                    <Text style={styles.statusButtonText}>Mark as Delivered</Text>
                                </TouchableOpacity>
                            )
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

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'buy' ? styles.activeTab : styles.inactiveTab]}
                    onPress={() => setActiveTab('buy')}
                >
                    <Text style={[styles.tabText, activeTab === 'buy' ? styles.activeTabText : styles.inactiveTabText]}>
                        Items Buy
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'sell' ? styles.activeTab : styles.inactiveTab]}
                    onPress={() => setActiveTab('sell')}
                >
                    <Text style={[styles.tabText, activeTab === 'sell' ? styles.activeTabText : styles.inactiveTabText]}>
                        Items Sell
                    </Text>
                </TouchableOpacity>
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
                    ) : (
                        <View style={styles.gridContainer}>
                            {activeTab === 'buy' && (
                                <>
                                    {boughtOrders.length === 0 ? (
                                        <View style={styles.centerContainer}>
                                            <Text style={styles.emptyText}>
                                                {currentUser && profileId === currentUser.uid
                                                    ? 'No items bought yet. Start shopping now!'
                                                    : 'No bought items available for this user.'}
                                            </Text>
                                        </View>
                                    ) : (
                                        boughtOrders.map((order, index) => (
                                            <React.Fragment key={order.id || index}>
                                                {renderOrder(order)}
                                            </React.Fragment>
                                        ))
                                    )}
                                </>
                            )}
                            {activeTab === 'sell' && (
                                <>
                                    {soldOrders.length === 0 ? (
                                        <View style={styles.centerContainer}>
                                            <Text style={styles.emptyText}>
                                                {currentUser && profileId === currentUser.uid
                                                    ? 'No items sold yet. List an item to start selling!'
                                                    : 'No sold items available for this user.'}
                                            </Text>
                                        </View>
                                    ) : (
                                        soldOrders.map((order, index) => (
                                            <React.Fragment key={order.id || index}>
                                                {renderOrder(order)}
                                            </React.Fragment>
                                        ))
                                    )}
                                </>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

export default OrdersScreen;