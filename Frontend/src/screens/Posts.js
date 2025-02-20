import React, { useState, useEffect } from 'react';
import {
    View, Text, Image, StyleSheet, ScrollView,
    Dimensions, TouchableOpacity, ActivityIndicator,
    TextInput, FlatList
} from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const { width } = Dimensions.get('window');

function Post({ postId, username, caption, imageList, userImage, uploadDate, initialLikes = 0 }) {
    const { isDarkMode } = useTheme();
    const auth = getAuth();
    const user = auth.currentUser;
    const userId = user?.uid;

    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);

    const formattedDate = uploadDate?.seconds
        ? new Date(uploadDate.seconds * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
        : "Unknown date";

    useEffect(() => {
        const fetchPostData = async () => {
            try {
                const postRef = doc(firestore, 'posts', postId);
                const postSnap = await getDoc(postRef);

                if (postSnap.exists()) {
                    const postData = postSnap.data();
                    setLikes(postData.likes || 0);
                    setIsLiked(postData.likedBy?.includes(userId));
                    setComments(postData.comments || []);
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

    const handleAddComment = async () => {
        if (!userId || newComment.trim() === "") return;

        try {
            // Fetch the user's name from Firestore
            const userRef = doc(firestore, "users", userId); // Adjust the collection name if needed
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                console.error("User document not found");
                return;
            }

            const userData = userSnap.data();
            const userName = userData.name || "Anonymous"; // Use 'name' field from Firestore

            // Create comment object
            const commentData = {
                userId,
                username: userName,
                text: newComment,
                timestamp: new Date()
            };

            // Update Firestore with the new comment
            const postRef = doc(firestore, "posts", postId);
            await updateDoc(postRef, {
                comments: arrayUnion(commentData)
            });

            setComments([...comments, commentData]);
            setNewComment("");
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };


    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
        <View style={[styles.postContainer, isDarkMode ? styles.darkPostContainer : styles.lightPostContainer]}>
            <View style={styles.userInfo}>
                {userImage ? (
                    <Image source={{ uri: userImage }} style={styles.userImage} />
                ) : (
                    <Image source={require('../../assets/default-user.png')} style={styles.userImage} />
                )}
                <View>
                    <Text style={[styles.username, isDarkMode ? styles.darkText : styles.lightText]}>{username}</Text>
                    <Text style={[styles.uploadDate, isDarkMode ? styles.darkText : styles.lightText]}>{formattedDate}</Text>
                </View>
            </View>

            <Text style={[styles.caption, isDarkMode ? styles.darkText : styles.lightText]}>{caption}</Text>

            {imageList?.length > 0 ? (
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
                <Text style={[styles.noImageText, isDarkMode ? styles.darkText : styles.lightText]}>No images available</Text>
            )}

            <View style={styles.statsContainer}>
                <Text style={[styles.statsText, isDarkMode ? styles.darkText : styles.lightText]}>
                    {likes} likes • {comments.length} comments
                </Text>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                    <FontAwesome
                        name={isLiked ? "heart" : "heart-o"}
                        size={24}
                        color={isLiked ? "#e41e3f" : (isDarkMode ? "#fff" : "#000")}
                    />
                    <Text style={[styles.actionText, isDarkMode ? styles.darkText : styles.lightText]}>Like</Text>
                </TouchableOpacity>
            </View>

            {/* Comment Section */}
            <FlatList
                data={comments}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <View style={styles.commentContainer}>
                        <Text style={styles.commentUsername}>{item.username}:</Text>
                        <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                )}
            />

            <View style={styles.commentInputContainer}>
                <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    value={newComment}
                    onChangeText={setNewComment}
                />
                <TouchableOpacity style={styles.commentButton} onPress={handleAddComment}>
                    <Text style={styles.commentButtonText}>Post</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    postContainer: { padding: 15, borderRadius: 8, marginBottom: 20 },
    lightPostContainer: { backgroundColor: '#f9f9f9' },
    darkPostContainer: { backgroundColor: '#1e1e1e' },
    userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    userImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    username: { fontWeight: 'bold', fontSize: 16 },
    uploadDate: { fontSize: 12, color: '#666', marginTop: 2 },
    caption: { marginTop: 5, fontSize: 14 },
    postImage: { height: 200, borderRadius: 8, marginRight: 10 },
    statsContainer: { marginTop: 10, paddingVertical: 10 },
    statsText: { fontSize: 14 },
    actionButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    actionText: { marginLeft: 8, fontSize: 14 },
    commentContainer: { flexDirection: 'row', marginTop: 10 },
    commentUsername: { fontWeight: 'bold', marginRight: 5 },
    commentText: { flexShrink: 1 },
    commentInputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    commentInput: { flex: 1, borderBottomWidth: 1, marginRight: 10 },
    commentButton: { backgroundColor: '#007bff', padding: 8, borderRadius: 5 },
    commentButtonText: { color: '#fff' }
});

export default Post;
