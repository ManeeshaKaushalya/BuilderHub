import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/ThemeContext';

const ShopRegister = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  
  // State declarations
  const [shopName, setShopName] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [shopPassword, setShopPassword] = useState('');
  const [shopImage, setShopImage] = useState(null);
  const [shopDescription, setShopDescription] = useState('');

  useEffect(() => {
    requestPermissions();
  }, []);

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

  const handleShopImageUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setShopImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleShopRegister = () => {
    // Add basic validation
    if (!shopName || !shopEmail || !shopPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!shopEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    console.log('Register Shop with:', { 
      shopName, 
      shopEmail, 
      shopPassword, 
      shopDescription, 
      shopImage 
    });

    Alert.alert('Success', 'Shop Registration Successful!');
    navigation.navigate('ShopLogin');
  };

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
    <ScrollView contentContainerStyle={dynamicStyles.container} keyboardShouldPersistTaps="handled">
      <Text style={dynamicStyles.title}>Create Your Shop Account</Text>

      {/* Shop Image Upload */}
      <TouchableOpacity 
        style={styles.imageUploadContainer} 
        onPress={handleShopImageUpload}
      >
        {shopImage ? (
          <Image source={{ uri: shopImage }} style={styles.profileImage} />
        ) : (
          <Icon 
            name="camera" 
            size={50} 
            color={isDarkMode ? '#444' : '#ccc'} 
          />
        )}
      </TouchableOpacity>
      <Text style={dynamicStyles.uploadText}>Upload Shop Image</Text>

      {/* Shop Name */}
      <View style={dynamicStyles.inputContainer}>
        <Icon 
          name="store" 
          size={20} 
          style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
        />
        <TextInput 
          style={dynamicStyles.input} 
          placeholder="Shop Name" 
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={shopName} 
          onChangeText={setShopName} 
        />
      </View>

      {/* Shop Email */}
      <View style={dynamicStyles.inputContainer}>
        <Icon 
          name="envelope" 
          size={20} 
          style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
        />
        <TextInput 
          style={dynamicStyles.input} 
          placeholder="Email" 
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={shopEmail} 
          onChangeText={setShopEmail} 
          keyboardType="email-address" 
          autoCapitalize="none" 
        />
      </View>

      {/* Shop Password */}
      <View style={dynamicStyles.inputContainer}>
        <Icon 
          name="lock" 
          size={20} 
          style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
        />
        <TextInput 
          style={dynamicStyles.input} 
          placeholder="Password" 
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={shopPassword} 
          onChangeText={setShopPassword} 
          secureTextEntry 
        />
      </View>

      {/* Shop Description */}
      <View style={dynamicStyles.inputContainer}>
        <Icon 
          name="info-circle" 
          size={20} 
          style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
        />
        <TextInput 
          style={dynamicStyles.input} 
          placeholder="Shop Description" 
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={shopDescription} 
          onChangeText={setShopDescription} 
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleShopRegister}>
        <Text style={styles.buttonText}>Register Shop</Text>
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
});

export default ShopRegister;
