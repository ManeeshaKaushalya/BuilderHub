import React, { useState, useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/ThemeContext';

const ShopRegister = ({ navigation }) => {
  const route = useRoute();
  const { isDarkMode } = useTheme();
  
  const [formData, setFormData] = useState({
    shopName: '',
    shopEmail: '',
    shopPassword: '',
    shopImage: null,
    shopDescription: '',
    location: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    if (route?.params?.location) {
      setFormData(prev => ({
        ...prev,
        location: route.params.location
      }));
    }
  }, [route?.params?.location]);

  const requestPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera roll permissions to upload images.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions');
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleShopImageUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        handleFormChange('shopImage', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.shopName.trim()) errors.push('Shop name is required');
    if (!formData.shopEmail.trim()) errors.push('Email is required');
    if (!formData.shopPassword.trim()) errors.push('Password is required');
    if (!formData.location.trim()) errors.push('Location is required');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.shopEmail)) {
      errors.push('Please enter a valid email address');
    }
    
    if (formData.shopPassword.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    return errors;
  };

  const handleShopRegister = async () => {
    const errors = validateForm();
    
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    setIsLoading(true);
    
    try {
      // Add your API call here
      console.log('Register Shop with:', formData);
      
      Alert.alert(
        'Success',
        'Shop Registration Successful!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ShopLogin')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to register shop. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = () => {
    navigation.navigate('MapScreen', { 
      registrationType: 'shop',
      previousLocation: formData.location 
    });
  };

  // Create input field component to reduce repetition
  const InputField = ({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, editable = true }) => (
    <View style={[dynamicStyles.inputContainer, !editable && styles.disabledInput]}>
      <Icon 
        name={icon} 
        size={20} 
        style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
      />
      <TextInput 
        style={dynamicStyles.input}
        placeholder={placeholder}
        placeholderTextColor={isDarkMode ? '#888' : '#666'}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={editable}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      />
      {!editable && (
        <TouchableOpacity 
          onPress={handleLocationSelect}
          style={styles.locationButton}
        >
          <Text style={styles.locationButtonText}>Select</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      ...styles.container,
      backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
    },
    title: {
      ...styles.title,
      color: isDarkMode ? '#fff' : '#000',
    },
    inputContainer: {
      ...styles.inputContainer,
      backgroundColor: isDarkMode ? '#333' : '#f9f9f9',
      borderColor: isDarkMode ? '#444' : '#ccc',
    },
    input: {
      ...styles.input,
      color: isDarkMode ? '#fff' : '#000',
    },
    uploadText: {
      ...styles.uploadText,
      color: isDarkMode ? '#ddd' : '#666',
    },
    link: {
      ...styles.link,
      color: isDarkMode ? '#66b0ff' : '#007BFF',
    },
  });

  return (
    <ScrollView 
      contentContainerStyle={dynamicStyles.container} 
      keyboardShouldPersistTaps="handled"
    >
      <Text style={dynamicStyles.title}>Create Your Shop Account</Text>

      <TouchableOpacity 
        style={styles.imageUploadContainer} 
        onPress={handleShopImageUpload}
      >
        {formData.shopImage ? (
          <Image source={{ uri: formData.shopImage }} style={styles.profileImage} />
        ) : (
          <Icon 
            name="camera" 
            size={50} 
            color={isDarkMode ? '#444' : '#ccc'} 
          />
        )}
      </TouchableOpacity>
      <Text style={dynamicStyles.uploadText}>Upload Shop Image</Text>

      <InputField 
        icon="store"
        placeholder="Shop Name"
        value={formData.shopName}
        onChangeText={(value) => handleFormChange('shopName', value)}
      />

      <InputField 
        icon="envelope"
        placeholder="Email"
        value={formData.shopEmail}
        onChangeText={(value) => handleFormChange('shopEmail', value)}
        keyboardType="email-address"
      />

      <InputField 
        icon="lock"
        placeholder="Password"
        value={formData.shopPassword}
        onChangeText={(value) => handleFormChange('shopPassword', value)}
        secureTextEntry
      />

      <InputField 
        icon="info-circle"
        placeholder="Shop Description"
        value={formData.shopDescription}
        onChangeText={(value) => handleFormChange('shopDescription', value)}
      />

      <InputField 
        icon="map-marker"
        placeholder="Location"
        value={formData.location}
        onChangeText={(value) => handleFormChange('location', value)}
        editable={false}
      />

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.disabledButton]} 
        onPress={handleShopRegister}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Registering...' : 'Register Shop'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('ShopLogin')}>
        <Text style={dynamicStyles.link}>
          Already have a shop account? <Text style={styles.linkBold}>Login here</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  imageUploadContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  uploadText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    height: 50,
  },
  icon: {
    padding: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    height: 50,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    fontWeight: '500',
  },
  linkBold: {
    fontWeight: 'bold',
  },
  locationButton: {
    backgroundColor: '#007BFF',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
  },
});

export default ShopRegister;