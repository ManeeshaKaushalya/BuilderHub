import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Post from './Posts';

function UsersPostsScreen() {
  const auth = getAuth();
  const user = auth.currentUser;
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!user) {
      console.log("No authenticated user in UsersPostsScreen!");
      setLoading(false);
      return;
    }
    console.log("Authenticated user UID in UsersPostsScreen:", user.uid);

    const postsRef = collection(firestore, 'posts');
    console.log("Setting up posts listener...");
    const unsubscribe = onSnapshot(postsRef, async (snapshot) => {
      console.log("Posts snapshot received, size:", snapshot.size);
      if (snapshot.empty) {
        console.log("No posts found in collection.");
        setPosts([]);
        setLoading(false);
        return;
      }

      const postList = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const postData = { id: docSnapshot.id, ...docSnapshot.data() };
          console.log("Processing post in UsersPostsScreen:", postData.id, postData);

          let ownerData = { name: 'Unknown Professional', profileImage: null };
          if (postData.uid) {
            try {
              const userDocRef = doc(firestore, 'users', postData.uid);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                ownerData = {
                  name: userDocSnap.data().name || 'Unknown Professional',
                  profileImage: userDocSnap.data().profileImage || null,
                };
              } else {
                console.log("User not found for UID:", postData.uid);
              }
            } catch (error) {
              console.error('Error fetching user for post', postData.id, ':', error);
            }
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
        })
      );

      console.log("Posts processed, total:", postList.length);
      setPosts(postList);
      setLoading(false);
    }, (error) => {
      console.error("Posts snapshot error in UsersPostsScreen:", error);
      setLoading(false);
    });

    return () => {
      console.log("Unsubscribing from posts listener in UsersPostsScreen");
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      try {
        console.log("Fetching professionals...");
        const usersCollection = collection(firestore, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || "Unknown Professional",
        }));
        console.log("Professionals fetched:", userList.length);
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching professionals:", error);
      }
    };

    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredUsers([]);
    } else {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [search, users]);

  const handleCreatePost = () => {
    navigation.navigate('ImageUpload');
  };

  const handlePostInteraction = (postId) => {
    console.log("Post interaction for:", postId);
    navigation.navigate('PostDetails', { postId }); // Assuming a PostDetails screen exists
  };

  const combinedData = [
    ...filteredUsers.map(user => ({ type: 'user', id: user.id, user })),
    ...posts.map(post => ({ type: 'post', id: post.postId, post })),
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
      console.log("Rendering project post:", item.post.postId);
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handlePostInteraction(item.post.postId)}
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

      {/* Create Project Post Button */}
      <TouchableOpacity
        style={styles.createProjectButton}
        onPress={handleCreatePost}
      >
        <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
        <Text style={styles.createProjectText}>Add New Project</Text>
      </TouchableOpacity>

      {/* Search Bar */}
      <TextInput
        style={[styles.searchInput, isDarkMode ? styles.darkInput : styles.lightInput]}
        placeholder="Search professionals or projects..."
        placeholderTextColor={isDarkMode ? "#bbb" : "#666"}
        value={search}
        onChangeText={setSearch}
      />

      {/* Project List */}
      <FlatList
        data={combinedData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  lightContainer: {
    backgroundColor: '#F7F9FC', // Softer light background for professional look
  },
  darkContainer: {
    backgroundColor: '#1A1A1A', // Darker professional tone
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  createProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E88E5', // Professional blue
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  createProjectText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5, // Slight spacing for readability
  },
  searchInput: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0', // Subtle border
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
    color: '#666666', // Subtle color for no results
  },
});

export default UsersPostsScreen;