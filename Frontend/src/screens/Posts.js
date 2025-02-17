import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../hooks/ThemeContext'; // Import the useTheme hook

const { width } = Dimensions.get('window');

function Post({ postId, username, caption, imageList, userImage, uploadDate }) {
    const { isDarkMode } = useTheme(); // Get the dark mode state

    // Convert Firestore Timestamp to a readable date string
    const formattedDate = uploadDate && uploadDate.seconds
        ? new Date(uploadDate.seconds * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
        : "Unknown date";

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
                <Text style={[styles.noImageText, isDarkMode ? styles.darkText : styles.lightText]}>
                    No images available
                </Text>
            )}
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
        borderRadius: 20, // Makes it circular
        marginRight: 10,
    },
    username: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    uploadDate: {
        fontSize: 12,
        color: '#666',
        marginTop: 2, // Small spacing between name and date
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
});

export default Post;
