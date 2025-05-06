import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { auth, firestore } from '../../../firebase/firebaseConfig';
import styles from '../../styles/ClientRegisterStyle';

const CompanyRegister = ({ navigation }) => {
  const route = useRoute();

  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [location, setLocation] = useState(route?.params?.location || '');
  const [accountType, setAccountType] = useState('Company');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle location updates from MapScreen
  useEffect(() => {
    if (route.params?.location) {
      setLocation(route.params.location);
    }
  }, [route.params?.location]);

  useEffect(() => {
    requestPermissions();
  }, []);

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
            Alert.alert('Error', 'Failed to upload image');
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

  const handleRegister = async () => {
    if (!companyName || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);

      // Register user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Prepare company data
      const companyData = {
        name: companyName,
        email,
        accountType,
        companyDescription,
        location,
        profileImage: profileImage || '',
        createdAt: new Date().toISOString(),
      };

      // Create document reference directly using the firestore instance
      const userDocRef = doc(firestore, 'users', user.uid);

      // Save company data to Firestore
      await setDoc(userDocRef, companyData);

      setIsLoading(false);
      setShowSuccessModal(true);
    } catch (error) {
      setIsLoading(false);
      console.error('Registration error:', error);
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
      registrationType: 'company',
      previousLocation: location
    });
  };

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
        <Text style={styles.title}>Create Your Account</Text>

        <TouchableOpacity style={styles.imageUploadContainer} onPress={handleImageUpload}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <Icon name="camera" size={50} color={styles.uploadText.color} />
          )}
        </TouchableOpacity>
        <Text style={styles.uploadText}>Upload Profile Picture</Text>

        <View style={styles.inputContainer}>
          <Icon name="user" size={20} style={[styles.icon, { color: styles.inputContainer.borderColor }]} />
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={styles.uploadText.color}
            value={companyName}
            onChangeText={setCompanyName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="envelope" size={20} style={[styles.icon, { color: styles.inputContainer.borderColor }]} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={styles.uploadText.color}
            value={email}
            onChangeText={setEmail}
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
            value={password}
            onChangeText={setPassword}
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
            placeholder="Bio"
            placeholderTextColor={styles.uploadText.color}
            value={companyDescription}
            onChangeText={setCompanyDescription}
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

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkBold}>Login here</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
};

export default CompanyRegister;