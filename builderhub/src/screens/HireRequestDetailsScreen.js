import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { firestore, auth } from '../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system';
import Modal from 'react-native-modal';
import { LinearGradient } from 'expo-linear-gradient';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';

function HireRequestDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { requestId } = route.params || {};
  const currentUser = auth.currentUser;
  const [request, setRequest] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!requestId) {
        Toast.show({ type: 'error', text1: 'Invalid hire request ID' });
        setLoading(false);
        return;
      }

      try {
        const requestRef = doc(firestore, 'hireRequests', requestId);
        const requestSnap = await getDoc(requestRef);
        if (requestSnap.exists()) {
          const requestData = requestSnap.data();
          setRequest(requestData);

          const clientRef = doc(firestore, 'users', requestData.clientId);
          const clientSnap = await getDoc(clientRef);
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        } else {
          Toast.show({ type: 'error', text1: 'Hire request not found' });
        }
      } catch (error) {
        console.error('Error fetching hire request:', error);
        Toast.show({ type: 'error', text1: 'Failed to load hire request' });
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId]);

  const downloadPDF = async (file) => {
    try {
      const timestamp = Date.now();
      const fileName = file.name.replace(/\.pdf$/, `_${timestamp}.pdf`);
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(file.url, fileUri);
      if (downloadResult.status === 200) {
        Toast.show({
          type: 'success',
          text1: 'PDF Downloaded',
          text2: `Saved to device storage: ${fileName}`,
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Toast.show({ type: 'error', text1: 'Failed to download PDF' });
    }
  };

  const updateStatus = async (newStatus) => {
    if (!currentUser || currentUser.uid !== request.hiredUserId) {
      Toast.show({ type: 'error', text1: 'Only the hired user can update the status' });
      return;
    }

    try {
      const requestRef = doc(firestore, 'hireRequests', requestId);
      await updateDoc(requestRef, { status: newStatus });
      setRequest((prev) => ({ ...prev, status: newStatus }));

      const hiredUserName = currentUser.displayName || 'The hired user';
      const message = `${hiredUserName} ${newStatus} your hire request for "${request.projectTitle}"`;
      await addDoc(collection(firestore, 'users', request.clientId, 'notifications'), {
        actorId: currentUser.uid,
        type: 'hire_request_status',
        message,
        requestId,
        read: false,
        timestamp: serverTimestamp(),
      });

      Toast.show({
        type: 'success',
        text1: `Request ${newStatus}`,
        text2: `The client has been notified.`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      Toast.show({ type: 'error', text1: `Failed to ${newStatus} request` });
    }
  };

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageScale(1);
    setLastScale(1);
    setIsModalVisible(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setIsModalVisible(false);
  };

  const handleMessage = () => {
    if (!currentUser) {
      Toast.show({ type: 'error', text1: 'Please log in to send a message' });
      return;
    }

    const recipientId = currentUser.uid === request.clientId ? request.hiredUserId : request.clientId;
    const recipientName = currentUser.uid === request.clientId ? 'Hired User' : client?.name;

    if (!recipientId) {
      Toast.show({ type: 'error', text1: 'Recipient not found' });
      return;
    }

    navigation.navigate('WorkerChatScreen', { userId: recipientId, userName: recipientName || 'User' });
  };

  const handleUserPress = (userId, userName) => {
    console.log('Navigate to UserProfileScreen:', { userId, userName });
    // navigation.navigate('UserProfileScreen', { userId }); // Uncomment when implemented
  };

  const onPinchGestureEvent = (event) => {
    const scale = event.nativeEvent.scale * lastScale;
    setImageScale(Math.min(Math.max(scale, 1), 3));
  };

  const onPinchStateChange = (event) => {
    if (event.nativeEvent.state === State.END) {
      setLastScale(imageScale);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const renderFileItem = ({ item }) => (
    <TouchableOpacity
      style={styles.fileItem}
      onPress={() => {
        if (item.type.startsWith('image')) {
          openImageModal(item.url);
        } else if (item.type === 'application/pdf') {
          downloadPDF(item);
        }
      }}
    >
      <View style={styles.filePreviewContainer}>
        {item.type.startsWith('image') ? (
          <Image
            source={{ uri: item.url }}
            style={styles.filePreview}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name="document-outline"
            size={40}
            color="#666"
            style={styles.filePreview}
          />
        )}
        <View style={[
          styles.fileTypeBadge,
          item.type.startsWith('image') ? styles.imageBadge : styles.pdfBadge,
        ]}>
          <Text style={styles.fileTypeText}>
            {item.type.startsWith('image') ? 'Image' : 'PDF'}
          </Text>
        </View>
      </View>
      <Text style={styles.fileName} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#F4B018" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color="#666" />
          <Text style={styles.emptyStateText}>Hire request not found</Text>
          <TouchableOpacity
            style={styles.backButtonEmpty}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const recipientName = currentUser.uid === request.clientId ? 'Hired User' : client?.name;
  const isHiredUser = currentUser?.uid === request.hiredUserId;
  const canUpdateStatus = isHiredUser && request.status === 'pending';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hire Request</Text>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          {/* Client */}
          <Text style={styles.label}>Client</Text>
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => handleUserPress(request.clientId, client?.name)}
          >
            <Image
              source={{ uri: client?.profileImage || 'https://via.placeholder.com/32' }}
              style={styles.userAvatar}
            />
            <Text style={styles.value}>{client?.name || 'Unknown'}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />

          {/* Created Date */}
          <Text style={styles.label}>Created</Text>
          <Text style={styles.value}>{formatTimestamp(request.createdAt)}</Text>
          <View style={styles.divider} />

          {/* Project Title */}
          <Text style={styles.label}>Project Title</Text>
          <Text style={styles.value}>{request.projectTitle || 'Untitled'}</Text>
          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>
            {request.projectDescription || 'No description provided'}
          </Text>
          <View style={styles.divider} />

          {/* Status */}
          <Text style={styles.label}>Status</Text>
          <View
            style={[
              styles.statusBadge,
              request.status === 'accepted' && styles.statusAccepted,
              request.status === 'rejected' && styles.statusRejected,
              request.status === 'pending' && styles.statusPending,
            ]}
          >
            <Text style={styles.statusText}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Text>
          </View>
          <View style={styles.divider} />

          {/* Files */}
          <Text style={styles.label}>Files</Text>
          {request.files?.length > 0 ? (
            <FlatList
              data={request.files}
              renderItem={renderFileItem}
              keyExtractor={(item, index) => `${index}`}
              style={styles.filesList}
            />
          ) : (
            <View style={styles.noFiles}>
              <Ionicons name="document-outline" size={24} color="#666" />
              <Text style={styles.noFilesText}>No files attached</Text>
            </View>
          )}
        </View>

        {/* Buttons */}
        {canUpdateStatus && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => updateStatus('accepted')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#28a745', '#34c759']}
                style={styles.gradientButton}
              >
                <Text style={styles.actionButtonText}>Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => updateStatus('rejected')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ff3b30', '#ff6b6b']}
                style={styles.gradientButton}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.messageButton}
          onPress={handleMessage}
          disabled={!recipientName}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#0288D1', '#03A9F4']}
            style={styles.gradientButton}
          >
            <Text style={styles.messageButtonText}>
              {recipientName ? `Message ${recipientName}` : 'Message User'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        isVisible={isModalVisible}
        onBackdropPress={closeImageModal}
        style={styles.modal}
        animationIn="zoomIn"
        animationOut="zoomOut"
      >
        <View style={styles.modalContent}>
          {selectedImage && (
            <PinchGestureHandler
              onGestureEvent={onPinchGestureEvent}
              onHandlerStateChange={onPinchStateChange}
            >
              <Image
                source={{ uri: selectedImage }}
                style={[
                  styles.fullImage,
                  { transform: [{ scale: imageScale }] },
                ]}
                resizeMode="contain"
              />
            </PinchGestureHandler>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={closeImageModal}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#F4B018',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusAccepted: {
    backgroundColor: '#e6f4ea',
    borderColor: '#28a745',
    borderWidth: 1,
  },
  statusRejected: {
    backgroundColor: '#ffe6e6',
    borderColor: '#ff3b30',
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: '#fff3e0',
    borderColor: '#F4B018',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  filesList: {
    marginTop: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  filePreviewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  filePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileTypeBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  imageBadge: {
    backgroundColor: '#0288D1',
  },
  pdfBadge: {
    backgroundColor: '#ff3b30',
  },
  fileTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  fileName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  noFiles: {
    alignItems: 'center',
    padding: 16,
  },
  noFilesText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  backButtonEmpty: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F4B018',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#000',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullImage: {
    width: width * 0.9,
    height: width * 0.9,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 8,
  },
});

export default HireRequestDetailsScreen;