import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { firestore } from '../../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Post from './Posts';

function PostDetailsScreen({ route }) {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const { post, uploader } = route.params;
  const [uploaderData, setUploaderData] = useState(uploader);
  const [loading, setLoading] = useState(true);

  // Fetch additional uploader data if needed
  useEffect(() => {
    const fetchUploaderData = async () => {
      try {
        const userRef = doc(firestore, 'users', uploader.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUploaderData({
            id: uploader.id,
            name: data.name || uploader.name,
            profileImage: data.profileImage || uploader.profileImage,
            bio: data.bio || 'No bio available',
            // Add more fields as needed (e.g., location, accountType)
          });
        }
      } catch (error) {
        console.error('Error fetching uploader data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUploaderData();
  }, [uploader.id]);

  const navigateToUserProfile = () => {
    navigation.navigate('UploaderProfile', { userId: uploader.id });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={isDarkMode ? '#60A5FA' : '#007BFF'} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}
      contentContainerStyle={styles.contentContainer}
    >
  

      {/* Post Section */}
      <Post
        postId={post.postId}
        username={post.username}
        caption={post.caption}
        imageList={post.imageList}
        videoUrl={post.videoUrl}
        userImage={post.userImage}
        uploadDate={post.uploadDate}
        initialLikes={post.initialLikes}
        ownerId={post.ownerId}
        categories={post.categories}
        isVerified={post.isVerified}
        beforeAfterImages={post.beforeAfterImages}
        projectTimeline={post.projectTimeline}
        projectCost={post.projectCost}
        documentUrls={post.documentUrls}
        certificates={post.certificates}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: '#F7F9FC',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  contentContainer: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkUserInfo: {
    backgroundColor: '#2C2C2C',
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  userInfoText: {
    flex: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  bio: {
    fontSize: 14,
    color: '#666',
  },
  lightText: {
    color: '#333333',
  },
  darkText: {
    color: '#FFFFFF',
  },
});

export default PostDetailsScreen;