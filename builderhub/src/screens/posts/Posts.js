import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, ScrollView, Dimensions,
  TouchableOpacity, ActivityIndicator, Share, Alert,
  Modal, FlatList, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../../../firebase/firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Video } from 'expo-av';
import styles from '../../styles/PostStyles'; // Adjust the import path as necessary

const { width } = Dimensions.get('window');

// Helper function to format relative time
const getRelativeTime = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return 'Unknown time';

  const date = new Date(timestamp.seconds * 1000);
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    // Fallback to absolute date for older posts
    return date.toLocaleDateString();
  }
};

function Post({
  postId,
  username,
  caption,
  imageList = [],
  videoUrl,
  userImage,
  uploadDate,
  likes = 0,
  likedBy = [],
  ownerId,
  categories = [],
  isVerified = false,
  beforeAfterImages = null,
  projectTimeline = null,
  projectCost = null,
  documentUrls = [],
  certificates = [],
  allowComments = true,
  allowDirectHiring = true,
}) {
  // Suppress console logs within this component (consider removing for debugging)
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

  const auth = getAuth();
  const user = auth.currentUser;
  const userId = user?.uid;
  const navigation = useNavigation();
  const videoRef = useRef(null);

  // State variables
  const [isLiked, setIsLiked] = useState(likedBy.includes(userId));
  const [likesCount, setLikesCount] = useState(likes);
  const [commentsCount, setCommentsCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [pinnedComment, setPinnedComment] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [beforeAfterPosition] = useState(new Animated.Value(0));
  const [isDocumentsModalVisible, setIsDocumentsModalVisible] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [imageErrors, setImageErrors] = useState({ before: false, after: false });
  const [imageDimensions, setImageDimensions] = useState({});
  const [beforeAfterDimensions, setBeforeAfterDimensions] = useState({
    before: { width: 1, height: 1 },
    after: { width: 1, height: 1 },
  });
  // New state for relative time
  const [relativeTime, setRelativeTime] = useState(getRelativeTime(uploadDate));

  // Update relative time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(uploadDate));
    }, 1000); // Update every second for smooth "just now" transitions

    return () => clearInterval(interval); // Cleanup on unmount
  }, [uploadDate]);

  // Listen for real-time updates to post data
  useEffect(() => {
    if (!postId) return;

    const postRef = doc(firestore, 'posts', postId);
    const unsubscribe = onSnapshot(postRef, (doc) => {
      if (doc.exists()) {
        const postData = doc.data();
        setLikesCount(postData.likes || 0);
        setIsLiked((postData.likedBy || []).includes(userId));
      }
    }, (error) => {
      console.error('Error getting post updates:', error);
    });

    return () => unsubscribe();
  }, [postId, userId]);

  // Fetch comments and handle cleanup
  useEffect(() => {
    if (!postId) {
      Alert.alert('Error', 'No post ID provided!');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'No authenticated user!');
      return;
    }

    const unsubscribeComments = fetchComments();

    return () => {
      unsubscribeComments();
    };
  }, [postId, userId]);

  // Fetch image dimensions for imageList
  useEffect(() => {
    if (imageList?.length > 0) {
      imageList.forEach((uri, index) => {
        Image.getSize(
          uri,
          (width, height) => {
            setImageDimensions((prev) => ({
              ...prev,
              [index]: { width, height },
            }));
          },
          (error) => {
            console.error(`Failed to get size for image ${uri}:`, error);
            setImageDimensions((prev) => ({
              ...prev,
              [index]: { width: 1, height: 1 },
            }));
          }
        );
      });
    }
  }, [imageList]);

  // Fetch dimensions for before/after images
  useEffect(() => {
    if (beforeAfterImages?.before && beforeAfterImages?.after) {
      Image.getSize(
        beforeAfterImages.before,
        (width, height) => {
          setBeforeAfterDimensions((prev) => ({
            ...prev,
            before: { width, height },
          }));
        },
        (error) => {
          console.error(`Failed to get size for before image:`, error);
        }
      );
      Image.getSize(
        beforeAfterImages.after,
        (width, height) => {
          setBeforeAfterDimensions((prev) => ({
            ...prev,
            after: { width, height },
          }));
        },
        (error) => {
          console.error(`Failed to get size for after image:`, error);
        }
      );
    }
  }, [beforeAfterImages]);

  const fetchComments = () => {
    try {
      const commentsRef = collection(firestore, 'posts', postId, 'comments');
      const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
        const commentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const pinned = commentsData.find((comment) => comment.isCubePinned);
        setPinnedComment(pinned || null);
        setComments(commentsData);
        setCommentsCount(commentsData.length);
      }, (error) => {
        console.error('Error fetching comments:', error);
        Alert.alert('Error', 'Failed to fetch comments');
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up comments listener:', error);
      return () => {};
    }
  };

  const handleLike = async () => {
    if (!userId) return;
    const postRef = doc(firestore, 'posts', postId);
    
    try {
      const newLikesCount = isLiked ? likesCount - 1 : likesCount + 1;
      setLikesCount(newLikesCount);
      setIsLiked(!isLiked);
      
      if (isLiked) {
        await updateDoc(postRef, {
          likes: newLikesCount,
          likedBy: arrayRemove(userId),
        });
      } else {
        await updateDoc(postRef, {
          likes: newLikesCount,
          likedBy: arrayUnion(userId),
        });
        
        if (ownerId !== userId) {
          const notificationsRef = collection(firestore, 'users', ownerId, 'notifications');
          await addDoc(notificationsRef, {
            type: 'like',
            postId,
            actorId: userId,
            timestamp: new Date(),
            read: false,
          });
        }
      }
    } catch (error) {
      setLikesCount(isLiked ? likesCount : likesCount - 1);
      setIsLiked(isLiked);
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleSharePost = async () => {
    try {
      await Share.share({
        message: `Check out this amazing work by ${username}: ${caption}`,
      });
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post');
    }
  };

  const handleHireNow = () => {
    navigation.navigate('HireUserScreen', { userId: ownerId });
  };

  const navigateToUserProfile = () => {
    if (ownerId) {
      navigation.navigate('UploaderProfile', { userId: ownerId });
    }
  };

  const animateBeforeAfter = (toValue) => {
    Animated.timing(beforeAfterPosition, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const renderMediaContent = () => {
    if (beforeAfterImages && beforeAfterImages.before && beforeAfterImages.after) {
      return (
        <View style={styles.beforeAfterContainer}>
          <View style={styles.beforeAfterHeader}>
            <Text style={styles.beforeAfterLabel}>Before</Text>
            <Text style={styles.beforeAfterLabel}>After</Text>
          </View>
          <View style={styles.beforeAfterContent}>
            <View style={styles.beforeAfterImageWrapper}>
              <Image 
                source={{uri: beforeAfterImages.before}} 
                style={styles.beforeAfterImage}
                accessibilityLabel="Before image"
                onError={() => setImageErrors((prev) => ({ ...prev, before: true }))}
              />
              {imageErrors.before && (
                <Text style={styles.errorText}>Failed to load image</Text>
              )}
            </View>
            <View style={styles.beforeAfterImageWrapper}>
              <Image 
                source={{uri: beforeAfterImages.after}} 
                style={styles.beforeAfterImage}
                accessibilityLabel="After image"
                onError={() => setImageErrors((prev) => ({ ...prev, after: true }))}
              />
              {imageErrors.after && (
                <Text style={styles.errorText}>Failed to load image</Text>
              )}
            </View>
          </View>
        </View>
      );
    }

    return (
      <>
        {videoUrl && (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              useNativeControls
              resizeMode="contain"
              style={styles.video}
              onError={(e) => console.error('Video error:', e)}
              accessibilityLabel="Video content of the project"
            />
          </View>
        )}

        {imageList?.length > 0 && (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageContainer}
              onMomentumScrollEnd={(event) => {
                const slideIndex = Math.floor(
                  event.nativeEvent.contentOffset.x / (width * 0.8)
                );
                setCurrentImageIndex(slideIndex);
              }}
            >
              {imageList.map((img, index) => {
                const aspectRatio = imageDimensions[index]?.height / imageDimensions[index]?.width || 1;
                const imageHeight = Math.min((width * 0.8) * aspectRatio, 400);
                return (
                  <Image
                    key={index}
                    source={{ uri: img }}
                    style={[styles.postImage, { width: width * 0.8, height: imageHeight }]}
                    onError={(e) => console.error('Image error:', e.nativeEvent.error)}
                    accessibilityLabel={`Image ${index + 1} of the project`}
                  />
                );
              })}
            </ScrollView>

            {imageList.length > 1 && (
              <View style={styles.paginationContainer}>
                {imageList.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      currentImageIndex === index ? styles.paginationDotActive : null,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </>
    );
  };

  const renderDocumentsModal = () => (
    <Modal
      visible={isDocumentsModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setIsDocumentsModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Project Documents</Text>
          <FlatList
            data={[...(Array.isArray(documentUrls) ? documentUrls : []), ...(Array.isArray(certificates) ? certificates : [])]}
            keyExtractor={(item, index) => `doc-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.documentItem}
                onPress={() => {
                  if (item.url) {
                    navigation.navigate('DocumentViewer', { url: item.url });
                    setIsDocumentsModalVisible(false);
                  } else {
                    Alert.alert('Error', 'Invalid document URL');
                  }
                }}
                accessibilityLabel={`View document: ${item.name || 'Document'}`}
                accessibilityRole="button"
              >
                <MaterialIcons name="description" size={24} color={styles.documentName.color} />
                <Text style={styles.documentName}>
                  {item.name || 'Document'}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.documentName}>No documents available</Text>}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsDocumentsModalVisible(false)}
            accessibilityLabel="Close documents modal"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.postContainer}>
      {/* User info section */}
      <TouchableOpacity style={styles.userInfo} onPress={navigateToUserProfile} accessibilityLabel={`View ${username}'s profile`} accessibilityRole="button">
        <Image
          source={{ uri: userImage || 'https://via.placeholder.com/40' }}
          style={styles.userImage}
        />
        <View style={styles.userInfoText}>
          <View style={styles.usernameContainer}>
            <Text style={styles.username}>
              {username}
            </Text>
            {isVerified && (
              <MaterialIcons name="verified" size={16} color={styles.verifiedIcon.color} style={styles.verifiedIcon} />
            )}
          </View>
          <Text style={styles.uploadDate}>
            {relativeTime}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Categories/Hashtags */}
      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {categories.map((category, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.categoryTag}
              onPress={() => navigation.navigate('CategorySearch', { category })}
              accessibilityLabel={`Search for ${category} category`}
              accessibilityRole="button"
            >
              <Text style={styles.categoryText}>#{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Caption */}
      {caption ? (
        <TouchableOpacity onPress={() => setShowFullCaption(!showFullCaption)} accessibilityLabel={showFullCaption ? "Collapse caption" : "Expand caption"} accessibilityRole="button">
          <Text style={[
            styles.caption,
            !showFullCaption && styles.captionTruncated,
          ]}>
            {caption}
          </Text>
          {caption.length > 100 && !showFullCaption && (
            <Text style={styles.readMore}>Read more</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {/* Project timeline and cost */}
      {(projectTimeline || projectCost) && (
        <View style={styles.projectInfoContainer}>
          {projectTimeline && (
            <View style={styles.projectInfoItem}>
              <MaterialIcons name="schedule" size={16} color={styles.uploadDate.color} />
              <Text style={styles.projectInfoText}>
                Timeline: {projectTimeline}
              </Text>
            </View>
          )}
          {projectCost && (
            <View style={styles.projectInfoItem}>
              <MaterialIcons name="attach-money" size={16} color={styles.uploadDate.color} />
              <Text style={styles.projectInfoText}>
                Est. Cost: {projectCost}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Media content */}
      {renderMediaContent()}

      {/* Documents button */}
      {(documentUrls.length > 0 || certificates.length > 0) && (
        <TouchableOpacity
          style={styles.documentsButton}
          onPress={() => setIsDocumentsModalVisible(true)}
          accessibilityLabel={`View ${documentUrls.length + certificates.length} documents`}
          accessibilityRole="button"
        >
          <MaterialIcons name="attach-file" size={18} color="#fff" />
          <Text style={styles.documentsButtonText}>
            View Documents ({documentUrls.length + certificates.length})
          </Text>
        </TouchableOpacity>
      )}

      {/* Stats row */}
      <Text style={styles.statsText}>{likesCount} likes • {commentsCount} comments</Text>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLike}
          accessible={true}
          accessibilityLabel={isLiked ? "Unlike post" : "Like post"}
          accessibilityRole="button"
        >
          <FontAwesome
            name={isLiked ? "heart" : "heart-o"}
            size={22}
            style={isLiked ? styles.likedIcon : styles.unlikedIcon}
          />
          <Text style={[styles.actionText, isLiked ? styles.likedText : null]}>Like</Text>
        </TouchableOpacity>

        {allowComments && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CommentScreen', { postId })}
            accessibilityLabel="View and add comments"
            accessibilityRole="button"
          >
            <FontAwesome name="comment-o" size={22} style={styles.unlikedIcon} />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
        )}

        {allowDirectHiring && userId !== ownerId && (
          <TouchableOpacity style={styles.actionButton} onPress={handleHireNow} accessibilityLabel="Hire this user" accessibilityRole="button">
            <MaterialIcons name="work" size={22} style={styles.unlikedIcon} />
            <Text style={styles.actionText}>Hire</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionButton} onPress={handleSharePost} accessibilityLabel="Share this post" accessibilityRole="button">
          <FontAwesome name="share" size={22} style={styles.unlikedIcon} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Pinned comment */}
      {pinnedComment && pinnedComment.username && pinnedComment.text && allowComments && (
        <View style={styles.pinnedCommentContainer}>
          <View style={styles.pinnedCommentHeader}>
            <MaterialIcons name="push-pin" size={16} color={styles.pinnedCommentLabel.color} />
            <Text style={styles.pinnedCommentLabel}>Pinned Comment</Text>
          </View>
          <Text style={styles.pinnedCommentText}>
            <Text style={styles.pinnedCommentUser}>{pinnedComment.username}: </Text>
            {pinnedComment.text}
          </Text>
        </View>
      )}

      {/* Document modal */}
      {renderDocumentsModal()}
    </View>
  );
}

export default Post;