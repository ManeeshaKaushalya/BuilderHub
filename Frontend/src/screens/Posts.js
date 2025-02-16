import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

function Post({ postId, username, caption, imageList,ownerid }) {
  
    return (
        <View style={styles.postContainer}>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.caption}>{caption}</Text>

            {/* Render multiple images (even if it's just one) */}
            {imageList && imageList.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageContainer}>
                    {imageList.map((img, index) => (
                        <Image 
                            key={index} 
                            source={{ uri: img }} 
                            style={[styles.postImage, { width: width * 0.8 }]} 
                            onError={(e) => console.log("Image failed to load", e.nativeEvent.error)}
                        />
                    ))}
                </ScrollView>
            ) : (
                <Text>No images available</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    postContainer: {
        marginBottom: 20,
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
    },
    username: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    caption: {
        marginTop: 5,
        fontSize: 14,
    },
    imageContainer: {
        marginTop: 10,
    },
    postImage: {
        height: 200,
        marginRight: 10,
        borderRadius: 8,
    },
});

export default Post;
