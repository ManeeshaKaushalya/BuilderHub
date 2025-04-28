import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Post from './Posts';

function UsersPostsScreen() {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  // Redirect to Login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      console.log('No authenticated user, redirecting to Login');
      navigation.replace('Login');
    }
  }, [user, loading, navigation]);

  // Fetch and cache user data
  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      try {
        console.log('Fetching professionals...');
        const usersCollection = collection(firestore, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || 'Unknown Professional',
          profileImage: doc.data().profileImage || null,
        }));
        const userMap = userSnapshot.docs.reduce((map, doc) => {
          map[doc.id] = {
            id: doc.id,
            name: doc.data().name || 'Unknown Professional',
            profileImage: doc.data().profileImage || null,
            // Add more fields if needed (e.g., bio, location)
          };
          return map;
        }, {});
        console.log('Professionals fetched:', userList.length);
        console.log('Users map created:', Object.keys(userMap).length);
        setUsers(userList);
        setUsersMap(userMap);
      } catch (error) {
        console.error('Error fetching professionals:', error);
      }
    };

    fetchUsers();
  }, [user]);

  // Fetch posts and use cached user data
  useEffect(() => {
    if (!user) {
      console.log('No authenticated user in UsersPostsScreen!');
      setLoading(false);
      return;
    }
    console.log('Authenticated user UID in UsersPostsScreen:', user.uid);
    console.log('UserContext user data:', user);

    const postsRef = collection(firestore, 'posts');
    console.log('Setting up posts listener...');
    const unsubscribe = onSnapshot(postsRef, (snapshot) => {
      console.log('Posts snapshot received, size:', snapshot.size);
      if (snapshot.empty) {
        console.log('No posts found in collection.');
        setPosts([]);
        setLoading(false);
        return;
      }

      const postList = snapshot.docs.map((docSnapshot) => {
        const postData = { id: docSnapshot.id, ...docSnapshot.data() };
        console.log('Processing post in UsersPostsScreen:', postData.id, postData);

        const ownerData = postData.uid && usersMap[postData.uid]
          ? usersMap[postData.uid]
          : { name: 'Unknown Professional', profileImage: null };

        if (!usersMap[postData.uid] && postData.uid) {
          console.warn(`User data not found in cache for UID: ${postData.uid}`);
        }

        return {
          postId: postData.id,
          username: ownerData.name,
          caption: postData.caption,
          imageList: postData.imageList || [],
          videoUrl: postData.videoUrl || null,
          userImage: ownerData.profileImage,
          uploadDate: postData.timestamp,
          initialLikes: postData.likes || 0,
          ownerId: postData.uid,
          categories: postData.categories || [],
          isVerified: postData.isVerified || false,
          beforeAfterImages: postData.beforeAfterImages || null,
          projectTimeline: postData.projectTimeline || null,
          projectCost: postData.projectCost || null,
          documentUrls: postData.documentUrls || [],
          certificates: postData.certificates || [],
        };
      });

      console.log('Posts processed, total:', postList.length);
      setPosts(postList);
      setLoading(false);
    }, (error) => {
      console.error('Posts snapshot error in UsersPostsScreen:', error);
      setLoading(false);
    });

    return () => {
      console.log('Unsubscribing from posts listener in UsersPostsScreen');
      unsubscribe();
    };
  }, [user, usersMap]);

  // Search filtering
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredUsers([]);
    } else {
      const filtered = users.filter((user) =>
        user.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [search, users]);

  const handleCreatePost = () => {
    navigation.navigate('ImageUpload');
  };

  const handleAddPost = () => {
    navigation.navigate('AddItem');
  };

  const handlePostInteraction = useCallback((post) => {
    console.log('Post interaction for:', post.postId);
    const uploader = usersMap[post.ownerId] || {
      id: post.ownerId,
      name: post.username,
      profileImage: post.userImage,
    };
    navigation.navigate('PostDetails', { post, uploader });
  }, [navigation, usersMap]);

  const combinedData = [
    ...filteredUsers.map((user) => ({ type: 'user', id: user.id, user })),
    ...posts.map((post) => ({ type: 'post', id: post.postId, post })),
  ];

  const renderItem = ({ item }) => {
    if (item.type === 'user') {
      return (
        <View style={[styles.userCard, isDarkMode ? styles.darkCard : styles.lightCard]}>
          <Text style={[styles.userName, isDarkMode ? styles.darkText : styles.lightText]}>
            {item.user.name}
          </Text>
        </View>
      );
    } else if (item.type === 'post') {
      console.log('Rendering project post:', item.post.postId);
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handlePostInteraction(item.post)}
        >
          <Post
            postId={item.post.postId}
            username={item.post.username}
            caption={item.post.caption}
            imageList={item.post.imageList}
            videoUrl={item.post.videoUrl}
            userImage={item.post.userImage}
            uploadDate={item.post.uploadDate}
            initialLikes={item.post.initialLikes}
            ownerId={item.post.ownerId}
            categories={item.post.categories}
            isVerified={item.post.isVerified}
            beforeAfterImages={item.post.beforeAfterImages}
            projectTimeline={item.post.projectTimeline}
            projectCost={item.post.projectCost}
            documentUrls={item.post.documentUrls}
            certificates={item.post.certificates}
          />
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      {/* Header */}
      <Text style={[styles.headerTitle, isDarkMode ? styles.darkText : styles.lightText]}>
        Project Showcase
      </Text>

      {/* Search Bar */}
      <TextInput
        style={[styles.searchInput, isDarkMode ? styles.darkInput : styles.lightInput]}
        placeholder="Search professionals or projects..."
        placeholderTextColor={isDarkMode ? '#bbb' : '#666'}
        value={search}
        onChangeText={setSearch}
      />

      {/* Project List */}
      <FlatList
        data={combinedData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 80 }]}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
          ) : (
            <Text style={[styles.noResults, isDarkMode ? styles.darkText : styles.lightText]}>
              No projects or professionals found
            </Text>
          )
        }
      />

      {/* Floating Action Button */}
      {user && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, isDarkMode && styles.darkFab]}
            onPress={user.accountType === 'Shop' ? handleAddPost : handleCreatePost}
            activeOpacity={0.7}
            accessibilityLabel={user.accountType === 'Shop' ? 'Add post' : 'Add new project'}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  lightContainer: {
    backgroundColor: '#F7F9FC',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchInput: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  lightInput: {
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  darkInput: {
    backgroundColor: '#2C2C2C',
    color: '#FFFFFF',
    borderColor: '#444444',
  },
  userCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  lightCard: {
    backgroundColor: '#FFFFFF',
  },
  darkCard: {
    backgroundColor: '#2C2C2C',
    borderColor: '#444444',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  lightText: {
    color: '#333333',
  },
  darkText: {
    color: '#FFFFFF',
  },
  loader: {
    marginTop: 30,
  },
  noResults: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    fontStyle: 'italic',
    color: '#666666',
  },
  listContainer: {
    paddingBottom: 80, // Ensure space for FAB
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E88E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  darkFab: {
    backgroundColor: '#60A5FA',
  },
});

export default UsersPostsScreen;