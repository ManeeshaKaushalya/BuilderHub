import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { firestore } from '../../firebase/firebaseConfig';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CommentScreen = () => {
    const route = useRoute();
    const { postId } = route.params;

    const auth = getAuth();
    const user = auth.currentUser;
    const userId = user?.uid;

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [userDetails, setUserDetails] = useState({});

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchUserDetails = async (userIds) => {
        const uniqueUserIds = [...new Set(userIds)];
        const details = {};

        for (const uid of uniqueUserIds) {
            try {
                const userRef = doc(firestore, "users", uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    details[uid] = userSnap.data();
                }
            } catch (error) {
                console.error('Error fetching user details:', error);
            }
        }

        setUserDetails(details);
    };

    const fetchComments = async () => {
        try {
            const postRef = doc(firestore, 'posts', postId);
            const postSnap = await getDoc(postRef);

            if (postSnap.exists()) {
                const fetchedComments = postSnap.data().comments || [];
                const sortedComments = fetchedComments.sort((a, b) => b.timestamp - a.timestamp);
                setComments(sortedComments);

                const userIds = fetchedComments.map(comment => comment.userId);
                await fetchUserDetails(userIds);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Just now';

        try {
            const now = Date.now();
            const diff = now - timestamp;

            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
            if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;

            const date = new Date(timestamp);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Just now';
        }
    };

    const handleLike = async (commentIndex) => {
        try {
            const comment = comments[commentIndex];
            const hasLiked = comment.likes?.includes(userId);

            const updatedComments = [...comments];
            if (hasLiked) {
                updatedComments[commentIndex].likes = comment.likes.filter(id => id !== userId);
            } else {
                updatedComments[commentIndex].likes = [...(comment.likes || []), userId];
            }

            const postRef = doc(firestore, "posts", postId);
            await updateDoc(postRef, {
                comments: updatedComments
            });

            setComments(updatedComments);
        } catch (error) {
            console.error('Error updating like:', error);
            Alert.alert("Error", "Failed to update like. Please try again.");
        }
    };

    const handleDeleteComment = async (commentIndex) => {
        const commentToDelete = comments[commentIndex];

        if (commentToDelete.userId !== userId) return;

        Alert.alert(
            "Delete Comment",
            "Are you sure you want to delete this comment?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const postRef = doc(firestore, "posts", postId);
                            const updatedComments = comments.filter((_, index) => index !== commentIndex);

                            await updateDoc(postRef, {
                                comments: updatedComments
                            });

                            setComments(updatedComments);
                        } catch (error) {
                            console.error('Error deleting comment:', error);
                            Alert.alert("Error", "Failed to delete comment. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const handleAddComment = async () => {
        if (!userId || newComment.trim() === "") return;

        setIsPosting(true);
        try {
            const commentData = {
                userId,
                text: newComment.trim(),
                timestamp: Date.now(),
                likes: [],
                replyTo: replyTo
            };

            const postRef = doc(firestore, "posts", postId);
            const currentDoc = await getDoc(postRef);
            const currentComments = currentDoc.data()?.comments || [];

            await updateDoc(postRef, {
                comments: [...currentComments, commentData]
            });

            if (!userDetails[userId]) {
                const userRef = doc(firestore, "users", userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setUserDetails(prev => ({
                        ...prev,
                        [userId]: userSnap.data()
                    }));
                }
            }

            setComments(prevComments => [commentData, ...prevComments]);
            setNewComment("");
            setReplyTo(null);
        } catch (error) {
            console.error('Error posting comment:', error);
            Alert.alert("Error", "Failed to post comment. Please try again.");
        } finally {
            setIsPosting(false);
        }
    };

    const renderComment = ({ item, index }) => {
        const user = userDetails[item.userId] || {};
        const likeCount = item.likes?.length || 0;
        const hasLiked = item.likes?.includes(userId);
        const replyToUser = item.replyTo ? userDetails[item.replyTo.userId] : null;
        const isOwnComment = item.userId === userId;

        return (
            <View style={styles.commentContainer}>
                <View style={styles.commentHeader}>
                    <View style={styles.userInfo}>
                        <Image
                            source={{ uri: user.profileImage || 'https://via.placeholder.com/40' }}
                            style={styles.profileImage}
                        />
                        <View style={styles.commentContent}>
                            <View style={styles.commentBubble}>
                                <View style={styles.commentTopRow}>
                                    <Text style={styles.username}>{user.name || "Anonymous"}</Text>
                                    {isOwnComment && (
                                        <TouchableOpacity
                                            onPress={() => handleDeleteComment(index)}
                                            style={styles.deleteButton}
                                        >
                                            <MaterialCommunityIcons
                                                name="delete-outline"
                                                size={18}
                                                color="#65676b"
                                            />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {replyToUser && (
                                    <Text style={styles.replyingTo}>
                                        Replying to <Text style={styles.replyName}>{replyToUser.name}</Text>
                                    </Text>
                                )}
                                <Text style={styles.commentText}>{item.text}</Text>
                            </View>
                            <View style={styles.commentActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleLike(index)}
                                >
                                    <Text style={[
                                        styles.actionText,
                                        hasLiked && styles.likedText
                                    ]}>
                                        Like {likeCount > 0 && `(${likeCount})`}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => setReplyTo({ userId: item.userId, name: user.name })}
                                >
                                    <Text style={styles.actionText}>Reply</Text>
                                </TouchableOpacity>
                                <Text style={styles.timestamp}>
                                    {formatTimestamp(item.timestamp)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1877f2" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <FlatList
                data={comments}
                keyExtractor={(item, index) => `${item.userId}-${index}`}
                renderItem={renderComment}
                contentContainerStyle={styles.commentsList}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        No comments yet. Be the first to comment!
                    </Text>
                }
            />

            {replyTo && (
                <View style={styles.replyingContainer}>
                    <Text style={styles.replyingText}>
                        Replying to {replyTo.name}
                    </Text>
                    <TouchableOpacity onPress={() => setReplyTo(null)}>
                        <Text style={styles.cancelReply}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.commentInputContainer}>
                <Image
                    source={{
                        uri: userDetails[userId]?.profileImage || 'https://via.placeholder.com/40'
                    }}
                    style={styles.inputProfileImage}
                />
                <TextInput
                    style={styles.commentInput}
                    placeholder="Write a comment..."
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={500}
                    editable={!isPosting}
                />
                <TouchableOpacity
                    style={[
                        styles.commentButton,
                        (!newComment.trim() || isPosting) && styles.disabledButton
                    ]}
                    onPress={handleAddComment}
                    disabled={!newComment.trim() || isPosting}
                >
                    {isPosting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.commentButtonText}>Post</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    commentsList: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    commentContainer: {
        marginBottom: 16,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
    },
    profileImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 8,
    },
    inputProfileImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    commentContent: {
        flex: 1,
    },
    commentBubble: {
        backgroundColor: '#F0F2F5',
        borderRadius: 18,
        padding: 12,
    },
    commentTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    username: {
        fontWeight: '600',
        fontSize: 13,
        color: '#050505',
        marginBottom: 2,
    },
    commentText: {
        fontSize: 15,
        color: '#050505',
        lineHeight: 20,
    },
    replyingTo: {
        fontSize: 13,
        color: '#65676B',
        marginBottom: 4,
    },
    replyName: {
        fontWeight: '600',
        color: '#050505',
    },
    commentActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        paddingLeft: 8,
    },
    actionButton: {
        marginRight: 16,
        paddingVertical: 4,
    },
    actionText: {
        fontSize: 13,
        color: '#65676B',
        fontWeight: '500',
    },
    likedText: {
        color: '#1877F2',
        fontWeight: '600',
    },
    timestamp: {
        fontSize: 13,
        color: '#65676B',
    },
    deleteButton: {
        padding: 4,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#E4E6EB',
        backgroundColor: '#FFFFFF',
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#F0F2F5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 15,
        maxHeight: 100,
        color: '#050505',
    },
    commentButton: {
        marginLeft: 8,
        backgroundColor: '#1877F2',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#E4E6EB',
    },
    commentButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    emptyText: {
        textAlign: 'center',
        color: '#65676B',
        fontSize: 15,
        marginTop: 24,
    },
    replyingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        paddingHorizontal: 16,
        backgroundColor: '#F0F2F5',
        borderTopWidth: 1,
        borderTopColor: '#E4E6EB',
    },
    replyingText: {
        fontSize: 13,
        color: '#65676B',
    },
    cancelReply: {
        fontSize: 13,
        color: '#1877F2',
        fontWeight: '500',
    }
});

export default CommentScreen;