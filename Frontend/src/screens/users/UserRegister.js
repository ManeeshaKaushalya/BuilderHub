import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRoute } from '@react-navigation/native'; // Add this import
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import LocationScreen from '../LocationScreen';
import { useTheme } from '../../hooks/ThemeContext';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, firestore } from '../../../firebase/firebaseConfig';
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { doc, setDoc } from '@firebase/firestore';


const UserRegister = ({ navigation}) => {
  const route = useRoute(); // Add this line
  const { isDarkMode } = useTheme();
  
  // Add missing state declarations
  const [accountType, setAccountType] = useState('Person');
  const [profileImage, setProfileImage] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profession, setProfession] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [location, setLocation] = useState(route?.params?.location || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false)


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
          snapshot => {},
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

  const handleRegister = async () => {
    if (!name || !email || !password) {
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
  
      // Prepare user data
      const userData = {
        name,
        email,
        accountType,
        profession,
        experience,
        skills,
        location,
        profileImage: profileImage || '',
        createdAt: new Date().toISOString(),
      };
  
      // Save user data to Firestore
      await setDoc(doc(firestore, 'users', user.uid), userData);
      
      setIsLoading(false);
      setShowSuccessModal(true);
      // Navigation is now handled by useEffect
    } catch (error) {
      setIsLoading(false);
      console.error('Registration error', error);
      Alert.alert('Error', 'Failed to register');
    }
  };
  const handleLocationSelect = () => {
    navigation.navigate('MapScreen', { 
      registrationType: 'user',
      previousLocation: location 
    });
  };
  
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
    <ScrollView 
      contentContainerStyle={dynamicStyles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={dynamicStyles.title}>Create Your Account</Text>

      <TouchableOpacity 
        style={styles.imageUploadContainer} 
        onPress={handleImageUpload}
      >
        {profileImage ? (
          <Image 
            source={{ uri: profileImage }} 
            style={styles.profileImage} 
          />
        ) : (
          <Icon 
            name="camera" 
            size={50} 
            color={isDarkMode ? '#444' : '#ccc'} 
          />
        )}
      </TouchableOpacity>
      <Text style={dynamicStyles.uploadText}>Upload Profile Picture</Text>

      <View style={dynamicStyles.inputContainer}>
        <Icon 
          name="user" 
          size={20} 
          style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
        />
        <TextInput 
          style={dynamicStyles.input} 
          placeholder="Full Name" 
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={name} 
          onChangeText={setName} 
        />
      </View>

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
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address" 
          autoCapitalize="none" 
        />
      </View>

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
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
        />
      </View>

      {accountType === 'Person' && (
        <>
          <View style={dynamicStyles.inputContainer}>
            <Icon 
              name="briefcase" 
              size={20} 
              style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
            />
            <TextInput 
              style={dynamicStyles.input} 
              placeholder="Profession" 
              placeholderTextColor={isDarkMode ? '#888' : '#666'}
              value={profession} 
              onChangeText={setProfession} 
            />
          </View>

          <View style={dynamicStyles.inputContainer}>
            <Icon 
              name="clock-o" 
              size={20} 
              style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
            />
            <TextInput 
              style={dynamicStyles.input} 
              placeholder="Years of Experience" 
              placeholderTextColor={isDarkMode ? '#888' : '#666'}
              value={experience} 
              onChangeText={setExperience} 
              keyboardType="numeric" 
            />
          </View>

          <View style={dynamicStyles.inputContainer}>
            <Icon 
              name="tags" 
              size={20} 
              style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
            />
            <TextInput 
              style={dynamicStyles.input} 
              placeholder="Skills (comma separated)" 
              placeholderTextColor={isDarkMode ? '#888' : '#666'}
              value={skills} 
              onChangeText={setSkills} 
            />
          </View>
        </>
      )}

       {/* Location Picker */}
       
       <View style={dynamicStyles.inputContainer}>
          <Icon 
            name="map-marker" 
            size={20} 
            style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
          />
          <TextInput 
            style={[dynamicStyles.input, { flex: 1 }]}
            placeholder="Location"
            placeholderTextColor={isDarkMode ? '#888' : '#666'}
            value={location}
            editable={false}
          />
          <TouchableOpacity 
            onPress={handleLocationSelect}
            style={styles.locationButton}
          >
            <Text style={styles.locationButtonText}>Select Location</Text>
          </TouchableOpacity>
        </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={dynamicStyles.link}>
          Already have an account? <Text style={styles.linkBold}>Login here</Text>
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
      width: 120, // Adjust width
      height: 120, // Adjust height
      borderRadius: 60, // To keep the image circular
      backgroundColor: '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20, // Add more margin if needed for spacing
      borderWidth: 1, // Optional: Add border to make it look defined
      borderColor: '#ddd', // Optional: Add a border color
    },
    profileImage: {
      width: 100, // Slightly reduce the size of the image
      height: 100, // Keep it a circle
      borderRadius: 50, // Circular image
    },
    uploadText: {
      marginBottom: 20,
      textAlign: 'center',
      fontSize: 16, // Optional: Adjust font size for the upload text
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
  });
  

export default UserRegister;