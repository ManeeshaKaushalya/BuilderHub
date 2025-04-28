import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { firestore } from '../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const PostCards = ({ route }) => {
  const { postId } = route.params;
  const { isDarkMode } = useTheme();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postRef = doc(firestore, 'posts', postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          setPost(postSnap.data());
        } else {
          console.log('Post not found:', postId);
          Toast.show({
            type: 'error',
            text1: 'Post not found',
            text2: 'The post may have been deleted.',
          });
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to load post',
          text2: 'Please try again later.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  const renderImage = ({ item }) => (
    <Image
      source={{ uri: item }}
      style={styles.postImage}
      resizeMode="cover"
      onError={() => console.warn('Failed to load image:', item)}
    />
  );

  const renderDocumentImage = ({ item }) => {
    if (item.type.startsWith('image/')) {
      return (
        <Image
          source={{ uri: item.url }}
          style={styles.documentImage}
          resizeMode="cover"
          onError={() => console.warn('Failed to load document image:', item.url)}
        />
      );
    }
    return null; // Skip non-image documents
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#4fc3f7' : '#007BFF'} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
        <Text style={[styles.errorText, isDarkMode ? styles.darkText : styles.lightText]}>
          Post not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Image
          source={{ uri: post.userImage || 'https://via.placeholder.com/40' }}
          style={styles.userImage}
        />
        <View>
          <Text style={[styles.username, isDarkMode ? styles.darkText : styles.lightText]}>
            {post.username}
          </Text>
          <Text style={styles.timestamp}>
            {post.timestamp?.toDate ? post.timestamp.toDate().toLocaleDateString() : 'Unknown date'}
          </Text>
        </View>
      </View>

      <Text style={[styles.caption, isDarkMode ? styles.darkText : styles.lightText]}>
        {post.caption}
      </Text>

      {post.imageList?.length > 0 && (
        <FlatList
          data={post.imageList}
          renderItem={renderImage}
          keyExtractor={(item, index) => `image-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageList}
        />
      )}

      {post.documentUrls?.length > 0 && (
        <FlatList
          data={post.documentUrls}
          renderItem={renderDocumentImage}
          keyExtractor={(item, index) => `doc-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageList}
        />
      )}

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <MaterialIcons
            name="category"
            size={20}
            color={isDarkMode ? '#4fc3f7' : '#007BFF'}
            style={styles.detailIcon}
          />
          <Text style={[styles.detailText, isDarkMode ? styles.darkText : styles.lightText]}>
            Categories: {post.categories?.join(', ') || 'None'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons
            name="attach-money"
            size={20}
            color={isDarkMode ? '#4fc3f7' : '#007BFF'}
            style={styles.detailIcon}
          />
          <Text style={[styles.detailText, isDarkMode ? styles.darkText : styles.lightText]}>
            Project Cost: {post.projectCost ? `$${parseInt(post.projectCost).toLocaleString()}` : 'N/A'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons
            name="schedule"
            size={20}
            color={isDarkMode ? '#4fc3f7' : '#007BFF'}
            style={styles.detailIcon}
          />
          <Text style={[styles.detailText, isDarkMode ? styles.darkText : styles.lightText]}>
            Timeline: {post.projectTimeline || 'N/A'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons
            name="favorite"
            size={20}
            color={isDarkMode ? '#ff6b6b' : '#e41e3f'}
            style={styles.detailIcon}
          />
          <Text style={[styles.detailText, isDarkMode ? styles.darkText : styles.lightText]}>
            Likes: {post.likes || 0}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons
            name="verified"
            size={20}
            color={post.isVerified ? (isDarkMode ? '#81c784' : '#28a745') : '#666'}
            style={styles.detailIcon}
          />
          <Text style={[styles.detailText, isDarkMode ? styles.darkText : styles.lightText]}>
            {post.isVerified ? 'Verified' : 'Not Verified'}
          </Text>
        </View>
      </View>

      <Toast />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: '#f7f9fc',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  caption: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  imageList: {
    marginBottom: 16,
  },
  postImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginRight: 8,
  },
  documentImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 8,
  },
  details: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  lightText: {
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
});

export default PostCards;