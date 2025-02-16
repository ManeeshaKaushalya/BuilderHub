import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  FlatList,
  Image, 
  TouchableOpacity,
  ActivityIndicator 
} from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import ImageUpload from './ImageUpload';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../firebase/firebaseConfig';
import Icon from 'react-native-vector-icons/FontAwesome5';

// Post component to display individual posts
const PostItem = ({ post, isDarkMode }) => (
  <View style={[
    styles.postItem,
    isDarkMode ? styles.darkPostItem : styles.lightPostItem
  ]}>
    <View style={styles.postHeader}>
      <Text style={[
        styles.username,
        isDarkMode ? styles.darkText : styles.lightText
      ]}>
        {post.username}
      </Text>
      <Text style={[
        styles.timestamp,
        isDarkMode ? styles.darkSubtext : styles.lightSubtext
      ]}>
        {post.timestamp?.toDate().toLocaleDateString()}
      </Text>
    </View>
    
    <Text style={[
      styles.caption,
      isDarkMode ? styles.darkText : styles.lightText
    ]}>
      {post.caption}
    </Text>

    {post.imageUrls && post.imageUrls.length > 0 && (
      <FlatList
        data={post.imageUrls}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Image 
            source={{ uri: item }} 
            style={styles.postImage}
          />
        )}
        keyExtractor={(item, index) => index.toString()}
        style={styles.imageList}
      />
    )}
  </View>
);

function UsersPostsScreen() {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch posts from Firestore
  useEffect(() => {
    const postsRef = collection(firestore, 'posts');
    const q = query(postsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    
    const searchTerms = searchQuery.toLowerCase().split(' ');
    return posts.filter(post => {
      const searchString = `${post.username} ${post.caption}`.toLowerCase();
      return searchTerms.every(term => searchString.includes(term));
    });
  }, [searchQuery, posts]);

  return (
    <View style={[
      styles.container,
      isDarkMode ? styles.darkContainer : styles.lightContainer
    ]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={16} color={isDarkMode ? '#bbb' : '#666'} style={styles.searchIcon} />
        <TextInput
          style={[
            styles.searchInput,
            isDarkMode ? styles.darkInput : styles.lightInput
          ]}
          placeholder="Search posts..."
          placeholderTextColor={isDarkMode ? "#bbb" : "#666"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Posts List */}
      {isLoading ? (
        <ActivityIndicator 
          size="large" 
          color={isDarkMode ? '#fff' : '#000'} 
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={({ item }) => (
            <PostItem post={item} isDarkMode={isDarkMode} />
          )}
          keyExtractor={item => item.id}
          style={styles.postsList}
          ListEmptyComponent={
            <Text style={[
              styles.emptyText,
              isDarkMode ? styles.darkText : styles.lightText
            ]}>
              No posts found
            </Text>
          }
        />
      )}

      {/* Upload Component */}
      <ImageUpload />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: '#f0f2f5',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  lightInput: {
    backgroundColor: '#fff',
    color: '#000',
  },
  darkInput: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
  },
  postsList: {
    flex: 1,
  },
  postItem: {
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  lightPostItem: {
    backgroundColor: '#fff',
  },
  darkPostItem: {
    backgroundColor: '#1c1c1c',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
  },
  caption: {
    fontSize: 14,
    marginBottom: 10,
  },
  imageList: {
    marginTop: 10,
  },
  postImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginRight: 10,
  },
  lightText: {
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
  lightSubtext: {
    color: '#666',
  },
  darkSubtext: {
    color: '#bbb',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
});

export default UsersPostsScreen;