import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Image, TouchableOpacity,
  ScrollView, Alert, FlatList, Modal, ActivityIndicator,
  Dimensions, Switch, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { firestore, storage } from '../../../firebase/firebaseConfig';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Video, VideoFullscreenUpdate } from 'expo-av';
import { useUser } from '../../context/UserContext';
import * as ImageManipulator from 'expo-image-manipulator';
import PropTypes from 'prop-types';
import { styles, COLORS } from '../../styles/ImageUploadStyles'; 

const { width } = Dimensions.get('window');

const ImageUpload = ({ navigation }) => {
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};

    return () => {
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    };
  }, []);

  const [media, setMedia] = useState([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useUser();
  const videoRef = useRef(null);

  const [beforeAfterMode, setBeforeAfterMode] = useState(false);
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [projectTimeline, setProjectTimeline] = useState('');
  const [projectCost, setProjectCost] = useState('');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentEditingImage, setCurrentEditingImage] = useState(null);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const [brightness, setBrightness] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [watermarkText, setWatermarkText] = useState('');
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const commonCategories = [
    'Interior Design', 'Plumbing', 'Electrical', 'Carpentry',
    'Landscaping', 'Painting', 'Renovation', 'Flooring',
    'Kitchen', 'Bathroom', 'Roofing', 'HVAC', 'Furniture',
  ];

  // Redirect to Login if not authenticated
  useEffect(() => {
    const auth = getAuth();
    if (!user || !auth.currentUser) {
      console.log('No authenticated user in ImageUpload, redirecting to Login');
      navigation.replace('Login');
      return;
    }
    if (user.uid !== auth.currentUser.uid) {
      console.warn('UserContext UID does not match auth UID:', user.uid, auth.currentUser.uid);
      navigation.replace('Login');
      return;
    }
  }, [user, navigation]);

  // Request camera and media library permissions
  useEffect(() => {
    let isMounted = true;

    const requestPermissions = async () => {
      if (Platform.OS !== 'web' && isMounted) {
        const camera = await ImagePicker.requestCameraPermissionsAsync();
        const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if ((camera.status !== 'granted' || library.status !== 'granted') && isMounted) {
          Alert.alert('Permission required', 'Camera and media library permission is needed.');
        }
      }
    };

    requestPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Generate suggested tags when media is added
  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    if (media.length > 0 && isMounted) {
      setLoading(true);
      timeoutId = setTimeout(() => {
        if (isMounted) {
          const randomTags = getRandomSuggestedTags(3);
          setSuggestedTags(randomTags);
          setLoading(false);
        }
      }, 1500);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [media]);

  // Auto-dismiss success modal after 1.5 seconds
  useEffect(() => {
    let timeoutId;
    if (successModalVisible) {
      timeoutId = setTimeout(() => {
        setSuccessModalVisible(false);
        resetForm();
        navigation.goBack();
      }, 1500);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [successModalVisible, navigation]);

  const getRandomSuggestedTags = (count) => {
    const shuffled = [...commonCategories].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const handleCameraCapture = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const newMedia = {
          uri: result.assets[0].uri,
          type: result.assets[0].type || 'image',
          name: `camera_${Date.now()}`,
        };
        setMedia(prevMedia => [...prevMedia, newMedia].slice(0, 10));
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const handleGalleryPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 10 - media.length,
        videoMaxDuration: 30,
      });

      if (!result.canceled) {
        const newMedia = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'image',
          name: `gallery_${Date.now()}`,
        }));
        setMedia(prevMedia => [...prevMedia, ...newMedia].slice(0, 10));
      }
    } catch (error) {
      console.error('Gallery pick error:', error);
      Alert.alert('Error', 'Failed to select media');
    }
  };

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled === false && result.assets) {
        const newDocs = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name || `document_${Date.now()}`,
          mimeType: asset.mimeType || 'application/pdf',
        }));
        setDocumentsModalVisible(true);
        setDocuments(prevDocs => [...prevDocs, ...newDocs]);
      }
    } catch (error) {
      console.error('Document pick error:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const handleBeforeImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setBeforeImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Before image pick error:', error);
      Alert.alert('Error', 'Failed to select before image');
    }
  };

  const handleAfterImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setAfterImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('After image pick error:', error);
      Alert.alert('Error', 'Failed to select after image');
    }
  };

  const removeMediaItem = (indexToRemove) => {
    setMedia(prevMedia => prevMedia.filter((_, index) => index !== indexToRemove));
  };

  const removeDocument = (indexToRemove) => {
    setDocuments(prevDocs => prevDocs.filter((_, index) => index !== indexToRemove));
  };

  const openImageEditor = (uri, index) => {
    setCurrentEditingImage(uri);
    setCurrentEditingIndex(index);
    setBrightness(0);
    setRotation(0);
    setWatermarkText('');
    setIsEditModalVisible(true);
  };

  const applyImageEdits = async () => {
    if (!currentEditingImage) return;

    setLoading(true);
    try {
      const actions = [];
      
      if (brightness !== 0) {
        actions.push({ brightness: brightness / 100 + 1 });
      }
      
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }
      
      if (actions.length > 0) {
        const result = await ImageManipulator.manipulateAsync(
          currentEditingImage,
          actions,
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        
        setMedia(prevMedia => 
          prevMedia.map((item, index) => 
            index === currentEditingIndex 
              ? { ...item, uri: result.uri } 
              : item
          )
        );
      }
      
      setIsEditModalVisible(false);
    } catch (error) {
      console.error('Image edit error:', error);
      Alert.alert('Error', 'Failed to edit image');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = (category) => {
    if (categories.includes(category)) {
      setCategories(prev => prev.filter(c => c !== category));
    } else {
      setCategories(prev => [...prev, category]);
    }
  };

  const addCustomCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories(prev => [...prev, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleUpload = async () => {
    if (!caption && media.length === 0 && !beforeImage && !afterImage) {
      Alert.alert('Error', 'Please add a description or select at least one media item.');
      return;
    }

    if (beforeAfterMode && (!beforeImage || !afterImage)) {
      Alert.alert('Error', 'Please select both before and after images.');
      return;
    }

    if (!user || !user.name || !user.uid) {
      Alert.alert('Error', 'User data is missing. Please log in again.');
      navigation.replace('Login');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const mediaUrls = [];
      let videoUrl = null;
      let beforeAfterUrls = null;
      const documentUrls = [];
      const totalUploads = media.length + documents.length + (beforeAfterMode ? 2 : 0);
      let uploadCount = 0;

      const updateProgress = () => {
        uploadCount++;
        setUploadProgress(Math.round((uploadCount / totalUploads) * 100));
      };

      await Promise.all(media.map(async (item, index) => {
        const response = await fetch(item.uri);
        const blob = await response.blob();
        const fileExtension = item.type === 'video' ? '.mp4' : '.jpg';
        const mediaRef = ref(storage, `posts/${user.uid}/${Date.now()}_${index}${fileExtension}`);
        
        await uploadBytes(mediaRef, blob);
        const downloadUrl = await getDownloadURL(mediaRef);
        
        if (item.type === 'video') videoUrl = downloadUrl;
        else mediaUrls.push(downloadUrl);
        
        updateProgress();
      }));

      if (beforeAfterMode && beforeImage && afterImage) {
        const beforeResponse = await fetch(beforeImage);
        const beforeBlob = await beforeResponse.blob();
        const beforeRef = ref(storage, `posts/${user.uid}/before_${Date.now()}.jpg`);
        await uploadBytes(beforeRef, beforeBlob);
        const beforeUrl = await getDownloadURL(beforeRef);
        
        const afterResponse = await fetch(afterImage);
        const afterBlob = await afterResponse.blob();
        const afterRef = ref(storage, `posts/${user.uid}/after_${Date.now()}.jpg`);
        await uploadBytes(afterRef, afterBlob);
        const afterUrl = await getDownloadURL(afterRef);
        
        beforeAfterUrls = {
          before: beforeUrl,
          after: afterUrl,
        };
        
        updateProgress();
        updateProgress();
      }

      await Promise.all(documents.map(async (doc) => {
        const response = await fetch(doc.uri);
        const blob = await response.blob();
        const docRef = ref(storage, `documents/${user.uid}/${doc.name}`);
        
        await uploadBytes(docRef, blob);
        const docUrl = await getDownloadURL(docRef);
        
        documentUrls.push({
          name: doc.name,
          url: docUrl,
          type: doc.mimeType,
        });
        
        updateProgress();
      }));

      let isVerified = user.isVerified || false;
      if (typeof user.isVerified === 'undefined') {
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        isVerified = userSnap.exists() ? userSnap.data().isVerified || false : false;
      }

      await addDoc(collection(firestore, 'posts'), {
        timestamp: serverTimestamp(),
        caption: caption.trim(),
        imageList: mediaUrls,
        videoUrl,
        beforeAfterImages: beforeAfterUrls,
        documentUrls,
        username: user.name,
        uid: user.uid,
        userImage: user.profileImage || null,
        categories,
        isVerified,
        projectTimeline: projectTimeline.trim(),
        projectCost: projectCost.trim(),
        likes: 0,
        likedBy: [],
      });

      // Show success modal
      setSuccessModalVisible(true);
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Error', 'Failed to upload post. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setCaption('');
    setMedia([]);
    setBeforeImage(null);
    setAfterImage(null);
    setDocuments([]);
    setCategories([]);
    setSuggestedTags([]);
    setProjectTimeline('');
    setProjectCost('');
    setBeforeAfterMode(false);
  };

  const renderMediaItem = ({ item, index }) => (
    <View style={styles.mediaItemContainer}>
      {item.type === 'video' ? (
        <Video
          ref={videoRef}
          source={{ uri: item.uri }}
          style={styles.mediaPreview}
          useNativeControls
          resizeMode="cover"
          onFullscreenUpdate={({ fullscreenUpdate }) => {
            if (fullscreenUpdate === VideoFullscreenUpdate.PLAYER_DID_DISMISS) {
              videoRef.current?.pauseAsync();
            }
          }}
        />
      ) : (
        <Image source={{ uri: item.uri }} style={styles.mediaPreview} />
      )}
      <View style={styles.mediaButtonsContainer}>
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={() => removeMediaItem(index)}
          accessibilityLabel={`Remove media item ${index + 1}`}
          accessibilityRole="button"
        >
          <MaterialIcons name="delete" size={20} color="#fff" />
        </TouchableOpacity>
        {item.type !== 'video' && (
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => openImageEditor(item.uri, index)}
            accessibilityLabel={`Edit media item ${index + 1}`}
            accessibilityRole="button"
          >
            <MaterialIcons name="edit" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderDocument = ({ item, index }) => (
    <View style={styles.documentItemContainer}>
      <MaterialIcons name="description" size={24} color={COLORS.SECONDARY_TEXT} />
      <Text style={styles.documentName} numberOfLines={1}>
        {item.name}
      </Text>
      <TouchableOpacity
        style={styles.documentButton}
        onPress={() => removeDocument(index)}
        accessibilityLabel={`Remove document ${item.name}`}
        accessibilityRole="button"
      >
        <MaterialIcons name="delete" size={20} color={COLORS.SECONDARY_TEXT} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle} accessibilityLabel="Create Project Post">
          Create Project Post
        </Text>
      </View>

      <View style={styles.postContainer}>
        {/* Caption Input */}
        <TextInput
          style={styles.input}
          placeholder="Describe your project or update..."
          placeholderTextColor={COLORS.PLACEHOLDER}
          multiline
          value={caption}
          onChangeText={setCaption}
          accessibilityLabel="Project description input"
          accessibilityRole="text"
        />

        {/* Before & After Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Before & After Mode</Text>
          <Switch
            value={beforeAfterMode}
            onValueChange={setBeforeAfterMode}
            trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
            thumbColor={beforeAfterMode ? COLORS.PRIMARY : '#fff'}
            accessibilityLabel="Toggle Before and After mode"
            accessibilityRole="switch"
          />
        </View>

        {/* Before & After Section */}
        {beforeAfterMode && (
          <View style={styles.beforeAfterContainer}>
            <View style={styles.beforeAfterColumn}>
              <Text style={styles.beforeAfterLabel}>Before</Text>
              {beforeImage ? (
                <View style={styles.beforeAfterImageContainer}>
                  <Image source={{ uri: beforeImage }} style={styles.beforeAfterImage} />
                  <TouchableOpacity
                    style={styles.beforeAfterRemoveButton}
                    onPress={() => setBeforeImage(null)}
                    accessibilityLabel="Remove before image"
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.beforeAfterPlaceholder}
                  onPress={handleBeforeImagePick}
                  accessibilityLabel="Add before image"
                  accessibilityRole="button"
                >
                  <MaterialIcons name="add-photo-alternate" size={30} color={COLORS.SECONDARY_TEXT} />
                  <Text style={styles.beforeAfterPlaceholderText}>Add Before</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.beforeAfterColumn}>
              <Text style={styles.beforeAfterLabel}>After</Text>
              {afterImage ? (
                <View style={styles.beforeAfterImageContainer}>
                  <Image source={{ uri: afterImage }} style={styles.beforeAfterImage} />
                  <TouchableOpacity
                    style={styles.beforeAfterRemoveButton}
                    onPress={() => setAfterImage(null)}
                    accessibilityLabel="Remove after image"
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.beforeAfterPlaceholder}
                  onPress={handleAfterImagePick}
                  accessibilityLabel="Add after image"
                  accessibilityRole="button"
                >
                  <MaterialIcons name="add-photo-alternate" size={30} color={COLORS.SECONDARY_TEXT} />
                  <Text style={styles.beforeAfterPlaceholderText}>Add After</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Media List */}
        {!beforeAfterMode && media.length > 0 && (
          <FlatList
            data={media}
            renderItem={renderMediaItem}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaList}
          />
        )}

        {/* Action Buttons */}
        {!beforeAfterMode && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, media.length >= 10 && styles.disabledButton]}
              onPress={handleCameraCapture}
              disabled={media.length >= 10}
              accessibilityLabel="Capture media with camera"
              accessibilityRole="button"
            >
              <Icon name="camera" size={18} color={media.length >= 10 ? COLORS.DISABLED : COLORS.PRIMARY} />
              <Text style={[styles.actionText, media.length >= 10 && styles.disabledText]}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, media.length >= 10 && styles.disabledButton]}
              onPress={handleGalleryPick}
              disabled={media.length >= 10}
              accessibilityLabel="Select media from gallery"
              accessibilityRole="button"
            >
              <Icon name="images" size={18} color={media.length >= 10 ? COLORS.DISABLED : COLORS.PRIMARY} />
              <Text style={[styles.actionText, media.length >= 10 && styles.disabledText]}>Gallery ({media.length}/10)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Project Details */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={20} color={COLORS.SECONDARY_TEXT} />
            <TextInput
              style={styles.detailInput}
              placeholder="Timeline (e.g., 2 weeks)"
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={projectTimeline}
              onChangeText={setProjectTimeline}
              accessibilityLabel="Project timeline input"
              accessibilityRole="text"
            />
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="attach-money" size={20} color={COLORS.SECONDARY_TEXT} />
            <TextInput
              style={styles.detailInput}
              placeholder="Estimated cost (e.g., LKR2000-LKR3000)"
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={projectCost}
              onChangeText={setProjectCost}
              keyboardType="default"
              accessibilityLabel="Project cost input"
              accessibilityRole="text"
            />
          </View>
        </View>

        {/* Categories & Tags */}
        <View style={styles.detailSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Categories & Tags</Text>
            <TouchableOpacity
              onPress={() => setCategoryModalVisible(true)}
              accessibilityLabel="Edit categories"
              accessibilityRole="button"
            >
              <MaterialIcons name="edit" size={20} color={COLORS.SECONDARY_TEXT} />
            </TouchableOpacity>
          </View>
          {categories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScrollView}
            >
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryTag}
                  onPress={() => addCategory(category)}
                  accessibilityLabel={`Remove category ${category}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.categoryText}>{category}</Text>
                  <MaterialIcons name="close" size={16} color={COLORS.SECONDARY_TEXT} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noCategories}>No categories selected</Text>
          )}
          {suggestedTags.length > 0 && (
            <View style={styles.suggestedTagsContainer}>
              <Text style={styles.suggestedTagsTitle}>
                <MaterialCommunityIcons name="robot-outline" size={16} color={COLORS.SECONDARY_TEXT} />
                {' '}AI Suggested Tags:
              </Text>
              <View style={styles.suggestedTagsRow}>
                {suggestedTags.map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestedTag}
                    onPress={() => addCategory(tag)}
                    accessibilityLabel={`Add suggested tag ${tag}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.suggestedTagText}>{tag}</Text>
                    <MaterialIcons name="add" size={16} color={COLORS.SECONDARY_TEXT} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Additional Documents */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Additional Documents</Text>
          <TouchableOpacity
            style={styles.fullWidthButton}
            onPress={handleDocumentPick}
            accessibilityLabel="Upload documents"
            accessibilityRole="button"
          >
            <MaterialIcons name="upload-file" size={20} color={COLORS.SECONDARY_TEXT} />
            <Text style={styles.fullWidthButtonText}>Upload Documents (blueprints, designs, etc.)</Text>
          </TouchableOpacity>
          {documents.length > 0 && (
            <FlatList
              data={documents}
              renderItem={renderDocument}
              keyExtractor={(_, index) => `doc-${index}`}
              style={styles.documentsList}
            />
          )}
        </View>

        {/* Upload/Cancel Buttons */}
        <View style={styles.uploadButtonsContainer}>
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.uploadingText}>Uploading... {uploadProgress}%</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetForm}
                accessibilityLabel="Cancel post"
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadSubmitButton}
                onPress={handleUpload}
                accessibilityLabel="Post project"
                accessibilityRole="button"
              >
                <Text style={styles.uploadSubmitButtonText}>Post Now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Success Modal */}
        <Modal
          visible={successModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSuccessModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <MaterialIcons
                name="check-circle"
                size={50}
                color={COLORS.SUCCESS}
                style={styles.successIcon}
              />
              <Text style={styles.modalTitle}>Success</Text>
              <Text style={styles.modalMessage}>
                Your project has been posted successfully!
              </Text>
            </View>
          </View>
        </Modal>

        {/* Image Editor Modal */}
        <Modal
          visible={isEditModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Image</Text>
              {currentEditingImage && (
                <Image source={{ uri: currentEditingImage }} style={styles.editorPreview} />
              )}
              <View style={styles.editorControl}>
                <Text style={styles.editorLabel}>Brightness</Text>
                <View style={styles.sliderContainer}>
                  <MaterialIcons name="brightness-low" size={20} color={COLORS.SECONDARY_TEXT} />
                  <TextInput
                    style={styles.sliderInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.PLACEHOLDER}
                    value={brightness.toString()}
                    onChangeText={(value) => setBrightness(parseInt(value) || 0)}
                    keyboardType="number-pad"
                    accessibilityLabel="Brightness adjustment input"
                    accessibilityRole="text"
                  />
                  <MaterialIcons name="brightness-high" size={20} color={COLORS.SECONDARY_TEXT} />
                </View>
              </View>
              <View style={styles.editorControl}>
                <Text style={styles.editorLabel}>Rotation</Text>
                <View style={styles.sliderContainer}>
                  <MaterialIcons name="rotate-left" size={20} color={COLORS.SECONDARY_TEXT} />
                  <TextInput
                    style={styles.sliderInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.PLACEHOLDER}
                    value={rotation.toString()}
                    onChangeText={(value) => setRotation(parseInt(value) || 0)}
                    keyboardType="number-pad"
                    accessibilityLabel="Rotation adjustment input"
                    accessibilityRole="text"
                  />
                  <MaterialIcons name="rotate-right" size={20} color={COLORS.SECONDARY_TEXT} />
                </View>
              </View>
              <View style={styles.editorControl}>
                <Text style={styles.editorLabel}>Watermark</Text>
                <TextInput
                  style={styles.watermarkInput}
                  placeholder="Add watermark text"
                  placeholderTextColor={COLORS.PLACEHOLDER}
                  value={watermarkText}
                  onChangeText={setWatermarkText}
                  accessibilityLabel="Watermark text input"
                  accessibilityRole="text"
                />
              </View>
              <View style={styles.editorButtons}>
                <TouchableOpacity
                  style={styles.editorCancelButton}
                  onPress={() => setIsEditModalVisible(false)}
                  disabled={loading}
                  accessibilityLabel="Cancel image edits"
                  accessibilityRole="button"
                >
                  <Text style={styles.editorCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editorApplyButton}
                  onPress={applyImageEdits}
                  disabled={loading}
                  accessibilityLabel="Apply image edits"
                  accessibilityRole="button"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.editorApplyButtonText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Documents Modal */}
        <Modal
          visible={documentsModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setDocumentsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Documents</Text>
              {documents.length > 0 ? (
                <FlatList
                  data={documents}
                  renderItem={renderDocument}
                  keyExtractor={(_, index) => `doc-modal-${index}`}
                  style={styles.documentsList}
                />
              ) : (
                <Text style={styles.noDocuments}>No documents added yet</Text>
              )}
              <TouchableOpacity
                style={styles.addDocumentButton}
                onPress={handleDocumentPick}
                accessibilityLabel="Add another document"
                accessibilityRole="button"
              >
                <Text style={styles.addDocumentButtonText}>Add Document</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setDocumentsModalVisible(false)}
                accessibilityLabel="Close documents modal"
                accessibilityRole="button"
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Category Modal */}
        <Modal
          visible={categoryModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Categories</Text>
              <View style={styles.customCategoryContainer}>
                <TextInput
                  style={styles.customCategoryInput}
                  placeholder="Enter custom category"
                  placeholderTextColor={COLORS.PLACEHOLDER}
                  value={newCategory}
                  onChangeText={setNewCategory}
                  accessibilityLabel="Custom category input"
                  accessibilityRole="text"
                />
                <TouchableOpacity
                  style={styles.addCustomCategoryButton}
                  onPress={addCustomCategory}
                  accessibilityLabel="Add custom category"
                  accessibilityRole="button"
                >
                  <Text style={styles.addCustomCategoryButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.commonCategoriesTitle}>Common Categories</Text>
              <View style={styles.commonCategoriesContainer}>
                {commonCategories.map((category, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.commonCategory, categories.includes(category) && styles.selectedCategory]}
                    onPress={() => addCategory(category)}
                    accessibilityLabel={`Select category ${category}`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.commonCategoryText, categories.includes(category) && styles.selectedCategoryText]}>
                      {category}
                    </Text>
                    {categories.includes(category) && (
                      <MaterialIcons name="check" size={16} color={COLORS.PRIMARY} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setCategoryModalVisible(false)}
                accessibilityLabel="Close categories modal"
                accessibilityRole="button"
              >
                <Text style={styles.closeModalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

ImageUpload.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    replace: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};

export default ImageUpload;