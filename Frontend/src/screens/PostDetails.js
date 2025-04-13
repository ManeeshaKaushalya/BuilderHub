import React from 'react';
import { View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Post from './Posts'; // Adjust path

function PostDetails() {
  const route = useRoute();
  const { postId } = route.params;
  // Fetch post data or pass from navigation
  return (
    <View>
      <Post postId={postId} /* other props */ />
    </View>
  );
}

export default PostDetails;