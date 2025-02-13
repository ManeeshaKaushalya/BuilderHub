import React, { useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5'; // Updated to use FontAwesome5 for construction-related icons
import * as ImagePicker from 'react-native-image-picker';
import { useTheme } from '../hooks/ThemeContext'; // Import the useTheme hook

const ImageUpload = () => {
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const { isDarkMode } = useTheme(); // Get the dark mode state

  const pickImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.assets && response.assets.length > 0) {
        setImage(response.assets[0].uri);
      }
    });
  };

  return (
    <ScrollView style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <View style={[styles.postContainer, isDarkMode ? styles.darkPostContainer : styles.lightPostContainer]}>
        <Text style={[styles.title, isDarkMode ? styles.darkTitle : styles.lightTitle]}>Upload Project Details</Text>
        <TextInput
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
          placeholder="Describe the task or update"
          placeholderTextColor={isDarkMode ? '#ccc' : '#888'}  // Adjust placeholder color for dark mode
          multiline
          value={text}
          onChangeText={setText}
        />
        {image && <Image source={{ uri: image }} style={styles.imagePreview} />}
        <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
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
        <TouchableOpacity style={[styles.postButton, isDarkMode ? styles.darkPostButton : styles.lightPostButton]}>
          <Text style={styles.postButtonText}>Post Update</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  lightContainer: { backgroundColor: '#f0f2f5' },
  darkContainer: { backgroundColor: '#121212' },
  postContainer: { width: '100%', padding: 15, borderRadius: 10 }, // Ensure full width
  lightPostContainer: { backgroundColor: '#fff' },
  darkPostContainer: { backgroundColor: '#1c1c1c' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  lightTitle: { color: '#000' },
  darkTitle: { color: '#fff' },
  input: { 
    minHeight: 80, 
    borderBottomWidth: 1, 
    marginBottom: 10, 
    width: '100%', // Ensure input takes full width
  },
  lightInput: { borderBottomColor: '#ddd', color: '#000' },
  darkInput: { borderBottomColor: '#444', color: '#fff' },
  imagePreview: { width: '100%', height: 200, borderRadius: 10, marginTop: 10 },
  actionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginVertical: 10, 
    width: '100%', // Ensure the row takes full width
  },
  actionButton: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 5, fontSize: 14 },
  lightActionText: { color: '#000' },
  darkActionText: { color: '#fff' },
  postButton: { 
    padding: 10, 
    alignItems: 'center', 
    borderRadius: 5, 
    width: '100%' // Ensure button stretches to full width
  },
  lightPostButton: { backgroundColor: '#1877f2' },
  darkPostButton: { backgroundColor: '#1877f2' },
  postButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default ImageUpload;
