import React, { useState, useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { auth, firestore } from '../../../firebase/firebaseConfig';
import styles from '../../styles/ShopRegisterStyles';

const ShopRegister = ({ navigation }) => {
  const route = useRoute();

  const [shopName, setShopName] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [shopPassword, setShopPassword] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [location, setLocation] = useState(route?.params?.location || '');
  const [accountType, setAccountType] = useState('Shop');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      }, 2000);
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

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
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
        <View style={styles.modalContent}>
          <Icon name="check-circle" size={50} color={styles.modalContent.backgroundColor} />
          <Text style={styles.modalTitle}>Registration Successful!</Text>
          <Text style={styles.modalText}>Your account has been created successfully.</Text>
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
        name: shopName,
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
    <View style={[styles.inputContainer, !editable && styles.disabledInput]}>
      <Icon
        name={icon}
        size={20}
        style={[styles.icon, { color: styles.inputContainer.borderColor }]}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={styles.uploadText.color}
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

  return (
    <>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={styles.button.backgroundColor} />
          <Text style={styles.modalText}>Creating your account...</Text>
        </View>
      )}
      <SuccessModal />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Your Shop Account</Text>

        <TouchableOpacity style={styles.imageUploadContainer} onPress={handleImageUpload}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <Icon name="camera" size={50} color={styles.uploadText.color} />
          )}
        </TouchableOpacity>
        <Text style={styles.uploadText}>Upload Shop Image</Text>

        <View style={styles.inputContainer}>
          <Icon name="store" size={20} style={[styles.icon, { color: styles.inputContainer.borderColor }]} />
          <TextInput
            style={styles.input}
            placeholder="Shop Name"
            placeholderTextColor={styles.uploadText.color}
            value={shopName}
            onChangeText={setShopName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="envelope" size={20} style={[styles.icon, { color: styles.inputContainer.borderColor }]} />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={styles.uploadText.color}
            value={shopEmail}
            onChangeText={setShopEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="lock" size={20} style={[styles.icon, { color: styles.inputContainer.borderColor }]} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={styles.uploadText.color}
            value={shopPassword}
            onChangeText={setShopPassword}
            secureTextEntry={!showPassword}
            accessibilityLabel="Password input"
          />
          <TouchableOpacity
            onPress={toggleShowPassword}
            style={styles.eyeIcon}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon
              name={showPassword ? 'eye' : 'eye-slash'}
              size={20}
              color={styles.inputContainer.borderColor}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Icon name="info-circle" size={20} style={[styles.icon, { color: styles.inputContainer.borderColor }]} />
          <TextInput
            style={styles.input}
            placeholder="Shop Description"
            placeholderTextColor={styles.uploadText.color}
            value={shopDescription}
            onChangeText={setShopDescription}
          />
        </View>

        <TouchableOpacity style={styles.inputContainer} onPress={handleLocationSelect}>
          <Icon name="map-marker" size={20} style={[styles.icon, { color: styles.inputContainer.borderColor }]} />
          <TextInput
            style={styles.input}
            placeholder="Select Location"
            placeholderTextColor={styles.uploadText.color}
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

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>
            Already have a shop account? <Text style={styles.linkBold}>Login here</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
};

export default ShopRegister;