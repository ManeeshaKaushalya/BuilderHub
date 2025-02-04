import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../../hooks/ThemeContext';
import LocationScreen from '../LocationScreen';

const ShopRegister = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [errors, setErrors] = useState({
    shopName: '',
    ownerName: '',
    contactNumber: ''
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      shopName: '',
      ownerName: '',
      contactNumber: ''
    };

    if (!shopName.trim()) {
      newErrors.shopName = 'Shop name is required';
      isValid = false;
    }

    if (!ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required';
      isValid = false;
    }

    if (!contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
      isValid = false;
    } else if (!/^\d{10}$/.test(contactNumber.trim())) {
      newErrors.contactNumber = 'Please enter a valid 10-digit number';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleShopRegister = () => {
    if (validateForm()) {
      try {
        // Here you would typically make an API call to register the shop
        console.log('Shop Registered:', { shopName, ownerName, contactNumber });
        Alert.alert(
          'Success',
          'Shop registered successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } catch (error) {
        Alert.alert(
          'Error',
          'Failed to register shop. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      ...styles.container,
      backgroundColor: isDarkMode ? '#1a1a1a' : '#fff'
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: isDarkMode ? '#fff' : '#000'
    },
    input: {
      ...styles.input,
      backgroundColor: isDarkMode ? '#333' : '#f9f9f9',
      borderColor: isDarkMode ? '#444' : '#ccc',
      color: isDarkMode ? '#fff' : '#000'
    },
    inputContainer: {
      width: '100%',
      marginBottom: 15
    },
    errorText: {
      color: '#ff4444',
      fontSize: 12,
      marginTop: 2,
      marginLeft: 2
    }
  });

  const renderInput = (placeholder, value, setValue, errorKey, iconName, keyboardType = 'default') => (
    <View style={dynamicStyles.inputContainer}>
      <View style={styles.inputWrapper}>
        <Icon 
          name={iconName} 
          size={20} 
          style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
        />
        <TextInput
          style={dynamicStyles.input}
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={value}
          onChangeText={(text) => {
            setValue(text);
            if (errors[errorKey]) {
              setErrors(prev => ({ ...prev, [errorKey]: '' }));
            }
          }}
          keyboardType={keyboardType}
        />
      </View>
      {errors[errorKey] ? <Text style={dynamicStyles.errorText}>{errors[errorKey]}</Text> : null}
    </View>
  );

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.sectionTitle}>Shop Registration</Text>

      {renderInput('Shop Name', shopName, setShopName, 'shopName', 'shop')}
      {renderInput('Owner Name', ownerName, setOwnerName, 'ownerName', 'user')}
      {renderInput('Contact Number', contactNumber, setContactNumber, 'contactNumber', 'phone', 'phone-pad')}

      <LocationScreen />

      <TouchableOpacity 
        style={[
          styles.button,
          { opacity: !shopName || !ownerName || !contactNumber ? 0.7 : 1 }
        ]} 
        onPress={handleShopRegister}
        disabled={!shopName || !ownerName || !contactNumber}
      >
        <Text style={styles.buttonText}>Register Shop</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    overflow: 'hidden'
  },
  icon: {
    padding: 10,
    width: 40,
    textAlign: 'center'
  },
  input: {
    flex: 1,
    padding: 12,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default ShopRegister;