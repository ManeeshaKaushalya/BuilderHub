import React, { useState, useEffect } from 'react';
import {
    View, Text, Image, StyleSheet, ScrollView,
    Dimensions, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const { width } = Dimensions.get('window');

function Post({ postId, username, caption, imageList, userImage, uploadDate, initialLikes = 0 }) {
    const auth = getAuth();
    const user = auth.currentUser;
    const userId = user?.uid;
    const navigation = useNavigation();

    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(false);
    const [commentsCount, setCommentsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPostData = async () => {
            try {
                const postRef = doc(firestore, 'posts', postId);
                const postSnap = await getDoc(postRef);

                if (postSnap.exists()) {
                    const postData = postSnap.data();
                    setLikes(postData.likes || 0);
                    setIsLiked(postData.likedBy?.includes(userId));
                    setCommentsCount(postData.comments?.length || 0);
                }
            } catch (error) {
                console.error('Error fetching post:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchPostData();
        }
    }, [postId, userId]);

    const handleLike = async () => {
        if (!userId) return;

        const postRef = doc(firestore, 'posts', postId);

        try {
            if (isLiked) {
                await updateDoc(postRef, {
                    likes: likes - 1,
                    likedBy: arrayRemove(userId)
                });
                setLikes(likes - 1);
                setIsLiked(false);
            } else {
                await updateDoc(postRef, {
                    likes: likes + 1,
                    likedBy: arrayUnion(userId)
                });
                setLikes(likes + 1);
                setIsLiked(true);
            }
        } catch (error) {
            console.error('Error updating likes:', error);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
        <View style={styles.postContainer}>
            {/* User Info */}
            <View style={styles.userInfo}>
                <Image source={{ uri: userImage || '../../assets/default-user.png' }} style={styles.userImage} />
                <View>
                    <Text style={styles.username}>{username}</Text>
                    <Text style={styles.uploadDate}>{uploadDate?.seconds ? new Date(uploadDate.seconds * 1000).toLocaleDateString() : "Unknown date"}</Text>
                </View>
            </View>

            {/* Caption */}
            <Text style={styles.caption}>{caption}</Text>

            {/* Image List */}
            {imageList?.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageContainer}>
                    {imageList.map((img, index) => (
                        <Image key={index} source={{ uri: img }} style={[styles.postImage, { width: width * 0.8 }]} />
                    ))}
                </ScrollView>
            ) : null}

            {/* Stats */}
            <Text style={styles.statsText}>{likes} likes • {commentsCount} comments</Text>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                {/* Like Button */}
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                    <FontAwesome
                        name={isLiked ? "heart" : "heart-o"}
                        size={24}
                        color={isLiked ? "#e41e3f" : "#000"}
                    />
                    <Text style={styles.actionText}>Like</Text>
                </TouchableOpacity>

                {/* Comment Button (Navigates to CommentScreen) */}
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
    postContainer: { padding: 15, borderRadius: 8, marginBottom: 20, backgroundColor: '#f9f9f9' },
    userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    userImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    username: { fontWeight: 'bold', fontSize: 16 },
    uploadDate: { fontSize: 12, color: '#666' },
    caption: { marginTop: 5, fontSize: 14 },
    postImage: { height: 200, borderRadius: 8, marginRight: 10 },
    statsText: { marginTop: 10, paddingVertical: 10, fontSize: 14 },
    actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    actionText: { marginLeft: 8, fontSize: 14 },
});

export default Post;
