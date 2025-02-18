import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import { FontAwesome } from '@expo/vector-icons'; // Make sure to install expo/vector-icons

const { width } = Dimensions.get('window');

function Post({ postId, username, caption, imageList, userImage, uploadDate, initialLikes = 0, initialComments = [] }) {
    const { isDarkMode } = useTheme();
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(false);
    const [showComments, setShowComments] = useState(false);

    // Convert Firestore Timestamp to a readable date string
    const formattedDate = uploadDate && uploadDate.seconds
        ? new Date(uploadDate.seconds * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
        : "Unknown date";

    const handleLike = () => {
        setIsLiked(!isLiked);
        setLikes(isLiked ? likes - 1 : likes + 1);
        // Here you would typically make an API call to update likes in your backend
    };

    const handleComment = () => {
        setShowComments(!showComments);
        // Here you would typically navigate to comments screen or show comments modal
    };

    return (
        <View style={[styles.postContainer, isDarkMode ? styles.darkPostContainer : styles.lightPostContainer]}>
            {/* User Info (Profile Picture + Username + Upload Date) */}
            <View style={styles.userInfo}>
                {userImage ? (
                    <Image source={{ uri: userImage }} style={styles.userImage} />
                ) : (
                    <Image source={require('../../assets/default-user.png')} style={styles.userImage} />
                )}
                <View>
                    <Text style={[styles.username, isDarkMode ? styles.darkText : styles.lightText]}>
                        {username}
                    </Text>
                    <Text style={[styles.uploadDate, isDarkMode ? styles.darkText : styles.lightText]}>
                        {formattedDate}
                    </Text>
                </View>
            </View>

            {/* Caption */}
            <Text style={[styles.caption, isDarkMode ? styles.darkText : styles.lightText]}>{caption}</Text>

            {/* Images */}
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
                <Text style={[styles.noImageText, isDarkMode ? styles.darkText : styles.lightText]}>
                    No images available
                </Text>
            )}

            {/* Like and Comment count */}
            <View style={styles.statsContainer}>
                <Text style={[styles.statsText, isDarkMode ? styles.darkText : styles.lightText]}>
                    {likes} likes • {initialComments.length} comments
                </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={handleLike}
                >
                    <FontAwesome 
                        name={isLiked ? "heart" : "heart-o"} 
                        size={24} 
                        color={isLiked ? "#e41e3f" : (isDarkMode ? "#fff" : "#000")} 
                    />
                    <Text style={[styles.actionText, isDarkMode ? styles.darkText : styles.lightText]}>Like</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={handleComment}
                >
                    <FontAwesome 
                        name="comment-o" 
                        size={24} 
                        color={isDarkMode ? "#fff" : "#000"} 
                    />
                    <Text style={[styles.actionText, isDarkMode ? styles.darkText : styles.lightText]}>Comment</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    postContainer: {
        marginBottom: 20,
        padding: 15,
        borderRadius: 8,
    },
    lightPostContainer: {
        backgroundColor: '#f9f9f9',
    },
    darkPostContainer: {
        backgroundColor: '#1e1e1e',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    userImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    username: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    uploadDate: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
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
    noImageText: {
        fontSize: 14,
        color: '#888',
        marginTop: 5,
    },
    lightText: {
        color: '#000',
    },
    darkText: {
        color: '#fff',
    },
    statsContainer: {
        marginTop: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    statsText: {
        fontSize: 14,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    actionText: {
        marginLeft: 8,
        fontSize: 14,
    },
});

export default Post;