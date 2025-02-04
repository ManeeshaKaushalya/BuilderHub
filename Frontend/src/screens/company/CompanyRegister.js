import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/ThemeContext';

const CompanyRegister = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  
  // Add missing state declarations
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [profileImage, setProfileImage] = useState(null);

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
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleRegister = () => {
    // Add basic validation
    if (!companyName || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    console.log('Register with:', { 
      companyName, 
      email, 
      password, 
      companyDescription, 
      profileImage 
    });

    Alert.alert('Success', 'Registration successful!');
    navigation.navigate('Login');
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
    <ScrollView 
      contentContainerStyle={dynamicStyles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={dynamicStyles.title}>Create Your Company Account</Text>

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
      <Text style={dynamicStyles.uploadText}>Upload Company Logo</Text>

      <View style={dynamicStyles.inputContainer}>
        <Icon 
          name="building" 
          size={20} 
          style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
        />
        <TextInput 
          style={dynamicStyles.input} 
          placeholder="Company Name" 
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={companyName} 
          onChangeText={setCompanyName} 
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

      <View style={dynamicStyles.inputContainer}>
        <Icon 
          name="info-circle" 
          size={20} 
          style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
        />
        <TextInput 
          style={dynamicStyles.input} 
          placeholder="Company Description" 
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={companyDescription} 
          onChangeText={setCompanyDescription} 
        />
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  uploadText: {
    marginBottom: 20,
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
    width: '100%',
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

export default CompanyRegister;
