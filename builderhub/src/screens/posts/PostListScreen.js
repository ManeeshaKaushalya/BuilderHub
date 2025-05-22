import React, { useState, useEffect } from 'react';
import { FlatList, ActivityIndicator, View } from 'react-native';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import Post from './Posts'; 

function PostListScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up Firestore listener for the posts collection
    const unsubscribe = onSnapshot(
      collection(firestore, 'posts'),
      (snapshot) => {
        const postData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(postData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <Post {...item} postId={item.id} />}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
    />
  );
}

export default PostListScreen;