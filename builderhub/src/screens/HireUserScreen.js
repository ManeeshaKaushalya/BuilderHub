import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Image,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { firestore, auth, storage } from '../../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styles from '../styles/HireFormScreenStyles';

function HireFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params || {};
  const currentUser = auth.currentUser;

  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow access to your media library to upload images.');
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        }));
        setFiles(prevFiles => [...prevFiles, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

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
            type: 'application/pdf',
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
      const uploadedFiles = await Promise.all(
        files.map(file => uploadFile(file))
      );

      const hireRequest = {
        clientId: currentUser.uid,
        hiredUserId: userId,
        projectTitle: projectTitle.trim(),
        projectDescription: projectDescription.trim(),
        files: uploadedFiles,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, 'hireRequests'), hireRequest);
      await createHireNotification(userId, docRef.id, projectTitle.trim());

      Alert.alert('Success', 'Hire request submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setProjectTitle('');
            setProjectDescription('');
            setFiles([]);
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error submitting hire request:', error);
      Alert.alert('Error', 'Failed to submit hire request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const renderFileItem = ({ item, index }) => (
    <View style={styles.fileItem}>
      {item.type.startsWith('image') ? (
        <Image
          source={{ uri: item.uri }}
          style={styles.filePreview}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.documentPreview}>
          <Ionicons name="document-outline" size={32} color="#4a6da7" />
          <Text style={styles.documentTypeText}>PDF</Text>
        </View>
      )}
      <Text style={styles.fileName} numberOfLines={1}>
        {item.name.length > 15 ? `${item.name.substring(0, 12)}...` : item.name}
      </Text>
      <TouchableOpacity
        style={styles.removeFileButton}
        onPress={() => removeFile(index)}
        disabled={loading}
      >
        <Ionicons name="close-circle" size={20} color="#ff3b30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Hire Request</Text>
        <View style={{ width: 24 }} /> {/* Spacer for balance */}
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Project Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Project Title*</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Build a Home"
              placeholderTextColor="#999"
              value={projectTitle}
              onChangeText={setProjectTitle}
              editable={!loading}
              maxLength={60}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Project Description*</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the project requirements, timeline, and budget if applicable..."
              placeholderTextColor="#999"
              value={projectDescription}
              onChangeText={setProjectDescription}
              multiline
              numberOfLines={5}
              editable={!loading}
              maxLength={1000}
            />
            <Text style={styles.charCounter}>
              {projectDescription.length}/1000 characters
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Attachments (Optional)</Text>
            <Text style={styles.fieldSubLabel}>Supporting documents or reference images</Text>

            <View style={styles.uploadButtonsContainer}>
              <TouchableOpacity
                style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
                onPress={pickImages}
                disabled={loading}
              >
                <Ionicons name="image" size={18} color="black" style={styles.buttonIcon} />
                <Text style={styles.uploadButtonText}>Add Images</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadButton, styles.uploadButtonAlt, loading && styles.uploadButtonDisabled]}
                onPress={pickDocuments}
                disabled={loading}
              >
                <Ionicons name="document-attach" size={18} color="#4a6da7" style={styles.buttonIcon} />
                <Text style={[styles.uploadButtonText, styles.uploadButtonAltText]}>Add Documents</Text>
              </TouchableOpacity>
            </View>

            {files.length > 0 && (
              <View style={styles.filesContainer}>
                <FlatList
                  data={files}
                  renderItem={renderFileItem}
                  keyExtractor={(item, index) => `${index}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filesListContent}
                />
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color="black" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export default HireFormScreen;