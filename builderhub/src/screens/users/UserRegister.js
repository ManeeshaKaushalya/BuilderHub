import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../../../firebase/firebaseConfig';
import styles from '../../styles/UserRegisterStyles'; // Adjust the import path as necessary

const UserRegister = ({ navigation }) => {
  const route = useRoute();

  // State declarations
  const [profileImage, setProfileImage] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profession, setProfession] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [location, setLocation] = useState(route?.params?.location || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle location updates from MapScreen
  useEffect(() => {
    if (route.params?.location) {
      setLocation(route.params.location);
    }
  }, [route.params?.location]);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  // Auto-navigate after success modal
  useEffect(() => {
    let timer;
    if (showSuccessModal) {
      timer = setTimeout(() => {
        setShowSuccessModal(false);
        navigation.navigate('Login');
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [showSuccessModal, navigation]);

  const requestPermissions = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera roll access is needed to upload profile images. Please enable it in settings.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleImageUpload = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setProfileImage(uri);

        const storage = getStorage();
        const imageRef = ref(storage, `profileImages/${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`);
        const response = await fetch(uri);
        const blob = await response.blob();

        const uploadTask = uploadBytesResumable(imageRef, blob);
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => {
              console.error('Image upload error:', error);
              Alert.alert('Error', 'Failed to upload image.');
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setProfileImage(downloadURL);
              resolve(downloadURL);
            }
          );
        });
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('Error', 'Unable to upload image.');
    }
  }, []);

  const validateForm = useCallback(() => {
    const errors = [];
    if (!name.trim()) errors.push('Full name is required.');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid email is required.');
    if (!password.trim() || password.length < 6) errors.push('Password must be at least 6 characters.');
    if (!location.trim()) errors.push('Location is required.');
    if (experience && isNaN(experience)) errors.push('Experience must be a number.');
    return errors;
  }, [name, email, password, location, experience]);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleRegister = useCallback(async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      const imageUrl = profileImage?.startsWith('http') ? profileImage : await handleImageUpload();

      const userData = {
        uid: user.uid,
        name: name.trim(),
        email: email.trim(),
        accountType: 'Person',
        profession: profession.trim() || '',
        experience: experience.trim() || '',
        skills: skills.trim() || '',
        location: location.trim(),
        profileImage: imageUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(firestore, 'users', user.uid), userData);
      setShowSuccessModal(true);
    } catch (error) {
      let errorMessage = 'Registration failed.';
      switch (error.code) {
        case 'auth/email-already-in-use': errorMessage = 'Email already in use.'; break;
        case 'auth/invalid-email': errorMessage = 'Invalid email format.'; break;
        case 'auth/weak-password': errorMessage = 'Password too weak.'; break;
        case 'auth/network-request-failed': errorMessage = 'Network error.'; break;
        default: errorMessage = error.message;
      }
      Alert.alert('Registration Error', errorMessage);
      if (__DEV__) console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, profession, experience, skills, location, profileImage, handleImageUpload]);

  const handleLocationSelect = useCallback(() => {
    navigation.navigate('MapScreen', { registrationType: 'user', previousLocation: location });
  }, [navigation, location]);

  return (
    <>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={styles.button.backgroundColor} />
          <Text style={styles.loadingText}>Creating your account...</Text>
        </View>
      )}

      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="check-circle" size={50} color={styles.modalContent.backgroundColor} />
            <Text style={styles.modalTitle}>Registration Successful!</Text>
            <Text style={styles.modalText}>Redirecting to login...</Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityLabel="Create Your Account">
          Create Your Account
        </Text>

        <TouchableOpacity style={styles.imageUploadContainer} onPress={handleImageUpload}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <Icon name="camera" size={50} color={styles.uploadText.color} />
          )}
        </TouchableOpacity>
        <Text style={styles.uploadText}>Upload Profile Picture</Text>

        <View style={styles.inputContainer}>
          <Icon name="user" size={20} color={styles.inputContainer.borderColor} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            accessibilityLabel="Full name input"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="envelope" size={20} color={styles.inputContainer.borderColor} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Email input"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="lock" size={20} color={styles.inputContainer.borderColor} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
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
          <Icon name="briefcase" size={20} color={styles.inputContainer.borderColor} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Profession (optional)"
            value={profession}
            onChangeText={setProfession}
            accessibilityLabel="Profession input"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="clock-o" size={20} color={styles.inputContainer.borderColor} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Years of Experience (optional)"
            value={experience}
            onChangeText={setExperience}
            keyboardType="numeric"
            accessibilityLabel="Experience input"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="tags" size={20} color={styles.inputContainer.borderColor} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Skills (comma separated, optional)"
            value={skills}
            onChangeText={setSkills}
            accessibilityLabel="Skills input"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="map-marker" size={20} color={styles.inputContainer.borderColor} style={styles.icon} />
          <TouchableOpacity onPress={handleLocationSelect} style={styles.locationInputWrapper}>
            <TextInput
              style={[styles.input, { flex: 1, color: styles.linkBold.color }]}
              placeholder="Location"
              value={location}
              editable={false}
              accessibilityLabel="Location input"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={isLoading}
          accessibilityLabel="Register button"
        >
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

export default React.memo(UserRegister);