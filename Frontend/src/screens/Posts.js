import React, { useState, useEffect } from 'react';
import {
    View, Text, Image, StyleSheet, ScrollView,
    Dimensions, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const { width } = Dimensions.get('window');

function Post({ postId, username, caption, imageList, userImage, uploadDate, initialLikes = 0, ownerId }) {
    const auth = getAuth();
    const user = auth.currentUser;
    const userId = user?.uid;
    const navigation = useNavigation();

    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(false);
    const [commentsCount, setCommentsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            console.log("No authenticated user for Post component!");
            setLoading(false);
            return;
        }

        console.log("Setting up listener for post:", postId);
        const postRef = doc(firestore, 'posts', postId);

        const unsubscribe = onSnapshot(postRef, (snapshot) => {
            if (snapshot.exists()) {
                const postData = snapshot.data();
                console.log("Post data received:", postData);
                setLikes(postData.likes || 0);
                setIsLiked(postData.likedBy?.includes(userId) || false);
                setCommentsCount(postData.comments?.length || 0);
                setLoading(false);
            } else {
                console.log("Post document does not exist:", postId);
                setLoading(false);
            }
        }, (error) => {
            console.error('Error in Post snapshot listener:', error);
            setLoading(false);
        });

        return () => {
            console.log("Unsubscribing from post:", postId);
            unsubscribe();
        };
    }, [postId, userId]);

    const handleLike = async () => {
        if (!userId) {
            console.log("Cannot like post: no user authenticated");
            return;
        }

        const postRef = doc(firestore, 'posts', postId);
        try {
            if (isLiked) {
                await updateDoc(postRef, {
                    likes: likes - 1,
                    likedBy: arrayRemove(userId)
                });
                console.log("Unliked post:", postId);
            } else {
                await updateDoc(postRef, {
                    likes: likes + 1,
                    likedBy: arrayUnion(userId)
                });
                console.log("Liked post:", postId);
            }
        } catch (error) {
            console.error('Error updating likes:', error);
        }
    };

    const navigateToUserProfile = () => {
        if (ownerId) {
            navigation.navigate('UploaderProfile', { userId: ownerId });
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
    }

    return (
        <View style={styles.postContainer}>
            <TouchableOpacity style={styles.userInfo} onPress={navigateToUserProfile}>
                <Image source={{ uri: userImage || 'https://via.placeholder.com/40' }} style={styles.userImage} />
                <View>
                    <Text style={styles.username}>{username}</Text>
                    <Text style={styles.uploadDate}>
                        {uploadDate?.seconds ? new Date(uploadDate.seconds * 1000).toLocaleDateString() : "Unknown date"}
                    </Text>
                </View>
            </TouchableOpacity>

            <Text style={styles.caption}>{caption}</Text>

            {imageList?.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageContainer}>
                    {imageList.map((img, index) => (
                        <Image key={index} source={{ uri: img }} style={[styles.postImage, { width: width * 0.8 }]} />
                    ))}
                </ScrollView>
            ) : null}

            <Text style={styles.statsText}>{likes} likes • {commentsCount} comments</Text>

            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                    <FontAwesome
                        name={isLiked ? "heart" : "heart-o"}
                        size={24}
                        color={isLiked ? "#e41e3f" : "#000"}
                    />
                    <Text style={styles.actionText}>Like</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('CommentScreen', { postId })}
                >
                    <FontAwesome name="comment-o" size={24} color="#000" />
                    <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    postContainer: { 
        padding: 15, 
        borderRadius: 8, 
        marginBottom: 20, 
        backgroundColor: '#f9f9f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    userInfo: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 8,
        padding: 5
    },
    userImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    username: { fontWeight: 'bold', fontSize: 16 },
    uploadDate: { fontSize: 12, color: '#666' },
    caption: { marginTop: 5, fontSize: 14, lineHeight: 20 },
    imageContainer: { marginTop: 10 },
    postImage: { 
        height: 200, 
        borderRadius: 8, 
        marginRight: 10,
        marginTop: 5
    },
    statsText: { 
        marginTop: 10, 
        paddingVertical: 10, 
        fontSize: 14,
        color: '#666'
    },
    actionButtons: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10
    },
    actionButton: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 8,
        flex: 1,
        justifyContent: 'center'
    },
    actionText: { 
        marginLeft: 8, 
        fontSize: 14,
        color: '#666'
    },
    loader: { marginVertical: 20 }
});

export default Post;