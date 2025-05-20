import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import styles from '../../styles/shopstyles/MakeOrderScreenStyles'; 

const MakeOrderScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const { userId } = route.params || {}; // Shop userId from UploaderProfile

  const [items, setItems] = useState([{ name: '', quantity: '' }]);
  const [contactNumber, setContactNumber] = useState('');
  const [location, setLocation] = useState(''); // Store coordinates as "lat, lng"
  const [locationAddress, setLocationAddress] = useState(''); // Store human-readable address for UI and DB
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle navigation to OrderAddressMap for location selection
  const handleSelectLocation = () => {
    navigation.navigate('OrderAddressMap', {
      onLocationSelected: ({ coordinates, address }) => {
        setLocation(coordinates); // Store coordinates
        setLocationAddress(address); // Store human-readable address
      },
    });
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: '' }]);
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    // Check if all items have name and valid quantity
    for (const item of items) {
      if (!item.name.trim()) {
        return { valid: false, message: 'All items must have a name.' };
      }
      const quantity = parseInt(item.quantity);
      if (!item.quantity || isNaN(quantity) || quantity <= 0) {
        return { valid: false, message: 'All items must have a valid quantity greater than 0.' };
      }
    }
    // Check location and locationAddress
    if (!location.trim()) {
      return { valid: false, message: 'Please select a delivery location.' };
    }
    if (!locationAddress.trim()) {
      return { valid: false, message: 'Delivery address is required.' };
    }
    // Check contact number (basic validation for digits and length)
    if (!contactNumber.trim() || !/^\d{10}$/.test(contactNumber)) {
      return { valid: false, message: 'Contact number must be a valid 10-digit number.' };
    }
    return { valid: true };
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to place an order.');
      return;
    }

    const validation = validateForm();
    if (!validation.valid) {
      Alert.alert('Validation Error', validation.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        userId: currentUser.uid, // Customer's user ID
        shopId: userId, // Shop's user ID
        items: items.map((item) => ({
          name: item.name.trim(),
          quantity: parseInt(item.quantity),
        })),
        location: location.trim(), // Store coordinates as "lat, lng"
        locationAddress: locationAddress.trim(), // Store human-readable address
        contactNumber: contactNumber.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ordersRef = collection(firestore, 'orders');
      await addDoc(ordersRef, orderData);

      Alert.alert(
        'Success',
        'Order placed successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

      // Reset form
      setItems([{ name: '', quantity: '' }]);
      setLocation('');
      setLocationAddress('');
      setContactNumber('');
    } catch (error) {
      console.error('Error submitting order:', error);
      Alert.alert('Error', `Failed to place order: ${error.message}`, [{ text: 'OK' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityLabel="Place Order">
          Place Order
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemContainer}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>Item {index + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeItem(index)}
                  accessibilityLabel={`Remove item ${index + 1}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Item Name"
              value={item.name}
              onChangeText={(text) => updateItem(index, 'name', text)}
              editable={!isSubmitting}
              accessibilityLabel={`Item ${index + 1} name input`}
              accessibilityRole="text"
            />
            <TextInput
              style={styles.input}
              placeholder="Quantity"
              value={item.quantity}
              onChangeText={(text) => updateItem(index, 'quantity', text)}
              keyboardType="numeric"
              editable={!isSubmitting}
              accessibilityLabel={`Item ${index + 1} quantity input`}
              accessibilityRole="text"
            />
          </View>
        ))}
        <TouchableOpacity
          style={styles.addButton}
          onPress={addItem}
          disabled={isSubmitting}
          accessibilityLabel="Add another item"
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={18} color="#0095f6" style={styles.buttonIcon} />
          <Text style={styles.addButtonText}>Add Another Item</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Delivery Details</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleSelectLocation}
          disabled={isSubmitting}
          accessibilityLabel="Select delivery location"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="map-marker" size={18} color="#0095f6" style={styles.buttonIcon} />
          <Text style={styles.locationButtonText}>
            {locationAddress ? locationAddress : 'Select Delivery Location'}
          </Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Contact Number"
          value={contactNumber}
          onChangeText={setContactNumber}
          keyboardType="phone-pad"
          editable={!isSubmitting}
          accessibilityLabel="Contact number input"
          accessibilityRole="text"
        />

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityLabel="Confirm order"
          accessibilityRole="button"
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Submitting...</Text>
          ) : (
            <>
              <MaterialCommunityIcons name="cart-check" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.submitButtonText}>Confirm Order</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MakeOrderScreen;