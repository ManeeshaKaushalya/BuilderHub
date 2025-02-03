import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import LocationScreen from './LocationScreen';

const RegisterScreen = ({ navigation }) => {
  const [profileImage, setProfileImage] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profession, setProfession] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need camera roll permissions to upload images.');
      }
    })();
  }, []);

  const handleImageUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleRegister = () => {
    console.log('Register with:', { name, email, password, profession, experience, skills, profileImage });
    Alert.alert('Success', 'Registration successful!');
    navigation.navigate('Login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Your Account</Text>
      <TouchableOpacity style={styles.imageUploadContainer} onPress={handleImageUpload}>
        {profileImage ? <Image source={{ uri: profileImage }} style={styles.profileImage} /> : <Icon name="camera" size={50} color="#ccc" />}
      </TouchableOpacity>
      <Text style={styles.uploadText}>Upload Profile Picture</Text>
      <View style={styles.inputContainer}>
        <Icon name="user" size={20} style={styles.icon} />
        <TextInput 
          style={styles.input} 
          placeholder="Full Name" 
          value={name} 
          onChangeText={setName} 
        />
      </View>
      <View style={styles.inputContainer}>
        <Icon name="envelope" size={20} style={styles.icon} />
        <TextInput 
          style={styles.input} 
          placeholder="Email" 
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address" 
          autoCapitalize="none" 
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} style={styles.icon} />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="briefcase" size={20} style={styles.icon} />
        <TextInput 
          style={styles.input} 
          placeholder="Profession" 
          value={profession} 
          onChangeText={setProfession} 
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="clock-o" size={20} style={styles.icon} />
        <TextInput 
          style={styles.input} 
          placeholder="Years of Experience" 
          value={experience} 
          onChangeText={setExperience} 
          keyboardType="numeric" 
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="tags" size={20} style={styles.icon} />
        <TextInput 
          style={styles.input} 
          placeholder="Skills (comma separated)" 
          value={skills} 
          onChangeText={setSkills} 
        />
      </View>
    <LocationScreen/>
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Login here</Text></Text>
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
    backgroundColor: '#fff' 
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
  },
  icon: {
    padding: 10,
    color: '#666',
  },
  title: { 
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20 
  },
  imageUploadContainer: { 
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10 
  },
  profileImage: { 
    width: 100, 
    height: 100, 
    borderRadius: 50 
  },
  uploadText: { 
    color: '#666', 
    marginBottom: 20 
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
  },
  button: { 
    backgroundColor: '#007BFF', 
    padding: 15, 
    borderRadius: 5, 
    alignItems: 'center', 
    width: '100%' 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  link: { 
    marginTop: 15, 
    color: '#007BFF', 
    fontWeight: 'bold'
  },
});

export default RegisterScreen;
