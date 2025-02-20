import React, { useState, useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/ThemeContext';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { auth, firestore } from '../../../firebase/firebaseConfig';

const ShopRegister = ({ navigation }) => {
  const route = useRoute();
  const { isDarkMode } = useTheme();

  const [shopName, setShopName] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [shopPassword, setShopPassword] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [location, setLocation] = useState(route?.params?.location || '');
  const [accountType, setAccountType] = useState('Shop');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    requestPermissions();
  }, []);

  // Handle location updates from MapScreen
  useEffect(() => {
    if (route.params?.location) {
      setLocation(route.params.location);
    }
  }, [route.params?.location]);

  // Add useEffect to handle auto-navigation
  useEffect(() => {
    let navigationTimer;
    if (showSuccessModal) {
      navigationTimer = setTimeout(() => {
        setShowSuccessModal(false);
        navigation.navigate('Login');
      }, 2000); // Show success message for 2 seconds
    }
    return () => {
      if (navigationTimer) {
        clearTimeout(navigationTimer);
      }
    };
  }, [showSuccessModal, navigation]);


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



  const handleImageUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setProfileImage(uri);

        // Upload image to Firebase Storage
        const storage = getStorage();
        const storageRef = ref(storage, `profileImages/${new Date().getTime()}`);
        const response = await fetch(uri);
        const blob = await response.blob();

        const uploadTask = uploadBytesResumable(storageRef, blob);
        uploadTask.on(
          'state_changed',
          snapshot => { },
          error => {
            console.error('Image upload failed:', error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setProfileImage(downloadURL);
          }
        );
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };


  const validateForm = () => {
    const errors = [];

    if (!shopName.trim()) errors.push('Shop name is required');
    if (!shopEmail.trim()) errors.push('Email is required');
    if (!shopPassword.trim()) errors.push('Password is required');
    if (!location.trim()) errors.push('Location is required');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shopEmail)) {
      errors.push('Please enter a valid email address');
    }

    if (shopPassword.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    return errors;
  };

  // Success Modal Component
  const SuccessModal = () => (
    <Modal
      transparent={true}
      visible={showSuccessModal}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
          <Icon name="check-circle" size={50} color="#4CAF50" />
          <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
            Registration Successful!
          </Text>
          <Text style={[styles.modalText, isDarkMode && styles.modalTextDark]}>
            Your account has been created successfully.
          </Text>
          {/* Removed the button since we're auto-navigating */}
        </View>
      </View>
    </Modal>
  );

  const handleShopRegister = async () => {
    // Validate form inputs
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      Alert.alert('Validation Error', validationErrors.join('\n'));
      return;
    }

    try {
      setIsLoading(true);

      // First, create the authentication user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        shopEmail,
        shopPassword
      );

      // Get the user ID from the newly created auth user
      const uid = userCredential.user.uid;

      // Prepare shop data
      const shopData = {
        uid,
        shopName,
        email: shopEmail,
        accountType,
        description: shopDescription,
        location,
        profileImage: profileImage || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create a reference to the user document
      const userRef = doc(firestore, 'users', uid);

      // Store the shop data in Firestore
      await setDoc(userRef, shopData);

      console.log('Shop registration successful');
      setIsLoading(false);
      setShowSuccessModal(true);

    } catch (error) {
      setIsLoading(false);
      console.error('Registration error:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to register';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters long.';
      }

      Alert.alert('Error', errorMessage);
    }
  };

  const handleLocationSelect = () => {
    navigation.navigate('MapScreen', {
      registrationType: 'shop',
      previousLocation: location
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
      backgroundColor: isDarkMode ? '#1a1a1a' : '#fff'
    },
    title: {
      ...styles.title,
      color: isDarkMode ? '#fff' : '#000'
    },
    inputContainer: {
      ...styles.inputContainer,
      backgroundColor: isDarkMode ? '#333' : '#f9f9f9',
      borderColor: isDarkMode ? '#444' : '#ccc'
    },
    input: {
      ...styles.input,
      color: isDarkMode ? '#fff' : '#000'
    },
    uploadText: {
      ...styles.uploadText,
      color: isDarkMode ? '#ddd' : '#666'
    },
    link: {
      ...styles.link,
      color: isDarkMode ? '#66b0ff' : '#007BFF'
    }
  });

  return (
    <>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={{ color: '#fff', marginTop: 10 }}>
            Creating your account...
          </Text>
        </View>
      )}
      <SuccessModal />
      <ScrollView contentContainerStyle={dynamicStyles.container} keyboardShouldPersistTaps="handled">
        <Text style={dynamicStyles.title}>Create Your Shop Account</Text>

        <TouchableOpacity style={styles.imageUploadContainer} onPress={handleImageUpload}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <Icon name="camera" size={50} color={isDarkMode ? '#444' : '#ccc'} />
          )}
        </TouchableOpacity>
        <Text style={dynamicStyles.uploadText}>Upload Shop Image</Text>

        <View style={dynamicStyles.inputContainer}>
          <Icon name="store" size={20} style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} />
          <TextInput
            style={dynamicStyles.input}
            placeholder="Shop Name"
            placeholderTextColor={isDarkMode ? '#888' : '#666'}
            value={shopName}
            onChangeText={setShopName}
          />
        </View>

        <View style={dynamicStyles.inputContainer}>
          <Icon name="envelope" size={20} style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} />
          <TextInput
            style={dynamicStyles.input}
            placeholder="email-address"
            placeholderTextColor={isDarkMode ? '#888' : '#666'}
            value={shopEmail}
            onChangeText={setShopEmail}
          />
        </View>

        <View style={dynamicStyles.inputContainer}>
          <Icon name="lock" size={20} style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} />
          <TextInput
            style={dynamicStyles.input}
            placeholder="Password"
            placeholderTextColor={isDarkMode ? '#888' : '#666'}
            value={shopPassword}
            onChangeText={setShopPassword}
            secureTextEntry
          />
        </View>

        <View style={dynamicStyles.inputContainer}>
          <Icon name="info-circle" size={20} style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} />
          <TextInput
            style={dynamicStyles.input}
            placeholder="Shop Description"
            placeholderTextColor={isDarkMode ? '#888' : '#666'}
            value={shopDescription}
            onChangeText={setShopDescription}
            secureTextEntry
          />
        </View>



        <TouchableOpacity style={dynamicStyles.inputContainer} onPress={handleLocationSelect}>
          <Icon name="map-marker" size={20} style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} />
          <TextInput
            style={dynamicStyles.input}
            placeholder="Select Location"
            placeholderTextColor={isDarkMode ? '#888' : '#666'}
            value={location}
            editable={false}
          />
        </TouchableOpacity>

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
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalContentDark: {
    backgroundColor: '#333',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#000',
  },
  modalTitleDark: {
    color: '#fff',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  modalTextDark: {
    color: '#ccc',
  },
  modalButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});

export default ShopRegister;