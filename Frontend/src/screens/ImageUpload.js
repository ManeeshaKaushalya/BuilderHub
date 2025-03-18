import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, Image, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, FlatList, Modal, ActivityIndicator,
  Dimensions, Switch, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../hooks/ThemeContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { firestore, storage } from '../../firebase/firebaseConfig';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Video, VideoFullscreenUpdate } from 'expo-av';
import { useUser } from '../context/UserContext';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import PropTypes from 'prop-types';

const { width } = Dimensions.get('window');

const ImageUpload = ({ navigation }) => {
  // General state
  const [media, setMedia] = useState([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const videoRef = useRef(null);

  // Advanced features state
  const [beforeAfterMode, setBeforeAfterMode] = useState(false);
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [projectTimeline, setProjectTimeline] = useState('');
  const [projectCost, setProjectCost] = useState('');
  const [location, setLocation] = useState(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
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

  // Common categories for AI suggestions
  const commonCategories = [
    'Interior Design', 'Plumbing', 'Electrical', 'Carpentry', 
    'Landscaping', 'Painting', 'Renovation', 'Flooring',
    'Kitchen', 'Bathroom', 'Roofing', 'HVAC', 'Furniture'
  ];

  // Request permissions on component mount
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

  // Simulate AI tag suggestions when media is added
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

  // Helper function to simulate AI tag suggestions
  const getRandomSuggestedTags = (count) => {
    const shuffled = [...commonCategories].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('location_permission_denied');
      }

      setLoading(true);
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const newLocation = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude
      };
      setLocation(newLocation);

      const geocode = await Location.reverseGeocodeAsync(newLocation);
      if (geocode.length > 0) {
        const locationName = `${geocode[0].city || ''}, ${geocode[0].region || ''}`;
        Alert.alert('Location added', `Added location: ${locationName}`);
      }
    } catch (error) {
      console.error('Location Error:', error);
      let message = 'Failed to get current location';
      if (error.message === 'location_permission_denied') {
        message = 'Location permission is required';
      }
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  // Camera capture
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

  // Gallery pick for images and videos
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

  // Document pick
  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
        multiple: true
      });

      if (result.canceled === false && result.assets) {
        const newDocs = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name || `document_${Date.now()}`,
          mimeType: asset.mimeType || 'application/pdf'
        }));
        setDocumentsModalVisible(true);
        setDocuments(prevDocs => [...prevDocs, ...newDocs]);
      }
    } catch (error) {
      console.error('Document pick error:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  // Certificate pick
  const handleCertificatePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });

      if (result.canceled === false && result.assets) {
        const newCerts = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name || `certificate_${Date.now()}`,
          mimeType: asset.mimeType || 'application/pdf'
        }));
        setCertificates(prevCerts => [...prevCerts, ...newCerts]);
      }
    } catch (error) {
      console.error('Certificate pick error:', error);
      Alert.alert('Error', 'Failed to select certificate');
    }
  };

  // Before image selection
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

  // After image selection
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

  // Remove media item
  const removeMediaItem = (indexToRemove) => {
    setMedia(prevMedia => prevMedia.filter((_, index) => index !== indexToRemove));
  };

  // Remove document
  const removeDocument = (indexToRemove) => {
    setDocuments(prevDocs => prevDocs.filter((_, index) => index !== indexToRemove));
  };

  // Remove certificate
  const removeCertificate = (indexToRemove) => {
    setCertificates(prevCerts => prevCerts.filter((_, index) => index !== indexToRemove));
  };

  // Open image editor
  const openImageEditor = (uri, index) => {
    setCurrentEditingImage(uri);
    setCurrentEditingIndex(index);
    setBrightness(0);
    setRotation(0);
    setWatermarkText('');
    setIsEditModalVisible(true);
  };

  // Apply image edits
  const applyImageEdits = async () => {
    if (!currentEditingImage) return;

    setLoading(true);
    try {
      const actions = [];
      
      if (brightness !== 0) {
        actions.push({ 
          brightness: brightness / 100 + 1
        });
      }
      
      if (rotation !== 0) {
        actions.push({ 
          rotate: rotation 
        });
      }
      
      if (watermarkText.trim()) {
        actions.push({ 
          flip: { horizontal: false, vertical: false }
        });
      }
      
      if (actions.length > 0) {
        const result = await ImageManipulator.manipulateAsync(
          currentEditingImage,
          actions,
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
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

  // Add category
  const addCategory = (category) => {
    if (categories.includes(category)) {
      setCategories(prev => prev.filter(c => c !== category));
    } else {
      setCategories(prev => [...prev, category]);
    }
  };

  // Add custom category
  const addCustomCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories(prev => [...prev, newCategory.trim()]);
      setNewCategory('');
    }
  };

  // Upload function
  const handleUpload = async () => {
    if (!caption && media.length === 0 && !beforeImage && !afterImage) {
      Alert.alert('Error', 'Please add a description or select at least one media item.');
      return;
    }

    if (beforeAfterMode && (!beforeImage || !afterImage)) {
      Alert.alert('Error', 'Please select both before and after images.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const mediaUrls = [];
      let videoUrl = null;
      let beforeAfterUrls = null;
      const documentUrls = [];
      const certificateUrls = [];
      const totalUploads = media.length + documents.length + certificates.length + 
        (beforeAfterMode ? 2 : 0);
      let uploadCount = 0;

      const updateProgress = () => {
        uploadCount++;
        setUploadProgress(Math.round((uploadCount / totalUploads) * 100));
      };

      // Upload media files
      await Promise.all(media.map(async (item, index) => {
        const response = await fetch(item.uri);
        const blob = await response.blob();
        const fileExtension = item.type === 'video' ? '.mp4' : '.jpg';
        const mediaRef = ref(storage, `posts/${user?.uid}/${Date.now()}_${index}${fileExtension}`);
        
        await uploadBytes(mediaRef, blob);
        const downloadUrl = await getDownloadURL(mediaRef);
        
        if (item.type === 'video') videoUrl = downloadUrl;
        else mediaUrls.push(downloadUrl);
        
        updateProgress();
      }));

      // Upload before/after images if in that mode
      if (beforeAfterMode && beforeImage && afterImage) {
        const beforeResponse = await fetch(beforeImage);
        const beforeBlob = await beforeResponse.blob();
        const beforeRef = ref(storage, `posts/${user?.uid}/before_${Date.now()}.jpg`);
        await uploadBytes(beforeRef, beforeBlob);
        const beforeUrl = await getDownloadURL(beforeRef);
        
        const afterResponse = await fetch(afterImage);
        const afterBlob = await afterResponse.blob();
        const afterRef = ref(storage, `posts/${user?.uid}/after_${Date.now()}.jpg`);
        await uploadBytes(afterRef, afterBlob);
        const afterUrl = await getDownloadURL(afterRef);
        
        beforeAfterUrls = {
          before: beforeUrl,
          after: afterUrl
        };
        
        updateProgress();
        updateProgress();
      }

      // Upload documents
      await Promise.all(documents.map(async (doc) => {
        const response = await fetch(doc.uri);
        const blob = await response.blob();
        const docRef = ref(storage, `documents/${user?.uid}/${doc.name}`);
        
        await uploadBytes(docRef, blob);
        const docUrl = await getDownloadURL(docRef);
        
        documentUrls.push({
          name: doc.name,
          url: docUrl,
          type: doc.mimeType
        });
        
        updateProgress();
      }));

      // Upload certificates
      await Promise.all(certificates.map(async (cert) => {
        const response = await fetch(cert.uri);
        const blob = await response.blob();
        const certRef = ref(storage, `certificates/${user?.uid}/${cert.name}`);
        
        await uploadBytes(certRef, blob);
        const certUrl = await getDownloadURL(certRef);
        
        certificateUrls.push({
          name: cert.name,
          url: certUrl,
          type: cert.mimeType
        });
        
        updateProgress();
      }));

      const auth = getAuth();
      if (!auth.currentUser) throw new Error('User not authenticated');

      const userRef = doc(firestore, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const isVerified = userSnap.exists() ? userSnap.data().isVerified || false : false;

      await addDoc(collection(firestore, 'posts'), {
        timestamp: serverTimestamp(),
        caption: caption.trim(),
        imageList: mediaUrls,
        videoUrl,
        beforeAfterImages: beforeAfterUrls,
        documentUrls,
        certificates: certificateUrls,
        username: user?.name || 'Anonymous',
        uid: user?.uid,
        userImage: user?.profileImage || null,
        categories,
        isVerified,
        projectTimeline: projectTimeline.trim(),
        projectCost: projectCost.trim(),
        location: useCurrentLocation && location ? location : null,
        likes: 0,
        likedBy: []
      });

      Alert.alert('Success', 'Your project has been posted successfully!');
      resetForm();
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Error', error.message === 'User not authenticated' 
        ? 'Authentication error. Please log in again.'
        : 'Failed to upload post. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setCaption('');
    setMedia([]);
    setBeforeImage(null);
    setAfterImage(null);
    setDocuments([]);
    setCertificates([]);
    setCategories([]);
    setSuggestedTags([]);
    setProjectTimeline('');
    setProjectCost('');
    setBeforeAfterMode(false);
    setLocation(null);
    setUseCurrentLocation(false);
  };

  // Render media item
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
        >
          <MaterialIcons name="delete" size={20} color="white" />
        </TouchableOpacity>
        
        {item.type !== 'video' && (
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => openImageEditor(item.uri, index)}
          >
            <MaterialIcons name="edit" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Render documents
  const renderDocument = ({ item, index }) => (
    <View style={styles.documentItemContainer}>
      <MaterialIcons name="description" size={24} color={isDarkMode ? "#aaa" : "#666"} />
      <Text style={[styles.documentName, isDarkMode ? styles.darkText : styles.lightText]} numberOfLines={1}>
        {item.name}
      </Text>
      <TouchableOpacity
        style={styles.documentButton}
        onPress={() => removeDocument(index)}
      >
        <MaterialIcons name="delete" size={20} color={isDarkMode ? "#fff" : "#666"} />
      </TouchableOpacity>
    </View>
  );

  // Render certificates
  const renderCertificate = ({ item, index }) => (
    <View style={styles.documentItemContainer}>
      <MaterialIcons name="verified" size={24} color={isDarkMode ? "#aaa" : "#666"} />
      <Text style={[styles.documentName, isDarkMode ? styles.darkText : styles.lightText]} numberOfLines={1}>
        {item.name}
      </Text>
      <TouchableOpacity
        style={styles.documentButton}
        onPress={() => removeCertificate(index)}
      >
        <MaterialIcons name="delete" size={20} color={isDarkMode ? "#fff" : "#666"} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.postContainer, isDarkMode ? styles.darkPostContainer : styles.lightPostContainer]}>
        <Text style={[styles.title, isDarkMode ? styles.darkTitle : styles.lightTitle]}>Create Project Post</Text>

        {/* Caption Input */}
        <TextInput
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
          placeholder="Describe your project or update..."
          placeholderTextColor={isDarkMode ? '#ccc' : '#888'}
          multiline
          value={caption}
          onChangeText={setCaption}
        />

        {/* Before & After Mode Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={[styles.toggleLabel, isDarkMode ? styles.darkText : styles.lightText]}>
            Before & After Mode
          </Text>
          <Switch
            value={beforeAfterMode}
            onValueChange={setBeforeAfterMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={beforeAfterMode ? '#1877f2' : '#f4f3f4'}
          />
        </View>

        {/* Before & After Image Selection */}
        {beforeAfterMode && (
          <View style={styles.beforeAfterContainer}>
            <View style={styles.beforeAfterColumn}>
              <Text style={[styles.beforeAfterLabel, isDarkMode ? styles.darkText : styles.lightText]}>Before</Text>
              {beforeImage ? (
                <View style={styles.beforeAfterImageContainer}>
                  <Image source={{ uri: beforeImage }} style={styles.beforeAfterImage} />
                  <TouchableOpacity
                    style={styles.beforeAfterRemoveButton}
                    onPress={() => setBeforeImage(null)}
                  >
                    <MaterialIcons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.beforeAfterPlaceholder, { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }]}
                  onPress={handleBeforeImagePick}
                >
                  <MaterialIcons name="add-photo-alternate" size={30} color={isDarkMode ? '#aaa' : '#666'} />
                  <Text style={[styles.beforeAfterPlaceholderText, isDarkMode ? styles.darkText : styles.lightText]}>
                    Add Before
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.beforeAfterColumn}>
              <Text style={[styles.beforeAfterLabel, isDarkMode ? styles.darkText : styles.lightText]}>After</Text>
              {afterImage ? (
                <View style={styles.beforeAfterImageContainer}>
                  <Image source={{ uri: afterImage }} style={styles.beforeAfterImage} />
                  <TouchableOpacity
                    style={styles.beforeAfterRemoveButton}
                    onPress={() => setAfterImage(null)}
                  >
                    <MaterialIcons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.beforeAfterPlaceholder, { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }]}
                  onPress={handleAfterImagePick}
                >
                  <MaterialIcons name="add-photo-alternate" size={30} color={isDarkMode ? '#aaa' : '#666'} />
                  <Text style={[styles.beforeAfterPlaceholderText, isDarkMode ? styles.darkText : styles.lightText]}>
                    Add After
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Regular Media Display */}
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

        {/* Media Selection Buttons */}
        {!beforeAfterMode && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, media.length >= 10 && styles.disabledButton]}
              onPress={handleCameraCapture}
              disabled={media.length >= 10}
            >
              <Icon name="camera" size={18} color={media.length >= 10 ? '#999' : '#1877f2'} />
              <Text style={[
                styles.actionText,
                isDarkMode ? styles.darkActionText : styles.lightActionText,
                media.length >= 10 && styles.disabledText
              ]}>
                Camera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, media.length >= 10 && styles.disabledButton]}
              onPress={handleGalleryPick}
              disabled={media.length >= 10}
            >
              <Icon name="images" size={18} color={media.length >= 10 ? '#999' : '#1877f2'} />
              <Text style={[
                styles.actionText,
                isDarkMode ? styles.darkActionText : styles.lightActionText,
                media.length >= 10 && styles.disabledText
              ]}>
                Gallery ({media.length}/10)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setDocumentsModalVisible(true)}
            >
              <Icon name="file-alt" size={18} color="#1877f2" />
              <Text style={[styles.actionText, isDarkMode ? styles.darkActionText : styles.lightActionText]}>
                Documents
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Project Details */}
        <View style={styles.detailSection}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
            Project Details
          </Text>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={20} color={isDarkMode ? "#aaa" : "#666"} />
            <TextInput
              style={[styles.detailInput, isDarkMode ? styles.darkDetailInput : styles.lightDetailInput]}
              placeholder="Timeline (e.g., 2 weeks)"
              placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
              value={projectTimeline}
              onChangeText={setProjectTimeline}
            />
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="attach-money" size={20} color={isDarkMode ? "#aaa" : "#666"} />
            <TextInput
              style={[styles.detailInput, isDarkMode ? styles.darkDetailInput : styles.lightDetailInput]}
              placeholder="Estimated cost (e.g., $2000-$3000)"
              placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
              value={projectCost}
              onChangeText={setProjectCost}
              keyboardType="default"
            />
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={20} color={isDarkMode ? "#aaa" : "#666"} />
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={loading}
            >
              <Text style={[styles.locationButtonText, isDarkMode ? styles.darkText : styles.lightText]}>
                {loading ? 'Getting location...' : 'Add current location'}
              </Text>
            </TouchableOpacity>
            <Switch
              value={useCurrentLocation}
              onValueChange={setUseCurrentLocation}
              disabled={!location}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={useCurrentLocation ? '#1877f2' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Categories/Tags */}
        <View style={styles.detailSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
              Categories & Tags
            </Text>
            <TouchableOpacity onPress={() => setCategoryModalVisible(true)}>
              <MaterialIcons name="edit" size={20} color={isDarkMode ? "#aaa" : "#666"} />
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
                  style={[styles.categoryTag, { backgroundColor: isDarkMode ? '#2c3e50' : '#e1f5fe' }]}
                  onPress={() => addCategory(category)}
                >
                  <Text style={[styles.categoryText, isDarkMode ? styles.darkText : styles.lightText]}>
                    {category}
                  </Text>
                  <MaterialIcons name="close" size={16} color={isDarkMode ? "#eee" : "#666"} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.noCategories, isDarkMode ? styles.darkText : styles.lightText]}>
              No categories selected
            </Text>
          )}

          {suggestedTags.length > 0 && (
            <View style={styles.suggestedTagsContainer}>
              <Text style={[styles.suggestedTagsTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                <MaterialCommunityIcons name="robot-outline" size={16} color={isDarkMode ? "#aaa" : "#666"} />
                {' '}AI Suggested Tags:
              </Text>
              <View style={styles.suggestedTagsRow}>
                {suggestedTags.map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestedTag, { backgroundColor: isDarkMode ? '#3d4852' : '#f0f4f8' }]}
                    onPress={() => addCategory(tag)}
                  >
                    <Text style={[styles.suggestedTagText, isDarkMode ? styles.darkText : styles.lightText]}>
                      {tag}
                    </Text>
                    <MaterialIcons name="add" size={16} color={isDarkMode ? "#eee" : "#666"} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Verification and Professional Details */}
        <View style={styles.detailSection}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
            Professional Details
          </Text>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="verified" size={20} color={isDarkMode ? "#aaa" : "#666"} />
            <Text style={[styles.detailLabel, isDarkMode ? styles.darkText : styles.lightText]}>
              Certificate Uploads
            </Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleCertificatePick}
            >
              <Text style={styles.uploadButtonText}>Upload</Text>
            </TouchableOpacity>
          </View>
          
          {certificates.length > 0 && (
            <FlatList
              data={certificates}
              renderItem={renderCertificate}
              keyExtractor={(_, index) => `cert-${index}`}
              style={styles.documentsList}
            />
          )}
        </View>

        {/* Upload buttons for documents */}
        <View style={styles.detailSection}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
            Additional Documents
          </Text>
          <TouchableOpacity 
            style={[styles.fullWidthButton, { backgroundColor: isDarkMode ? '#3d4852' : '#f0f4f8' }]}
            onPress={handleDocumentPick}
          >
            <MaterialIcons name="upload-file" size={20} color={isDarkMode ? "#eee" : "#666"} />
            <Text style={[styles.fullWidthButtonText, isDarkMode ? styles.darkText : styles.lightText]}>
              Upload Documents (blueprints, designs, etc.)
            </Text>
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

        {/* Social Features */}
        <View style={styles.detailSection}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
            Interaction Settings
          </Text>
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, isDarkMode ? styles.darkText : styles.lightText]}>
              Allow Comments
            </Text>
            <Switch
              value={true}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={'#1877f2'}
            />
          </View>
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, isDarkMode ? styles.darkText : styles.lightText]}>
              Allow Direct Hiring
            </Text>
            <Switch
              value={true}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={'#1877f2'}
            />
          </View>
          
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, isDarkMode ? styles.darkText : styles.lightText]}>
              Add to Portfolio
            </Text>
            <Switch
              value={true}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={'#1877f2'}
            />
          </View>
        </View>

        {/* Upload & Cancel Buttons */}
        <View style={styles.uploadButtonsContainer}>
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#1877f2" />
              <Text style={[styles.uploadingText, isDarkMode ? styles.darkText : styles.lightText]}>
                Uploading... {uploadProgress}%
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetForm}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadSubmitButton}
                onPress={handleUpload}
              >
                <Text style={styles.uploadSubmitButtonText}>Post Now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Image Editor Modal */}
        <Modal
          visible={isEditModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
              <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Edit Image</Text>
              
              {currentEditingImage && (
                <Image source={{ uri: currentEditingImage }} style={styles.editorPreview} />
              )}
              
              <View style={styles.editorControl}>
                <Text style={[styles.editorLabel, isDarkMode ? styles.darkText : styles.lightText]}>Brightness</Text>
                <View style={styles.sliderContainer}>
                  <MaterialIcons name="brightness-low" size={20} color={isDarkMode ? "#aaa" : "#666"} />
                  <View style={styles.slider}>
                    <TextInput
                      style={[styles.sliderInput, isDarkMode ? styles.darkDetailInput : styles.lightDetailInput]}
                      placeholder="0"
                      placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
                      value={brightness.toString()}
                      onChangeText={(value) => setBrightness(parseInt(value) || 0)}
                      keyboardType="number-pad"
                    />
                  </View>
                  <MaterialIcons name="brightness-high" size={20} color={isDarkMode ? "#aaa" : "#666"} />
                </View>
              </View>
              
              <View style={styles.editorControl}>
                <Text style={[styles.editorLabel, isDarkMode ? styles.darkText : styles.lightText]}>Rotation</Text>
                <View style={styles.sliderContainer}>
                  <MaterialIcons name="rotate-left" size={20} color={isDarkMode ? "#aaa" : "#666"} />
                  <View style={styles.slider}>
                    <TextInput
                      style={[styles.sliderInput, isDarkMode ? styles.darkDetailInput : styles.lightDetailInput]}
                      placeholder="0"
                      placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
                      value={rotation.toString()}
                      onChangeText={(value) => setRotation(parseInt(value) || 0)}
                      keyboardType="number-pad"
                    />
                  </View>
                  <MaterialIcons name="rotate-right" size={20} color={isDarkMode ? "#aaa" : "#666"} />
                </View>
              </View>
              
              <View style={styles.editorControl}>
                <Text style={[styles.editorLabel, isDarkMode ? styles.darkText : styles.lightText]}>Watermark</Text>
                <TextInput
                  style={[styles.watermarkInput, isDarkMode ? styles.darkDetailInput : styles.lightDetailInput]}
                  placeholder="Add watermark text"
                  placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
                  value={watermarkText}
                  onChangeText={setWatermarkText}
                />
              </View>
              
              <View style={styles.editorButtons}>
                <TouchableOpacity
                  style={styles.editorCancelButton}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <Text style={styles.editorCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editorApplyButton}
                  onPress={applyImageEdits}
                  disabled={loading}
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
            <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
              <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Documents</Text>
              
              {documents.length > 0 ? (
                <FlatList
                  data={documents}
                  renderItem={renderDocument}
                  keyExtractor={(_, index) => `doc-modal-${index}`}
                  style={styles.documentsList}
                />
              ) : (
                <Text style={[styles.noDocuments, isDarkMode ? styles.darkText : styles.lightText]}>
                  No documents added yet
                </Text>
              )}
              
              <TouchableOpacity
                style={styles.addDocumentButton}
                onPress={handleDocumentPick}
              >
                <Text style={styles.addDocumentButtonText}>Add Document</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setDocumentsModalVisible(false)}
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
            <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
              <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Categories</Text>
              
              <View style={styles.customCategoryContainer}>
                <TextInput
                  style={[styles.customCategoryInput, isDarkMode ? styles.darkDetailInput : styles.lightDetailInput]}
                  placeholder="Enter custom category"
                  placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
                <TouchableOpacity
                  style={styles.addCustomCategoryButton}
                  onPress={addCustomCategory}
                >
                  <Text style={styles.addCustomCategoryButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.commonCategoriesTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                Common Categories
              </Text>
              <View style={styles.commonCategoriesContainer}>
                {commonCategories.map((category, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.commonCategory,
                      categories.includes(category) ? styles.selectedCategory : null,
                      { backgroundColor: isDarkMode ? '#2c3e50' : '#e1f5fe' }
                    ]}
                    onPress={() => addCategory(category)}
                  >
                    <Text 
                      style={[
                        styles.commonCategoryText, 
                        categories.includes(category) ? styles.selectedCategoryText : null,
                        isDarkMode ? styles.darkText : styles.lightText
                      ]}
                    >
                      {category}
                    </Text>
                    {categories.includes(category) && (
                      <MaterialIcons name="check" size={16} color="#1877f2" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setCategoryModalVisible(false)}
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
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  lightContainer: {
    backgroundColor: '#f5f5f5',
  },
  postContainer: {
    padding: 16,
    borderRadius: 10,
    margin: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkPostContainer: {
    backgroundColor: '#1e1e1e',
    shadowColor: '#000',
  },
  lightPostContainer: {
    backgroundColor: '#ffffff',
    shadowColor: '#ddd',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  darkTitle: {
    color: '#ffffff',
  },
  lightTitle: {
    color: '#333333',
  },
  darkText: {
    color: '#ffffff',
  },
  lightText: {
    color: '#333333',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    fontSize: 16,
  },
  darkInput: {
    backgroundColor: '#333',
    borderColor: '#555',
    color: '#fff',
  },
  lightInput: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    color: '#333',
  },
  detailInput: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 14,
    marginLeft: 10,
  },
  darkDetailInput: {
    backgroundColor: '#333',
    borderColor: '#555',
    color: '#fff',
  },
  lightDetailInput: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    color: '#333',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  beforeAfterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  beforeAfterColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  beforeAfterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  beforeAfterImageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    height: 150,
  },
  beforeAfterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  beforeAfterRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beforeAfterPlaceholder: {
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  beforeAfterPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
  },
  mediaList: {
    marginBottom: 16,
  },
  mediaItemContainer: {
    position: 'relative',
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  mediaButtonsContainer: {
    position: 'absolute',
    top: 5,
    right: 5,
    flexDirection: 'column',
  },
  mediaButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
  },
  darkActionText: {
    color: '#ddd',
  },
  lightActionText: {
    color: '#333',
  },
  disabledText: {
    color: '#999',
  },
  detailSection: {
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    marginLeft: 10,
    fontSize: 16,
    flex: 1,
  },
  locationButton: {
    flex: 1,
    padding: 8,
    marginLeft: 10,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#1877f2',
  },
  categoryScrollView: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    marginRight: 5,
    fontSize: 14,
  },
  noCategories: {
    fontStyle: 'italic',
    fontSize: 14,
    marginBottom: 10,
  },
  suggestedTagsContainer: {
    marginTop: 8,
  },
  suggestedTagsTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  suggestedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  suggestedTagText: {
    marginRight: 5,
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: '#1877f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  fullWidthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  fullWidthButtonText: {
    marginLeft: 8,
    fontSize: 14,
  },
  documentsList: {
    marginTop: 8,
    marginBottom: 8,
  },
  documentItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(200, 200, 200, 0.1)',
  },
  documentName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  documentButton: {
    padding: 5,
  },
  noDocuments: {
    fontStyle: 'italic',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  uploadingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadSubmitButton: {
    flex: 2,
    backgroundColor: '#1877f2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  uploadSubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: '90%',
  },
  darkModalContent: {
    backgroundColor: '#1e1e1e',
  },
  lightModalContent: {
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  editorPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  editorControl: {
    marginBottom: 15,
  },
  editorLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  sliderInput: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 14,
    textAlign: 'center',
  },
  watermarkInput: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 14,
  },
  editorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editorCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 8,
  },
  editorCancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  editorApplyButton: {
    flex: 1,
    backgroundColor: '#1877f2',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginLeft: 8,
  },
  editorApplyButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  addDocumentButton: {
    backgroundColor: '#1877f2',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 15,
  },
  addDocumentButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  closeModalButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#666',
    fontSize: 16,
  },
  customCategoryContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  customCategoryInput: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 14,
    marginRight: 10,
  },
  addCustomCategoryButton: {
    backgroundColor: '#1877f2',
    paddingHorizontal: 15,
    justifyContent: 'center',
    borderRadius: 6,
  },
  addCustomCategoryButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  commonCategoriesTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  commonCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  commonCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedCategory: {
    borderWidth: 1,
    borderColor: '#1877f2',
  },
  commonCategoryText: {
    marginRight: 5,
    fontSize: 14,
  },
  selectedCategoryText: {
    fontWeight: '500',
  }
});

export default ImageUpload;