import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../../../firebase/firebaseConfig';

// Constants
const COLORS = {
  LIGHT_BG: '#fff',
  DARK_BG: '#1a1a1a',
  LIGHT_TEXT: '#333',
  DARK_TEXT: '#ddd',
  PRIMARY: '#007BFF',
  GRAY: '#666',
  LIGHT_GRAY: '#f9f9f9',
  DARK_GRAY: '#333',
  SUCCESS: '#4CAF50',
};

const UserRegister = ({ navigation }) => {
  const { isDarkMode } = useTheme();
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
        quality: 0.8, // Slightly reduced for faster uploads
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

  const themedStyles = styles(isDarkMode);

  return (
    <>
      {isLoading && (
        <View style={themedStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={themedStyles.loadingText}>Creating your account...</Text>
        </View>
      )}

      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            <Icon name="check-circle" size={50} color={COLORS.SUCCESS} />
            <Text style={themedStyles.modalTitle}>Registration Successful!</Text>
            <Text style={themedStyles.modalText}>Redirecting to login...</Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={themedStyles.container} keyboardShouldPersistTaps="handled">
        <Text style={themedStyles.title} accessibilityLabel="Create Your Account">
          Create Your Account
        </Text>

        <TouchableOpacity style={themedStyles.imageUploadContainer} onPress={handleImageUpload}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={themedStyles.profileImage} />
          ) : (
            <Icon name="camera" size={50} color={isDarkMode ? '#444' : COLORS.GRAY} />
          )}
        </TouchableOpacity>
        <Text style={themedStyles.uploadText}>Upload Profile Picture</Text>

        <View style={themedStyles.inputContainer}>
          <Icon name="user" size={20} color={COLORS.GRAY} style={themedStyles.icon} />
          <TextInput
            style={themedStyles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            accessibilityLabel="Full name input"
          />
        </View>

        <View style={themedStyles.inputContainer}>
          <Icon name="envelope" size={20} color={COLORS.GRAY} style={themedStyles.icon} />
          <TextInput
            style={themedStyles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Email input"
          />
        </View>

        <View style={themedStyles.inputContainer}>
          <Icon name="lock" size={20} color={COLORS.GRAY} style={themedStyles.icon} />
          <TextInput
            style={themedStyles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="Password input"
          />
        </View>

        <View style={themedStyles.inputContainer}>
          <Icon name="briefcase" size={20} color={COLORS.GRAY} style={themedStyles.icon} />
          <TextInput
            style={themedStyles.input}
            placeholder="Profession (optional)"
            value={profession}
            onChangeText={setProfession}
            accessibilityLabel="Profession input"
          />
        </View>

        <View style={themedStyles.inputContainer}>
          <Icon name="clock-o" size={20} color={COLORS.GRAY} style={themedStyles.icon} />
          <TextInput
            style={themedStyles.input}
            placeholder="Years of Experience (optional)"
            value={experience}
            onChangeText={setExperience}
            keyboardType="numeric"
            accessibilityLabel="Experience input"
          />
        </View>

        <View style={themedStyles.inputContainer}>
          <Icon name="tags" size={20} color={COLORS.GRAY} style={themedStyles.icon} />
          <TextInput
            style={themedStyles.input}
            placeholder="Skills (comma separated, optional)"
            value={skills}
            onChangeText={setSkills}
            accessibilityLabel="Skills input"
          />
        </View>

        <View style={themedStyles.inputContainer}>
          <Icon name="map-marker" size={20} color={COLORS.GRAY} style={themedStyles.icon} />
          <TextInput
            style={[themedStyles.input, { flex: 1 }]}
            placeholder="Location"
            value={location}
            editable={false}
            accessibilityLabel="Location display"
          />
          <TouchableOpacity
            style={themedStyles.locationButton}
            onPress={handleLocationSelect}
            accessibilityLabel="Select location"
          >
            <Text style={themedStyles.locationButtonText}>Select</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[themedStyles.button, isLoading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={isLoading}
          accessibilityLabel="Register button"
        >
          <Text style={themedStyles.buttonText}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={themedStyles.link}>
            Already have an account? <Text style={themedStyles.linkBold}>Login here</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
};

const styles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      alignItems: 'center',
      padding: 20,
      backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 20,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
    },
    imageUploadContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: isDarkMode ? COLORS.DARK_GRAY : '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#444' : '#ddd',
    },
    profileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    uploadText: {
      marginBottom: 20,
      fontSize: 16,
      color: isDarkMode ? '#888' : COLORS.GRAY,
    },
    inputContainer: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#444' : COLORS.GRAY,
      borderRadius: 8,
      marginBottom: 15,
      backgroundColor: isDarkMode ? COLORS.DARK_GRAY : COLORS.LIGHT_GRAY,
    },
    icon: {
      padding: 10,
    },
    input: {
      flex: 1,
      height: 50,
      paddingHorizontal: 10,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
      fontSize: 16,
    },
    button: {
      backgroundColor: COLORS.PRIMARY,
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: 'center',
      width: '100%',
      marginTop: 10,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    link: {
      marginTop: 15,
      color: isDarkMode ? '#aaa' : COLORS.GRAY,
      fontSize: 14,
    },
    linkBold: {
      fontWeight: '600',
      color: COLORS.PRIMARY,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingText: {
      color: '#fff',
      marginTop: 10,
      fontSize: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: isDarkMode ? COLORS.DARK_GRAY : COLORS.LIGHT_BG,
      borderRadius: 20,
      padding: 30,
      alignItems: 'center',
      width: '80%',
      elevation: 5,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: 15,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
    },
    modalText: {
      fontSize: 16,
      textAlign: 'center',
      color: isDarkMode ? '#ccc' : COLORS.GRAY,
      marginVertical: 10,
    },
    locationButton: {
      backgroundColor: COLORS.PRIMARY,
      padding: 8,
      borderRadius: 5,
      marginHorizontal: 10,
    },
    locationButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
  });

export default React.memo(UserRegister);