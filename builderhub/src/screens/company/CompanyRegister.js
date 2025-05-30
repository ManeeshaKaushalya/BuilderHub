import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../../../firebase/firebaseConfig';
import styles, { COLORS } from '../../styles/UserRegisterStyles';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { Linking } from 'react-native';


const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyB4Nm99rBDcpjDkapSc8Z51zJZ5bOU7PI0';
if (!GOOGLE_API_KEY) {
  throw new Error('Google API Key is missing. Set GOOGLE_API_KEY in .env');
}
const INITIAL_DELTA = { latitudeDelta: 0.0922, longitudeDelta: 0.0421 };
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const CompanyRegister = ({ navigation }) => {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [location, setLocation] = useState(''); // Stores latitude,longitude for DB
  const [locationAddress, setLocationAddress] = useState(''); // Stores human-readable address for UI and DB
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const autocompleteRef = useRef(null);
  const watchSubscription = useRef(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    requestPermissions();
    return () => {
      if (watchSubscription.current) {
        watchSubscription.current.remove();
      }
    };
  }, []);

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

  useEffect(() => {
    let mounted = true;

    if (showMapModal) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            if (mounted) {
              Alert.alert(
                'Permission Denied',
                'Location access is required. Please enable it in settings.',
                [
                  { text: 'Cancel', onPress: () => setShowMapModal(false) },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ]
              );
            }
            return;
          }

          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (mounted) {
            setCurrentLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }

          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 5000,
              distanceInterval: 20,
            },
            (newLocation) => {
              if (mounted) {
                setCurrentLocation({
                  latitude: newLocation.coords.latitude,
                  longitude: newLocation.coords.longitude,
                });
              }
            }
          );
          if (mounted) watchSubscription.current = subscription;
        } catch (error) {
          if (mounted) {
            console.error('Location error:', error);
            Alert.alert('Error', 'Failed to access location. Please try again.');
          }
        } finally {
          if (mounted) setIsMapLoading(false);
        }
      })();
    }

    return () => {
      mounted = false;
      if (watchSubscription.current) {
        watchSubscription.current.remove();
      }
    };
  }, [showMapModal]);

  const requestPermissions = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera roll access is needed to upload profile images.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleImageUpload = useCallback(async () => {
    try {
      setIsUploadingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll access is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      setProfileImage(uri);
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Unable to select image.');
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const uploadImageToStorage = useCallback(async (uri, userId) => {
    try {
      const storage = getStorage();
      const imageRef = ref(storage, `profileImages/${userId}.jpg`);
      const response = await fetch(uri);
      const blob = await response.blob();

      if (blob.size > MAX_FILE_SIZE) {
        throw new Error('Image size exceeds 5MB.');
      }

      const uploadTask = uploadBytesResumable(imageRef, blob);
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          null,
          (error) => {
            console.error('Image upload error:', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }, []);

  const validateForm = useCallback(() => {
    const errors = [];
    if (!companyName.trim()) errors.push('Company name is required.');
    if (!email.trim() || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      errors.push('A valid email is required.');
    }
    if (!password.trim() || password.length < 6) errors.push('Password must be at least 6 characters.');
    if (!location.trim()) errors.push('Location is required.');
    if (!locationAddress.trim()) errors.push('Location address is required.');
    return errors;
  }, [companyName, email, password, location, locationAddress]);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const retryOperation = async (operation, maxAttempts = 3) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  };

  const handleRegister = useCallback(async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await retryOperation(() =>
        createUserWithEmailAndPassword(auth, email.trim(), password)
      );
      const user = userCredential.user;

      let imageUrl = null;
      if (profileImage && !profileImage.startsWith('http')) {
        imageUrl = await retryOperation(() => uploadImageToStorage(profileImage, user.uid));
      }

      const companyData = {
        uid: user.uid,
        name: companyName.trim(),
        email: email.trim(),
        accountType: 'Company',
        companyDescription: companyDescription.trim() || '',
        location: location.trim(),
        locationAddress: locationAddress.trim(),
        profileImage: imageUrl || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await retryOperation(() => setDoc(doc(firestore, 'users', user.uid), companyData));
      setShowSuccessModal(true);
    } catch (error) {
      let errorMessage = 'Registration failed.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email is already in use.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password must be at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = error.message;
      }
      Alert.alert('Registration Error', errorMessage);
      if (__DEV__) console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    companyName,
    email,
    password,
    companyDescription,
    location,
    locationAddress,
    profileImage,
    validateForm,
  ]);

  const handleLocationSelect = useCallback(() => {
    setShowMapModal(true);
  }, []);

  const handleMapLocationSelect = useCallback((data, details) => {
    const { lat, lng } = details.geometry.location;
    setSelectedLocation({ latitude: lat, longitude: lng });
    setLocationAddress(details.formatted_address || data.description);
    setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    autocompleteRef.current?.blur();
  }, []);

  const handleMapPress = useCallback(async (event) => {
    const coords = event.nativeEvent.coordinate;
    setSelectedLocation(coords);
    setLocation(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setLocationAddress(data.results[0].formatted_address);
      } else {
        setLocationAddress('Unknown location');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setLocationAddress('Unable to fetch address');
    }
  }, []);

  const handleConfirmLocation = useCallback(() => {
    if (selectedLocation) {
      setLocation(`${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`);
      setShowMapModal(false);
    } else if (currentLocation) {
      Alert.alert(
        'No Location Selected',
        'Would you like to use your current location?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: async () => {
              const locationString = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
              let addressString = locationAddress;
              if (!addressString) {
                try {
                  const response = await fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${currentLocation.latitude},${currentLocation.longitude}&key=${GOOGLE_API_KEY}`
                  );
                  const data = await response.json();
                  if (data.results && data.results.length > 0) {
                    addressString = data.results[0].formatted_address;
                  } else {
                    addressString = 'Unknown location';
                  }
                } catch (error) {
                  console.error('Reverse geocoding error:', error);
                  addressString = 'Unable to fetch address';
                }
              }
              setLocation(locationString);
              setLocationAddress(addressString);
              setShowMapModal(false);
            },
          },
        ]
      );
    } else {
      Alert.alert('Error', 'No location available. Please try again.');
    }
  }, [selectedLocation, currentLocation, locationAddress]);

  const handleInputFocus = (index) => {
    scrollViewRef.current?.scrollTo({
      y: index * 80,
      animated: true,
    });
  };

  return (
    <>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.ACCENT} />
          <Text style={styles.loadingText}>Creating your account...</Text>
        </View>
      )}

      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="check-circle" size={50} color={COLORS.SUCCESS} />
            <Text style={styles.modalTitle}>Registration Successful!</Text>
            <Text style={styles.modalText}>Redirecting to login...</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.mapContainer}>
          {isMapLoading || !currentLocation ? (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.mapLoadingText}>Loading map...</Text>
            </View>
          ) : (
            <>
              <View style={styles.searchContainer} pointerEvents="box-none">
                <GooglePlacesAutocomplete
                  ref={autocompleteRef}
                  placeholder="Search for a place"
                  fetchDetails={true}
                  debounce={300}
                  enablePoweredByContainer={false}
                  onPress={handleMapLocationSelect}
                  onFail={(error) => console.error('GooglePlacesAutocomplete error:', error)}
                  query={{
                    key: GOOGLE_API_KEY,
                    language: 'en',
                  }}
                  styles={{
                    container: {
                      flex: 0,
                      position: 'absolute',
                      width: '100%',
                      zIndex: 9999,
                    },
                    textInput: styles.searchInput,
                    listView: {
                      backgroundColor: COLORS.LIGHT_BG,
                      zIndex: 10000,
                    },
                  }}
                  textInputProps={{
                    autoCorrect: false,
                    autoCapitalize: 'none',
                    accessibilityLabel: 'Search location',
                    accessibilityHint: 'Enter a place name to find it on the map',
                  }}
                  keyboardShouldPersistTaps="handled"
                />
              </View>

              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{ ...currentLocation, ...INITIAL_DELTA }}
                region={selectedLocation ? { ...selectedLocation, ...INITIAL_DELTA } : undefined}
                showsUserLocation
                showsMyLocationButton
                onPress={handleMapPress}
                accessibilityLabel="Interactive map for selecting a location"
              >
                {currentLocation && (
                  <Marker
                    coordinate={currentLocation}
                    title="Your Location"
                    pinColor="blue"
                    accessibilityLabel="Your current location marker"
                    accessibilityHint="Your current location on the map"
                  />
                )}
                {selectedLocation && (
                  <Marker
                    coordinate={selectedLocation}
                    title="Selected Location"
                    pinColor="red"
                    accessibilityLabel="Selected location marker"
                    accessibilityHint="Tap to view or change the selected location"
                  />
                )}
              </MapView>

              <TouchableOpacity
                style={styles.mapButton}
                onPress={handleConfirmLocation}
                accessibilityLabel="Confirm selected location"
                accessibilityRole="button"
                accessibilityHint="Confirm the selected location and return to the form"
              >
                <Text style={styles.mapButtonText}>Confirm Location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mapButton, styles.cancelButton]}
                onPress={() => setShowMapModal(false)}
                accessibilityLabel="Cancel location selection"
                accessibilityRole="button"
                accessibilityHint="Cancel and return to the form without selecting a location"
              >
                <Text style={styles.mapButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={getStatusBarHeight() + 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 100,
            alignItems: 'center',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title} accessibilityLabel="Create Your Company Account">
            Create Your Company Account
          </Text>

          <View style={{ alignItems: 'center', width: '100%' }}>
            <TouchableOpacity
              style={styles.imageUploadContainer}
              onPress={handleImageUpload}
              disabled={isUploadingImage}
              accessibilityLabel="Upload company profile picture"
              accessibilityRole="button"
              accessibilityHint="Select an image for the company profile"
            >
              {isUploadingImage ? (
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              ) : profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                  accessibilityRole="image"
                  accessibilityLabel="Company profile picture"
                />
              ) : (
                <Icon name="camera" size={50} color={styles.uploadText.color || COLORS.GRAY} />
              )}
            </TouchableOpacity>
            <Text style={styles.uploadText}>Upload Company Profile Picture</Text>
          </View>

          <View style={styles.inputContainer}>
            <Icon name="building" size={20} color={styles.inputContainer.borderColor} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Company Name"
              value={companyName}
              onChangeText={setCompanyName}
              onFocus={() => handleInputFocus(0)}
              accessibilityLabel="Company name input"
              accessibilityRole="text"
              accessibilityHint="Enter the name of the company"
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
              onFocus={() => handleInputFocus(1)}
              accessibilityLabel="Email input"
              accessibilityRole="text"
              accessibilityHint="Enter the company email address"
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
              onFocus={() => handleInputFocus(2)}
              accessibilityLabel="Password input"
              accessibilityRole="text"
              accessibilityHint="Enter a password with at least 6 characters"
            />
            <TouchableOpacity
              onPress={toggleShowPassword}
              style={styles.eyeIcon}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
              accessibilityHint={showPassword ? 'Hide the password' : 'Show the password'}
            >
              <Icon
                name={showPassword ? 'eye' : 'eye-slash'}
                size={20}
                color={styles.inputContainer.borderColor}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Icon name="info-circle" size={20} color={styles.inputContainer.borderColor} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Company Description (optional)"
              value={companyDescription}
              onChangeText={setCompanyDescription}
              onFocus={() => handleInputFocus(3)}
              accessibilityLabel="Company description input"
              accessibilityRole="text"
              accessibilityHint="Enter an optional description of the company"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="map-marker" size={20} color={styles.inputContainer.borderColor} style={styles.icon} />
            <TouchableOpacity
              onPress={handleLocationSelect}
              style={styles.locationInputWrapper}
              accessibilityLabel="Select company location"
              accessibilityRole="button"
              accessibilityHint="Open a map to select the company location"
            >
              <TextInput
                style={[styles.input, { flex: 1, color: styles.linkBold.color }]}
                placeholder="Location"
                value={locationAddress}
                editable={false}
                onFocus={() => handleInputFocus(4)}
                accessibilityLabel="Location input"
                accessibilityRole="text"
                accessibilityHint="Displays the selected company location address"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={isLoading}
            accessibilityLabel="Register company button"
            accessibilityRole="button"
            accessibilityHint="Submit the form to register the company"
          >
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            accessibilityLabel="Login link"
            accessibilityRole="link"
            accessibilityHint="Navigate to the login screen"
          >
            <Text style={styles.link}>
              Already have an account? <Text style={styles.linkBold}>Login here</Text>
            </Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

export default React.memo(CompanyRegister);