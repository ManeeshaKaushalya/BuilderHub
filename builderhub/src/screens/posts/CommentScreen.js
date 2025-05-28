import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList,ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { firestore } from '../../../firebase/firebaseConfig';
import { doc, getDoc, collection, addDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Animated } from 'react-native';
import Toast from 'react-native-toast-message';
import styles from '../../styles/CommentScreenStyles';

const CommentScreen = () => {
  const route = useRoute();
  const { postId } = route.params;

  const auth = getAuth();
  const user = auth.currentUser;
  const userId = user?.uid;

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!postId) return;

    const commentsRef = collection(firestore, 'posts', postId, 'comments');
    const unsubscribe = onSnapshot(commentsRef, async (snapshot) => {
      try {
        const fetchedComments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const sortedComments = fetchedComments.sort(
          (a, b) => (b.timestamp?.toDate() || new Date()) - (a.timestamp?.toDate() || new Date())
        );
        setComments(sortedComments);

        const userIds = fetchedComments.map((comment) => comment.userId);
        await fetchUserDetails(userIds);
      } catch (error) {
        console.error('Error fetching comments:', error);
        Toast.show({ type: 'error', text1: 'Failed to load comments' });
      } finally {
        setIsLoading(false);
      }
    }, (error) => {
      console.error('Snapshot error:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const fetchUserDetails = async (userIds) => {
    const uniqueUserIds = [...new Set(userIds)];
    const details = {};

    for (const uid of uniqueUserIds) {
      try {
        const userRef = doc(firestore, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          details[uid] = userSnap.data();
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    }

    setUserDetails(details);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Just now';
    }
  };

  const handleLike = async (commentId) => {
    try {
      const commentRef = doc(firestore, 'posts', postId, 'comments', commentId);
      const comment = comments.find((c) => c.id === commentId);
      const hasLiked = comment.likes?.includes(userId);

      const updatedLikes = hasLiked
        ? comment.likes.filter((id) => id !== userId)
        : [...(comment.likes || []), userId];

      await updateDoc(commentRef, { likes: updatedLikes });

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, likes: updatedLikes } : c
        )
      );
    } catch (error) {
      console.error('Error updating like:', error);
      Toast.show({ type: 'error', text1: 'Failed to update like' });
    }
  };

  const handleLongPress = (index) => {
    const comment = comments[index];
    if (comment.userId === userId) {
      setSelectedCommentId(index);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const hideDeleteMenu = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setSelectedCommentId(null));
  };

  const handleDeleteComment = async (commentIndex) => {
    const comment = comments[commentIndex];
    if (comment.userId !== userId) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const commentRef = doc(firestore, 'posts', postId, 'comments', comment.id);
              await deleteDoc(commentRef);
              // automatically update the comments state
            } catch (error) {
              console.error('Error deleting comment:', error);
              Toast.show({ type: 'error', text1: 'Failed to delete comment' });
            }
          },
        },
      ]
    );
  };

  const handleAddComment = async () => {
    if (!userId || !newComment.trim()) return;
    setIsPosting(true);
    try {
      const commentsRef = collection(firestore, 'posts', postId, 'comments');
      const commentData = {
        userId,
        text: newComment.trim(),
        timestamp: new Date(),
        likes: [],
        replyTo: replyTo ? { userId: replyTo.userId, name: replyTo.name } : null,
      };
      await addDoc(commentsRef, commentData);

      // Send notification
      const postRef = doc(firestore, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists() && postSnap.data().uid !== userId) {
        const notificationsRef = collection(firestore, 'users', postSnap.data().uid, 'notifications');
        await addDoc(notificationsRef, {
          type: 'comment',
          postId,
          actorId: userId,
          message: newComment.trim().substring(0, 50),
          timestamp: new Date(),
          read: false,
        });
      }

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error adding comment:', error);
      Toast.show({ type: 'error', text1: 'Failed to post comment' });
    } finally {
      setIsPosting(false);
    }
  };

  const renderComment = ({ item, index }) => {
    const user = userDetails[item.userId] || {};
    const likeCount = item.likes?.length || 0;
    const hasLiked = item.likes?.includes(userId);
    const replyToUser = item.replyTo ? userDetails[item.replyTo.userId] : null;
    const isOwnComment = item.userId === userId;
    const isSelected = selectedCommentId === index;

    return (
      <Pressable
        onLongPress={() => handleLongPress(index)}
        onPress={() => isSelected && hideDeleteMenu()}
        delayLongPress={500}
        style={styles.commentContainer}
      >
        <View style={styles.commentHeader}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: user.profileImage || 'https://via.placeholder.com/40' }}
              style={styles.profileImage}
            />
            <View style={styles.commentContent}>
              <View style={[styles.commentBubble, isSelected && styles.selectedComment]}>
                <View style={styles.commentTopRow}>
                  <Text style={styles.username}>{user.name || 'Anonymous'}</Text>
                </View>
                {replyToUser && (
                  <Text style={styles.replyingTo}>
                    Replying to <Text style={styles.replyName}>{replyToUser.name}</Text>
                  </Text>
                )}
                <Text style={styles.commentText}>{item.text}</Text>
              </View>
              <View style={styles.commentActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
                  <Text style={[styles.actionText, hasLiked && styles.likedText]}>
                    Like {likeCount > 0 && `(${likeCount})`}
                  </Text>
                </TouchableOpacity>
               
                <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
              </View>
            </View>
          </View>
        </View>

        {isSelected && isOwnComment && (
          <Animated.View style={[styles.deleteMenu, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.deleteOption}
              onPress={() => {
                hideDeleteMenu();
                handleDeleteComment(index);
              }}
            >
              <MaterialCommunityIcons name="delete-outline" size={24} color="#FF3B30" />
              <Text style={styles.deleteText}>Delete Comment</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877f2" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        contentContainerStyle={styles.commentsList}
        ListEmptyComponent={<Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>}
      />

      {replyTo && (
        <View style={styles.replyingContainer}>
          <Text style={styles.replyingText}>Replying to {replyTo.name}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.cancelReply}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.commentInputContainer}>
        <Image
          source={{ uri: user?.photoURL || userDetails[userId]?.profileImage || 'https://via.placeholder.com/40' }}
          style={styles.inputProfileImage}
        />
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
          editable={!isPosting}
        />
        <TouchableOpacity
          style={[styles.commentButton, (!newComment.trim() || isPosting) && styles.disabledButton]}
          onPress={handleAddComment}
          disabled={!newComment.trim() || isPosting}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.commentButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};



export default CommentScreen;