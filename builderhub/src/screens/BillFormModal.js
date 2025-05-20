import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  collection,
  addDoc,
} from 'firebase/firestore';

const BillFormModal = ({ visible, onClose, order, shopId }) => {
  const [billItems, setBillItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // New loading state

  useEffect(() => {
    if (order && order.items) {
      const initialBillItems = order.items.map((item, index) => ({
        id: `${item.name}-${index}`,
        name: item.name,
        quantity: (item.quantity || 1).toString(),
        price: '',
      }));
      setBillItems(initialBillItems);
    }
  }, [order]);

  useEffect(() => {
    calculateTotal();
  }, [billItems]);

  const calculateTotal = () => {
    const totalAmount = billItems.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return sum + price * quantity;
    }, 0);
    setTotal(totalAmount);
  };

  const handleQuantityChange = (index, value) => {
    const updatedItems = [...billItems];
    updatedItems[index].quantity = value.replace(/[^0-9]/g, '');
    setBillItems(updatedItems);
  };

  const handlePriceChange = (index, value) => {
    const updatedItems = [...billItems];
    updatedItems[index].price = value.replace(/[^0-9.]/g, '');
    setBillItems(updatedItems);
  };

  const handleCompleteBill = async () => {
    setIsLoading(true); // Start loading
    try {
      for (const item of billItems) {
        if (!item.quantity || parseInt(item.quantity) <= 0) {
          throw new Error('Quantity must be greater than 0 for all items.');
        }
        if (!item.price || parseFloat(item.price) <= 0) {
          throw new Error('Price must be greater than 0 for all items.');
        }
      }

      const orderRef = doc(firestore, 'orders', order.id);
      const billDetails = {
        items: billItems.map((item) => ({
          name: item.name,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
        })),
        total: total,
        createdAt: serverTimestamp(),
      };

      await updateDoc(orderRef, {
        bill: billDetails,
        updatedAt: serverTimestamp(),
      });

      const shopRef = doc(firestore, 'users', shopId);
      const shopSnap = await getDoc(shopRef);
      const shopName = shopSnap.exists() ? shopSnap.data().name || 'Shop' : 'Shop';

      const notificationRef = collection(firestore, 'users', order.userId, 'notifications');
      await addDoc(notificationRef, {
        type: 'bill_completed',
        actorId: shopId,
        orderId: order.id,
        message: { total: total },
        read: false,
        timestamp: serverTimestamp(),
      });

      Alert.alert('Success', 'Bill generated successfully.');
      onClose();
    } catch (error) {
      console.error('Error generating bill:', error);
      Alert.alert('Error', error.message || 'Failed to generate bill.');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const renderBillItem = ({ item, index }) => (
    <View key={item.id} style={styles.billItem}>
      <Text style={styles.itemName}>{item.name}</Text>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Quantity:</Text>
        <TextInput
          style={styles.input}
          value={item.quantity}
          onChangeText={(value) => handleQuantityChange(index, value)}
          keyboardType="numeric"
          placeholder="Enter quantity"
        />
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Price (Rs):</Text>
        <TextInput
          style={styles.input}
          value={item.price}
          onChangeText={(value) => handlePriceChange(index, value)}
          keyboardType="numeric"
          placeholder="Enter price"
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Generate Bill for Order #{order?.id?.slice(0, 8)}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.billList}>
            {billItems.map((item, index) => renderBillItem({ item, index }))}
          </ScrollView>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>Rs {total.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.completeBillButton, isLoading && styles.disabledButton]}
            onPress={handleCompleteBill}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" style={styles.loader} />
            ) : (
              <>
                <MaterialCommunityIcons name="check-all" size={16} color="#fff" />
                <Text style={styles.completeBillButtonText}>Complete Bill</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  billList: {
    paddingBottom: 20,
  },
  billItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F4B018',
  },
  completeBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0095f6',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  completeBillButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#66b2ff', // Lighter shade when disabled/loading
    opacity: 0.7,
  },
  loader: {
    marginRight: 8,
  },
});

export default BillFormModal;