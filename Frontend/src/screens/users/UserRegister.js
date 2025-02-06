import React, { useState, useEffect } from 'react';
import { View,Text,TextInput,TouchableOpacity,StyleSheet,Image,ScrollView,Alert} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import LocationScreen from '../LocationScreen';
import { useTheme } from '../../hooks/ThemeContext';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, firestore } from '../../../firebase/firebaseConfig';
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { doc, setDoc } from '@firebase/firestore';


const UserRegister = ({ navigation,route }) => {
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
        profileImage: profileImage || '', // You can upload the image to Firebase Storage and store the URL here
      };
  
      // Save user data to Firestore
      await setDoc(doc(firestore, 'users', user.uid), userData);
  
      Alert.alert('Success', 'Registration successful!');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Registration error', error);
      Alert.alert('Error', 'Failed to register');
    }
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
       <LocationScreen location={location} />
      
      <TouchableOpacity onPress={() => navigation.navigate('MapScreen')}>
        <Text>Select Location</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={dynamicStyles.link}>
          Already have an account? <Text style={styles.linkBold}>Login here</Text>
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
  });
  

export default UserRegister;