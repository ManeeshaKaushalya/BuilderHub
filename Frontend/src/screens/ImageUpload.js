import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../hooks/ThemeContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore, storage } from '../../firebase/firebaseConfig'; // Adjust path if needed
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';

const ImageUpload = () => {
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const { isDarkMode } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);
  }, []);
    


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
        setImage(uri); // Store local URI for preview
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };
  
  const handleUpload = async () => {
    if (!text && !image) {
      Alert.alert('Error', 'Please add a description or select an image.');
      return;
    }
  
    setUploading(true);
  
    try {
      let imageUrl = '';
  
      if (image) {
        if (!image.startsWith('https')) {
          // Only upload if image is not already a URL
          const response = await fetch(image);
          const blob = await response.blob();
  
          if (!blob) {
            throw new Error('Failed to create a blob from the image URI');
          }
  
          const imageRef = ref(storage, `posts/${user?.uid}/${Date.now()}.jpg`);
  
          // Upload the blob to Firebase
          await uploadBytes(imageRef, blob);
          imageUrl = await getDownloadURL(imageRef); // Get the image URL after upload
        } else {
          imageUrl = image; // Already uploaded image URL
        }
      }
  
      await addDoc(collection(firestore, 'posts'), {
        timestamp: serverTimestamp(),
        caption: text,
        imageUrl,
        username: user?.displayName || 'Anonymous',
        uid: user?.uid,
      });
  
      Alert.alert('Success', 'Post uploaded successfully!');
      setText('');
      setImage(null);
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Error', 'Failed to upload post. Please try again later.');
    } finally {
      setUploading(false);
    }
  };
  
  

  return (
    <ScrollView style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <View style={[styles.postContainer, isDarkMode ? styles.darkPostContainer : styles.lightPostContainer]}>
        <Text style={[styles.title, isDarkMode ? styles.darkTitle : styles.lightTitle]}>Upload Project Details</Text>

        <TextInput
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
          placeholder="Describe the task or update"
          placeholderTextColor={isDarkMode ? '#ccc' : '#888'}
          multiline
          value={text}
          onChangeText={setText}
        />

        {/* Image preview should be right below the text input */}
      {image && <Image source={{ uri: image }} style={styles.imagePreview} />}

        <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleImageUpload}>
  <Icon name="clipboard" size={20} color="green" />
  <Text style={[styles.actionText, isDarkMode ? styles.darkActionText : styles.lightActionText]}>
    Blueprint
  </Text>
</TouchableOpacity>




          <TouchableOpacity style={styles.actionButton}>
            <Icon name="video" size={20} color="red" />
            <Text style={[styles.actionText, isDarkMode ? styles.darkActionText : styles.lightActionText]}>
              Inspection
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Icon name="tasks" size={20} color="orange" />
            <Text style={[styles.actionText, isDarkMode ? styles.darkActionText : styles.lightActionText]}>
              Task
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.postButton, isDarkMode ? styles.darkPostButton : styles.lightPostButton]}
          onPress={handleUpload}
          disabled={uploading}
        >
          <Text style={styles.postButtonText}>{uploading ? 'Uploading...' : 'Post Update'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  lightContainer: { backgroundColor: '#f0f2f5' },
  darkContainer: { backgroundColor: '#121212' },
  postContainer: { width: '100%', padding: 15, borderRadius: 10 },
  lightPostContainer: { backgroundColor: '#fff' },
  darkPostContainer: { backgroundColor: '#1c1c1c' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  lightTitle: { color: '#000' },
  darkTitle: { color: '#fff' },
  input: {
    minHeight: 80,
    borderBottomWidth: 1,
    marginBottom: 10,
    width: '100%',
  },
  lightInput: { borderBottomColor: '#ddd', color: '#000' },
  darkInput: { borderBottomColor: '#444', color: '#fff' },
  imagePreview: { width: '100%', height: 200, borderRadius: 10, marginTop: 10 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    width: '100%',
  },
  actionButton: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 5, fontSize: 14 },
  lightActionText: { color: '#000' },
  darkActionText: { color: '#fff' },
  postButton: {
    padding: 10,
    alignItems: 'center',
    borderRadius: 5,
    width: '100%',
  },
  lightPostButton: { backgroundColor: '#1877f2' },
  darkPostButton: { backgroundColor: '#1877f2' },
  postButtonText: { color: '#fff', fontWeight: 'bold' },
  imagePreview: {
    width: 100, // Small size
    height: 100, 
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-start', // Aligns image properly
  },
  
});

export default ImageUpload;
