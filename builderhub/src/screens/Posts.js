import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, ScrollView, Dimensions,
  TouchableOpacity, ActivityIndicator, Share, Alert,
  Modal, FlatList, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Video } from 'expo-av';
import styles from '../styles/PostStyles'; // Adjust the import path as necessary

const { width } = Dimensions.get('window');

function Post({ 
  postId, 
  username, 
  caption, 
  imageList = [], 
  videoUrl, 
  userImage, 
  uploadDate, 
  initialLikes = 0, 
  ownerId,
  categories = [],
  isVerified = false,
  beforeAfterImages = null,
  projectTimeline = null,
  projectCost = null,
  documentUrls = [],
  certificates = [],
}) {
  const auth = getAuth();
  const user = auth.currentUser;
  const userId = user?.uid;
  const navigation = useNavigation();
  const videoRef = useRef(null);

  // State variables
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [pinnedComment, setPinnedComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [beforeAfterPosition] = useState(new Animated.Value(0));
  const [isDocumentsModalVisible, setIsDocumentsModalVisible] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [imageErrors, setImageErrors] = useState({ before: false, after: false });

  useEffect(() => {
    if (!postId) {
      console.error("No postId provided!");
      setLoading(false);
      return;
    }

    if (!userId) {
      console.log("No authenticated user for Post component!");
      setLoading(false);
      return;
    }

    console.log("Setting up listener for post:", postId);
    const postRef = doc(firestore, 'posts', postId);

    const unsubscribe = onSnapshot(postRef, async (snapshot) => {
      try {
        if (snapshot.exists()) {
          const postData = snapshot.data();
          console.log("Post data received:", JSON.stringify(postData, null, 2));
          setLikes(postData.likes || 0);
          setIsLiked(postData.likedBy?.includes(userId) || false);
          
          if (postData.beforeAfterImages) {
            console.log("Before/After images data:", postData.beforeAfterImages);
          } else {
            console.log("No beforeAfterImages found in post data");
          }
          
          setLoading(false);
        } else {
          console.log("Post document does not exist:", postId);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error processing snapshot:', error);
        setLoading(false);
      }
    }, (error) => {
      console.error('Error in Post snapshot listener:', error);
      setLoading(false);
    });

    const unsubscribeComments = fetchComments();

    return () => {
      console.log("Unsubscribing from post:", postId);
      unsubscribe();
      unsubscribeComments();
    };
  }, [postId, userId]);

  const fetchComments = () => {
    try {
      const commentsRef = collection(firestore, 'posts', postId, 'comments');
      const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        const pinned = commentsData.find(comment => comment.isCubePinned);
        setPinnedComment(pinned || null);
        setComments(commentsData);
        setCommentsCount(commentsData.length);
      }, (error) => {
        console.error('Error fetching comments:', error);
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
      if (isLiked) {
        await updateDoc(postRef, {
          likes: likes - 1,
          likedBy: arrayRemove(userId),
        });
      } else {
        await updateDoc(postRef, {
          likes: likes + 1,
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
      console.error('Error liking post:', error);
    }
  };

  const handleSharePost = async () => {
    try {
      await Share.share({
        message: `Check out this amazing work by ${username}: ${caption}`,
      });
    } catch (error) {
      console.error('Error sharing post:', error);
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
    console.log("Rendering media content, beforeAfterImages:", beforeAfterImages);

    if (beforeAfterImages && beforeAfterImages.before && beforeAfterImages.after) {
      return (
        <View style={styles.beforeAfterContainer}>
          {/* Debug information */}
          <Text style={styles.debugText}>
            Before: {beforeAfterImages.before.substring(0, 30)}...
            {'\n'}
            After: {beforeAfterImages.after.substring(0, 30)}...
          </Text>

          {showBeforeAfter ? (
            <>
              {!imageErrors.before ? (
                <Image 
                  source={{ uri: beforeAfterImages.before }} 
                  style={styles.beforeAfterImage}
                  onError={() => {
                    console.error('Failed to load before image:', beforeAfterImages.before);
                    setImageErrors(prev => ({ ...prev, before: true }));
                  }}
                  onLoad={() => console.log('Before image loaded successfully')}
                />
              ) : (
                <Text style={styles.errorText}>Failed to load before image</Text>
              )}
              
              <Animated.View style={[
                styles.afterImageContainer,
                { transform: [{ translateX: beforeAfterPosition }] },
              ]}>
                {!imageErrors.after ? (
                  <Image 
                    source={{ uri: beforeAfterImages.after }} 
                    style={styles.beforeAfterImage}
                    onError={() => {
                      console.error('Failed to load after image:', beforeAfterImages.after);
                      setImageErrors(prev => ({ ...prev, after: true }));
                    }}
                    onLoad={() => console.log('After image loaded successfully')}
                  />
                ) : (
                  <Text style={styles.errorText}>Failed to load after image</Text>
                )}
              </Animated.View>
              
              <View style={styles.sliderContainer}>
                <TouchableOpacity 
                  style={styles.sliderButton}
                  onPress={() => animateBeforeAfter(0)}
                >
                  <Text style={styles.sliderText}>Before</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sliderButton}
                  onPress={() => animateBeforeAfter(-width * 0.75)}
                >
                  <Text style={styles.sliderText}>After</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.beforeAfterGallery}>
              {!imageErrors.before ? (
                <Image 
                  source={{ uri: beforeAfterImages.before }} 
                  style={styles.beforeAfterGalleryImage}
                  onError={() => setImageErrors(prev => ({ ...prev, before: true }))}
                />
              ) : (
                <Text style={styles.errorText}>Before Image Error</Text>
              )}
              {!imageErrors.after ? (
                <Image 
                  source={{ uri: beforeAfterImages.after }} 
                  style={styles.beforeAfterGalleryImage}
                  onError={() => setImageErrors(prev => ({ ...prev, after: true }))}
                />
              ) : (
                <Text style={styles.errorText}>After Image Error</Text>
              )}
            </View>
          )}
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
              {imageList.map((img, index) => (
                <Image 
                  key={index} 
                  source={{ uri: img }} 
                  style={[styles.postImage, { width: width * 0.8 }]} 
                  onError={(e) => console.error('Image error:', e.nativeEvent.error)}
                />
              ))}
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
                    console.error('Invalid document URL:', item);
                    Alert.alert('Error', 'Invalid document URL');
                  }
                }}
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
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return <ActivityIndicator size="large" color={styles.closeButton.backgroundColor} style={styles.loader} />;
  }

  return (
    <View style={styles.postContainer}>
      {/* User info section */}
      <TouchableOpacity style={styles.userInfo} onPress={navigateToUserProfile}>
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
            {uploadDate?.seconds ? new Date(uploadDate.seconds * 1000).toLocaleDateString() : "Unknown date"}
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
            >
              <Text style={styles.categoryText}>#{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Caption */}
      {caption ? (
        <TouchableOpacity onPress={() => setShowFullCaption(!showFullCaption)}>
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
      
      {/* Before/After toggle button */}
      {beforeAfterImages && (
        <TouchableOpacity 
          style={styles.beforeAfterButton}
          onPress={() => setShowBeforeAfter(!showBeforeAfter)}
        >
          <MaterialCommunityIcons 
            name="compare" 
            size={18} 
            color="#fff" 
          />
          <Text style={styles.beforeAfterButtonText}>
            {showBeforeAfter ? "Show Gallery" : "Before & After"}
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Documents button */}
      {(documentUrls.length > 0 || certificates.length > 0) && (
        <TouchableOpacity 
          style={styles.documentsButton}
          onPress={() => setIsDocumentsModalVisible(true)}
        >
          <MaterialIcons name="attach-file" size={18} color="#fff" />
          <Text style={styles.documentsButtonText}>
            View Documents ({documentUrls.length + certificates.length})
          </Text>
        </TouchableOpacity>
      )}

      {/* Stats row */}
      <Text style={styles.statsText}>{likes} likes • {commentsCount} comments</Text>

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

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CommentScreen', { postId })}
        >
          <FontAwesome name="comment-o" size={22} style={styles.unlikedIcon} />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
        
        {userId !== ownerId && (
          <TouchableOpacity style={styles.actionButton} onPress={handleHireNow}>
            <MaterialIcons name="work" size={22} style={styles.unlikedIcon} />
            <Text style={styles.actionText}>Hire</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.actionButton} onPress={handleSharePost}>
          <FontAwesome name="share" size={22} style={styles.unlikedIcon} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
      
      {/* Pinned comment */}
      {pinnedComment && pinnedComment.username && pinnedComment.text && (
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