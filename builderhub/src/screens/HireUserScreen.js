import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { firestore, auth, storage } from '../../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function HireFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params || {};
  const currentUser = auth.currentUser;

  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [files, setFiles] = useState([]); // Array of { uri, name, type }
  const [loading, setLoading] = useState(false);

  // Request media library permissions for images
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow access to your media library to upload images.');
      return false;
    }
    return true;
  };

  // Pick images
  const pickImages = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg'
        }));
        setFiles(prevFiles => [...prevFiles, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  // Pick PDF documents
  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const newFiles = result.assets
          .filter(asset => asset.mimeType === 'application/pdf' || asset.name.toLowerCase().endsWith('.pdf'))
          .map(asset => ({
            uri: asset.uri,
            name: asset.name || `document_${Date.now()}.pdf`,
            type: 'application/pdf'
          }));

        if (newFiles.length === 0) {
          Alert.alert('Error', 'No valid PDF files selected. Please choose PDF files only.');
          return;
        }

        setFiles(prevFiles => [...prevFiles, ...newFiles]);
      } else {
        Alert.alert('Error', 'No documents selected. Please try again.');
      }
    } catch (error) {
      console.error('Error picking documents:', error.message, error);
      Alert.alert('Error', 'Failed to pick documents. Ensure PDF files are accessible and try again.');
    }
  };

  // Upload a single file to Firebase Storage
  const uploadFile = async (file) => {
    try {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const fileRef = ref(storage, `hireRequests/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);
      return { url: downloadURL, name: file.name, type: file.type };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  };

  // Create notification for hired user
  const createHireNotification = async (hiredUserId, requestId, projectTitle) => {
    try {
      const clientRef = doc(firestore, 'users', currentUser.uid);
      const clientSnap = await getDoc(clientRef);
      const clientName = clientSnap.exists() ? clientSnap.data().name || 'A user' : 'A user';

      const notification = {
        actorId: currentUser.uid,
        type: 'hire_request',
        message: `${clientName} sent you a hire request for "${projectTitle}"`,
        requestId: requestId,
        read: false,
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'users', hiredUserId, 'notifications'), notification);
      console.log('Notification created for user:', hiredUserId);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to submit a hire request.');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'Invalid user ID.');
      return;
    }

    if (!projectTitle.trim()) {
      Alert.alert('Error', 'Project title is required.');
      return;
    }

    if (!projectDescription.trim()) {
      Alert.alert('Error', 'Project description is required.');
      return;
    }

    setLoading(true);

    try {
      // Upload all files to Firebase Storage
      const uploadedFiles = await Promise.all(
        files.map(file => uploadFile(file))
      );

      // Save hire request to Firestore
      const hireRequest = {
        clientId: currentUser.uid,
        hiredUserId: userId,
        projectTitle: projectTitle.trim(),
        projectDescription: projectDescription.trim(),
        files: uploadedFiles,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(firestore, 'hireRequests'), hireRequest);

      // Create notification for the hired user
      await createHireNotification(userId, docRef.id, projectTitle.trim());

      Alert.alert('Success', 'Hire request submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setProjectTitle('');
            setProjectDescription('');
            setFiles([]);
            navigation.goBack();
          }
        }
      ]);
    } catch (error) {
      console.error('Error submitting hire request:', error);
      Alert.alert('Error', 'Failed to submit hire request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Remove a file from the list
  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  // Render file item
  const renderFileItem = ({ item, index }) => (
    <View style={styles.fileItem}>
      {item.type.startsWith('image') ? (
        <Image
          source={{ uri: item.uri }}
          style={styles.filePreview}
          resizeMode="cover"
        />
      ) : (
        <Ionicons
          name="document-outline"
          size={60}
          color="#666"
          style={styles.filePreview}
        />
      )}
      <Text style={styles.fileName} numberOfLines={1}>
        {item.name}
      </Text>
      <TouchableOpacity
        style={styles.removeFileButton}
        onPress={() => removeFile(index)}
        disabled={loading}
      >
        <Ionicons name="trash-outline" size={20} color="#ff3b30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hire User</Text>
      </View>

      <ScrollView style={styles.formContainer}>
        <Text style={styles.label}>Hiring User ID: {userId}</Text>
        <Text style={styles.label}>Your ID: {currentUser?.uid || 'Not logged in'}</Text>

        <Text style={styles.fieldLabel}>Project Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter project title"
          placeholderTextColor="#999"
          value={projectTitle}
          onChangeText={setProjectTitle}
          editable={!loading}
        />

        <Text style={styles.fieldLabel}>Project Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the project"
          placeholderTextColor="#999"
          value={projectDescription}
          onChangeText={setProjectDescription}
          multiline
          numberOfLines={5}
          editable={!loading}
        />

        <Text style={styles.fieldLabel}>Upload Files</Text>
        <View style={styles.uploadButtonsContainer}>
          <TouchableOpacity
            style={[styles.uploadButton, loading && styles.uploadButtonDisabled, styles.uploadImageButton]}
            onPress={pickImages}
            disabled={loading}
          >
            <Ionicons name="image-outline" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.uploadButtonText}>Upload Images</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.uploadButton, loading && styles.uploadButtonDisabled, styles.uploadDocumentButton]}
            onPress={pickDocuments}
            disabled={loading}
          >
            <Ionicons name="document-outline" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.uploadButtonText}>Upload Documents</Text>
          </TouchableOpacity>
        </View>

        {files.length > 0 && (
          <View style={styles.filesContainer}>
            <Text style={styles.filesLabel}>Uploaded Files</Text>
            <FlatList
              data={files}
              renderItem={renderFileItem}
              keyExtractor={(item, index) => `${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filesList}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Hire Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#0288D1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0288D1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  uploadImageButton: {
    backgroundColor: '#0288D1',
  },
  uploadDocumentButton: {
    backgroundColor: '#0288D1',
  },
  uploadButtonDisabled: {
    backgroundColor: '#66B2E5',
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  filesContainer: {
    marginBottom: 16,
  },
  filesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  filesList: {
    flexGrow: 0,
  },
  fileItem: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
  },
  filePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  removeFileButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#0288D1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#66B2E5',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HireFormScreen;