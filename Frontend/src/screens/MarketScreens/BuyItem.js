import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

const BuyItem = ({ route, navigation }) => {
  const { item } = route.params;
  const { user } = useUser();
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [totalPrice, setTotalPrice] = useState(item.price);
  const [buyerData, setBuyerData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Format current date using native JavaScript
  const formatDate = (date) => {
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };
  
  const today = formatDate(new Date());

  // Fetch buyer data
  useEffect(() => {
    const fetchBuyerData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setBuyerData(userData);
            // Pre-fill contact details if available
            if (userData.phone) setContactNumber(userData.phone);
            if (userData.address) setAddress(userData.address);
          }
        } catch (error) {
          console.error('Error fetching buyer data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBuyerData();
  }, [user]);

  // Update total price when quantity changes
  useEffect(() => {
    setTotalPrice(item.price * quantity);
  }, [quantity, item.price]);

  const handleQuantityChange = (value) => {
    // Ensure quantity is between 1 and available stock
    const newQuantity = Math.max(1, Math.min(value, item.Stock));
    setQuantity(newQuantity);
  };

  const handleIncrement = () => {
    if (quantity < item.Stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handlePurchase = async () => {
    // Validation
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter your delivery address');
      return;
    }

    if (!contactNumber.trim()) {
      Alert.alert('Error', 'Please enter your contact number');
      return;
    }

    if (!/^\d{10}$/.test(contactNumber.replace(/[^0-9]/g, ''))) {
      Alert.alert('Error', 'Please enter a valid 10-digit contact number');
      return;
    }

    try {
      // Create order in database (in a real app)
      // Update stock quantity
      const newStock = item.Stock - quantity;
      await updateDoc(doc(firestore, 'items', item.id), {
        Stock: newStock
      });

      // Show success message
      Alert.alert(
        'Purchase Successful!',
        'Your order has been placed successfully. You will receive confirmation shortly.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home')
          }
        ]
      );
    } catch (error) {
      console.error('Error processing purchase:', error);
      Alert.alert('Error', 'Failed to process your purchase. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={styles.placeholderRight} />
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome, {loading ? 'Loading...' : buyerData?.name || 'Guest'}
          </Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>

        {/* Item Preview */}
        <View style={styles.itemPreviewContainer}>
          <View style={styles.itemImageContainer}>
            {item.images && item.images.length > 0 ? (
              <Image source={{ uri: item.images[0] }} style={styles.itemImage} resizeMode="cover" />
            ) : (
              <View style={styles.noImageContainer}>
                <Icon name="image-not-supported" size={36} color="#6c757d" />
              </View>
            )}
          </View>
          <View style={styles.itemPreviewDetails}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.itemName}
            </Text>
            <Text style={styles.itemPrice}>Rs. {Number(item.price).toLocaleString()} per unit</Text>
            <Text style={styles.stockInfo}>
              {item.Stock} {item.Stock === 1 ? 'unit' : 'units'} available
            </Text>
          </View>
        </View>

        {/* Quantity Selector */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Select Quantity</Text>
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              onPress={handleDecrement}
              style={[styles.quantityButton, quantity <= 1 && styles.disabledButton]}
              disabled={quantity <= 1}
            >
              <Icon name="remove" size={24} color={quantity <= 1 ? '#ccc' : '#333'} />
            </TouchableOpacity>
            <TextInput
              style={styles.quantityInput}
              value={String(quantity)}
              onChangeText={(text) => {
                const value = parseInt(text) || 0;
                handleQuantityChange(value);
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
            <TouchableOpacity
              onPress={handleIncrement}
              style={[styles.quantityButton, quantity >= item.Stock && styles.disabledButton]}
              disabled={quantity >= item.Stock}
            >
              <Icon name="add" size={24} color={quantity >= item.Stock ? '#ccc' : '#333'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your complete delivery address"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Contact Number */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Contact Number</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your contact number"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Item Price:</Text>
            <Text style={styles.summaryValue}>Rs. {Number(item.price).toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Quantity:</Text>
            <Text style={styles.summaryValue}>{quantity}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee:</Text>
            <Text style={styles.freeDelivery}>FREE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>Rs. {Number(totalPrice).toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptionsContainer}>
            <TouchableOpacity style={[styles.paymentOption, styles.selectedPayment]}>
              <Icon name="payments" size={24} color="#007bff" />
              <Text style={styles.paymentOptionText}>Cash on Delivery</Text>
              <Icon name="check-circle" size={20} color="#007bff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.bottomTotalContainer}>
          <Text style={styles.bottomTotalLabel}>Total:</Text>
          <Text style={styles.bottomTotalAmount}>Rs. {Number(totalPrice).toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={styles.purchaseButton} onPress={handlePurchase}>
          <Text style={styles.purchaseButtonText}>Confirm Purchase</Text>
          <Icon name="shopping-bag" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholderRight: {
    width: 40,
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemPreviewContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f1f3f5',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
  },
  itemPreviewDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#28a745',
    marginBottom: 4,
  },
  stockInfo: {
    fontSize: 14,
    color: '#666',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  quantityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  disabledButton: {
    backgroundColor: '#f1f3f5',
  },
  quantityInput: {
    textAlign: 'center',
    width: 60,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#555',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  freeDelivery: {
    fontSize: 15,
    fontWeight: '500',
    color: '#28a745',
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e4e8',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007bff',
  },
  paymentOptionsContainer: {
    marginTop: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedPayment: {
    borderColor: '#007bff',
    backgroundColor: 'rgba(0, 123, 255, 0.05)',
  },
  paymentOptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  spacer: {
    height: 100,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e4e8',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bottomTotalContainer: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 14,
    color: '#666',
  },
  bottomTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginLeft: 16,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default BuyItem;