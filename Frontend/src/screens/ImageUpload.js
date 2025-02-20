import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, ScrollView, Alert, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../hooks/ThemeContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore, storage } from '../../firebase/firebaseConfig';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../context/UserContext';


const ImageUpload = () => {
  const [images, setImages] = useState([]);
  const [text, setText] = useState('');
  const { isDarkMode } = useTheme();
  const [uploading, setUploading] = useState(false);
  const { user } = useUser();



  const handleImageUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages(prevImages => [...prevImages, ...newImages].slice(0, 5));
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select images');
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prevImages => prevImages.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async () => {
    if (!text && images.length === 0) {
      Alert.alert('Error', 'Please add a description or select at least one image.');
      return;
    }

    setUploading(true);
    try {
      const imageUrls = [];

      // Upload each image
      for (const image of images) {
        if (!image.startsWith('https')) {
          const storage = getStorage();
          const response = await fetch(image);
          const blob = await response.blob();
          const imageRef = ref(storage, `posts/${user?.uid}/${Date.now()}_${imageUrls.length}.jpg`);

          await uploadBytes(imageRef, blob);
          const imageUrl = await getDownloadURL(imageRef);
          imageUrls.push(imageUrl);
        } else {
          imageUrls.push(image);
        }
      }

      await addDoc(collection(firestore, 'posts'), {
        timestamp: serverTimestamp(),
        caption: text,
        imageUrls, // Store array of image URLs
        username: user?.name || 'Anonymous',
        uid: user?.uid,
      });

      Alert.alert('Success', 'Post uploaded successfully!');
      setText('');
      setImages([]);
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Error', 'Failed to upload post.');
    } finally {
      setUploading(false);
    }
  };

  const renderImagePreview = ({ item, index }) => (
    <View style={styles.imagePreviewContainer}>
      <Image source={{ uri: item }} style={styles.imagePreview} />
      <TouchableOpacity
        style={styles.removeImageButton}
        onPress={() => removeImage(index)}
      >
        <Icon name="times-circle" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );

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

        {images.length > 0 && (
          <FlatList
            data={images}
            renderItem={renderImagePreview}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageList}
          />
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleImageUpload}
            disabled={images.length >= 5}
          >
            <Icon name="clipboard" size={20} color={images.length >= 5 ? '#999' : 'green'} />
            <Text style={[
              styles.actionText,
              isDarkMode ? styles.darkActionText : styles.lightActionText,
              images.length >= 5 && styles.disabledText
            ]}>
              Blueprint ({images.length}/5)
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
          <Text style={styles.postButtonText}>
            {uploading ? 'Uploading...' : 'Post Update'}
          </Text>
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
  imageList: {
    marginVertical: 10,
  },
  imagePreviewContainer: {
    marginRight: 10,
    position: 'relative',
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
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
  disabledText: { color: '#999' },
  postButton: {
    padding: 10,
    alignItems: 'center',
    borderRadius: 5,
    width: '100%',
  },
  lightPostButton: { backgroundColor: '#1877f2' },
  darkPostButton: { backgroundColor: '#1877f2' },
  postButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default ImageUpload;