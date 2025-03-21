import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, Image, StyleSheet, ScrollView, Dimensions,
    TouchableOpacity, ActivityIndicator, Share, Alert,
    Modal, FlatList, Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Video } from 'expo-av';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

function Post({ 
    postId, 
    username, 
    caption, 
    imageList = [], 
    videoUrl, 
    userImage, 
    uploadDate, 
    initialLikes = 0, 
    ownerId,
    categories = [],
    isVerified = false,
    beforeAfterImages = null,
    projectTimeline = null,
    projectCost = null,
    documentUrls = [],
    certificates = []
}) {
    const auth = getAuth();
    const user = auth.currentUser;
    const userId = user?.uid;
    const navigation = useNavigation();
    const { isDarkMode } = useTheme();
    const videoRef = useRef(null);

    // State variables
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(false);
    const [commentsCount, setCommentsCount] = useState(0);
    const [comments, setComments] = useState([]);
    const [pinnedComment, setPinnedComment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showBeforeAfter, setShowBeforeAfter] = useState(false);
    const [beforeAfterPosition] = useState(new Animated.Value(0));
    const [isDocumentsModalVisible, setIsDocumentsModalVisible] = useState(false);
    const [showFullCaption, setShowFullCaption] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [imageErrors, setImageErrors] = useState({ before: false, after: false });

    useEffect(() => {
        if (!postId) {
            console.error("No postId provided!");
            setLoading(false);
            return;
        }

        if (!userId) {
            console.log("No authenticated user for Post component!");
            setLoading(false);
            return;
        }

        console.log("Setting up listener for post:", postId);
        const postRef = doc(firestore, 'posts', postId);

        const unsubscribe = onSnapshot(postRef, async (snapshot) => {
            try {
                if (snapshot.exists()) {
                    const postData = snapshot.data();
                    console.log("Post data received:", JSON.stringify(postData, null, 2));
                    setLikes(postData.likes || 0);
                    setIsLiked(postData.likedBy?.includes(userId) || false);
                    
                    // Log before/after images specifically
                    if (postData.beforeAfterImages) {
                        console.log("Before/After images data:", postData.beforeAfterImages);
                    } else {
                        console.log("No beforeAfterImages found in post data");
                    }
                    
                    fetchComments();
                    
                    if (userId) {
                        const userRef = doc(firestore, 'users', userId);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            setIsSaved((userData.savedPosts || []).includes(postId));
                        }
                    }
                    
                    setLoading(false);
                } else {
                    console.log("Post document does not exist:", postId);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error processing snapshot:', error);
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

    const fetchComments = async () => {
        try {
            const commentsRef = collection(firestore, 'posts', postId, 'comments');
            const commentsSnap = await onSnapshot(commentsRef, (snapshot) => {
                const commentsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                const pinned = commentsData.find(comment => comment.isPinned);
                if (pinned) {
                    setPinnedComment(pinned);
                }
                
                setComments(commentsData);
                setCommentsCount(commentsData.length);
            });
            
            return () => commentsSnap();
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

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

    const handleSavePost = async () => {
        if (!userId) {
            Alert.alert("Error", "You need to be logged in to save posts");
            return;
        }
        
        const userRef = doc(firestore, 'users', userId);
        
        try {
            if (isSaved) {
                await updateDoc(userRef, {
                    savedPosts: arrayRemove(postId)
                });
                setIsSaved(false);
            } else {
                await updateDoc(userRef, {
                    savedPosts: arrayUnion(postId)
                });
                setIsSaved(true);
            }
        } catch (error) {
            console.error('Error saving post:', error);
            Alert.alert("Error", "Failed to save this post");
        }
    };

    const handleSharePost = async () => {
        try {
            await Share.share({
                message: `Check out this amazing work by ${username}: ${caption}`,
            });
        } catch (error) {
            console.error('Error sharing post:', error);
        }
    };

    const handleHireNow = () => {
        navigation.navigate('ContactProfessional', { 
            professionalId: ownerId,
            professionalName: username,
            postId: postId,
            postImage: imageList[0]
        });
    };

    const navigateToUserProfile = () => {
        if (ownerId) {
            navigation.navigate('UploaderProfile', { userId: ownerId });
        }
    };

    const animateBeforeAfter = (toValue) => {
        Animated.timing(beforeAfterPosition, {
            toValue,
            duration: 300,
            useNativeDriver: true
        }).start();
    };

    const renderMediaContent = () => {
        console.log("Rendering media content, beforeAfterImages:", beforeAfterImages);

        if (beforeAfterImages && beforeAfterImages.before && beforeAfterImages.after) {
            return (
                <View style={styles.beforeAfterContainer}>
                    {/* Debug information */}
                    <Text style={styles.debugText}>
                        Before: {beforeAfterImages.before.substring(0, 30)}...
                        {'\n'}
                        After: {beforeAfterImages.after.substring(0, 30)}...
                    </Text>

                    {showBeforeAfter ? (
                        <>
                            {!imageErrors.before ? (
                                <Image 
                                    source={{ uri: beforeAfterImages.before }} 
                                    style={styles.beforeAfterImage}
                                    onError={() => {
                                        console.error('Failed to load before image:', beforeAfterImages.before);
                                        setImageErrors(prev => ({ ...prev, before: true }));
                                    }}
                                    onLoad={() => console.log('Before image loaded successfully')}
                                />
                            ) : (
                                <Text style={styles.errorText}>Failed to load before image</Text>
                            )}
                            
                            <Animated.View style={[
                                styles.afterImageContainer,
                                { transform: [{ translateX: beforeAfterPosition }] }
                            ]}>
                                {!imageErrors.after ? (
                                    <Image 
                                        source={{ uri: beforeAfterImages.after }} 
                                        style={styles.beforeAfterImage}
                                        onError={() => {
                                            console.error('Failed to load after image:', beforeAfterImages.after);
                                            setImageErrors(prev => ({ ...prev, after: true }));
                                        }}
                                        onLoad={() => console.log('After image loaded successfully')}
                                    />
                                ) : (
                                    <Text style={styles.errorText}>Failed to load after image</Text>
                                )}
                            </Animated.View>
                            
                            <View style={styles.sliderContainer}>
                                <TouchableOpacity 
                                    style={styles.sliderButton}
                                    onPress={() => animateBeforeAfter(0)}
                                >
                                    <Text style={styles.sliderText}>Before</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.sliderButton}
                                    onPress={() => animateBeforeAfter(-width * 0.75)}
                                >
                                    <Text style={styles.sliderText}>After</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <View style={styles.beforeAfterGallery}>
                            {!imageErrors.before ? (
                                <Image 
                                    source={{ uri: beforeAfterImages.before }} 
                                    style={styles.beforeAfterGalleryImage}
                                    onError={() => setImageErrors(prev => ({ ...prev, before: true }))}
                                />
                            ) : (
                                <Text style={styles.errorText}>Before Image Error</Text>
                            )}
                            {!imageErrors.after ? (
                                <Image 
                                    source={{ uri: beforeAfterImages.after }} 
                                    style={styles.beforeAfterGalleryImage}
                                    onError={() => setImageErrors(prev => ({ ...prev, after: true }))}
                                />
                            ) : (
                                <Text style={styles.errorText}>After Image Error</Text>
                            )}
                        </View>
                    )}
                </View>
            );
        }

        return (
            <>
                {videoUrl && (
                    <View style={styles.videoContainer}>
                        <Video
                            ref={videoRef}
                            source={{ uri: videoUrl }}
                            useNativeControls
                            resizeMode="contain"
                            style={styles.video}
                            onError={(e) => console.error('Video error:', e)}
                        />
                    </View>
                )}
                
                {imageList?.length > 0 && (
                    <View>
                        <ScrollView 
                            horizontal 
                            pagingEnabled
                            showsHorizontalScrollIndicator={false} 
                            style={styles.imageContainer}
                            onMomentumScrollEnd={(event) => {
                                const slideIndex = Math.floor(
                                    event.nativeEvent.contentOffset.x / (width * 0.8)
                                );
                                setCurrentImageIndex(slideIndex);
                            }}
                        >
                            {imageList.map((img, index) => (
                                <Image 
                                    key={index} 
                                    source={{ uri: img }} 
                                    style={[styles.postImage, { width: width * 0.8 }]} 
                                    onError={(e) => console.error('Image error:', e.nativeEvent.error)}
                                />
                            ))}
                        </ScrollView>
                        
                        {imageList.length > 1 && (
                            <View style={styles.paginationContainer}>
                                {imageList.map((_, index) => (
                                    <View 
                                        key={index} 
                                        style={[
                                            styles.paginationDot,
                                            currentImageIndex === index && styles.paginationDotActive
                                        ]} 
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </>
        );
    };

    const renderDocumentsModal = () => (
        <Modal
            visible={isDocumentsModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsDocumentsModalVisible(false)}
        >
            <View style={styles.modalContainer}>
                <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
                    <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                        Project Documents
                    </Text>
                    
                    <FlatList
                        data={[...documentUrls, ...certificates]}
                        keyExtractor={(item, index) => `doc-${index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.documentItem}
                                onPress={() => {
                                    navigation.navigate('DocumentViewer', { url: item.url });
                                    setIsDocumentsModalVisible(false);
                                }}
                            >
                                <MaterialIcons name="description" size={24} color={isDarkMode ? "#fff" : "#333"} />
                                <Text style={[styles.documentName, isDarkMode ? styles.darkText : styles.lightText]}>
                                    {item.name || "Document"}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                    
                    <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={() => setIsDocumentsModalVisible(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
    }

    return (
        <View style={[
            styles.postContainer, 
            isDarkMode ? styles.darkPostContainer : styles.lightPostContainer
        ]}>
            {/* User info section */}
            <TouchableOpacity style={styles.userInfo} onPress={navigateToUserProfile}>
                <Image 
                    source={{ uri: userImage || 'https://via.placeholder.com/40' }} 
                    style={styles.userImage} 
                />
                <View style={styles.userInfoText}>
                    <View style={styles.usernameContainer}>
                        <Text style={[styles.username, isDarkMode ? styles.darkText : styles.lightText]}>
                            {username}
                        </Text>
                        {isVerified && (
                            <MaterialIcons name="verified" size={16} color="#1DA1F2" style={styles.verifiedIcon} />
                        )}
                    </View>
                    <Text style={styles.uploadDate}>
                        {uploadDate?.seconds ? new Date(uploadDate.seconds * 1000).toLocaleDateString() : "Unknown date"}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Categories/Hashtags */}
            {categories.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
                    {categories.map((category, idx) => (
                        <TouchableOpacity 
                            key={idx} 
                            style={styles.categoryTag}
                            onPress={() => navigation.navigate('CategorySearch', { category })}
                        >
                            <Text style={styles.categoryText}>#{category}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* Caption */}
            {caption ? (
                <TouchableOpacity onPress={() => setShowFullCaption(!showFullCaption)}>
                    <Text style={[
                        styles.caption, 
                        isDarkMode ? styles.darkText : styles.lightText,
                        !showFullCaption && styles.captionTruncated
                    ]}>
                        {caption}
                    </Text>
                    {caption.length > 100 && !showFullCaption && (
                        <Text style={styles.readMore}>Read more</Text>
                    )}
                </TouchableOpacity>
            ) : null}
            
            {/* Project timeline and cost */}
            {(projectTimeline || projectCost) && (
                <View style={styles.projectInfoContainer}>
                    {projectTimeline && (
                        <View style={styles.projectInfoItem}>
                            <MaterialIcons name="schedule" size={16} color={isDarkMode ? "#aaa" : "#666"} />
                            <Text style={[styles.projectInfoText, isDarkMode ? styles.darkText : styles.lightText]}>
                                Timeline: {projectTimeline}
                            </Text>
                        </View>
                    )}
                    {projectCost && (
                        <View style={styles.projectInfoItem}>
                            <MaterialIcons name="attach-money" size={16} color={isDarkMode ? "#aaa" : "#666"} />
                            <Text style={[styles.projectInfoText, isDarkMode ? styles.darkText : styles.lightText]}>
                                Est. Cost: {projectCost}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Media content */}
            {renderMediaContent()}
            
            {/* Before/After toggle button */}
            {beforeAfterImages && (
                <TouchableOpacity 
                    style={styles.beforeAfterButton}
                    onPress={() => setShowBeforeAfter(!showBeforeAfter)}
                >
                    <MaterialCommunityIcons 
                        name="compare" 
                        size={18} 
                        color="#fff" 
                    />
                    <Text style={styles.beforeAfterButtonText}>
                        {showBeforeAfter ? "Show Gallery" : "Before & After"}
                    </Text>
                </TouchableOpacity>
            )}
            
            {/* Documents button */}
            {(documentUrls.length > 0 || certificates.length > 0) && (
                <TouchableOpacity 
                    style={styles.documentsButton}
                    onPress={() => setIsDocumentsModalVisible(true)}
                >
                    <MaterialIcons name="attach-file" size={18} color="#fff" />
                    <Text style={styles.documentsButtonText}>
                        View Documents ({documentUrls.length + certificates.length})
                    </Text>
                </TouchableOpacity>
            )}

            {/* Stats row */}
            <Text style={styles.statsText}>{likes} likes • {commentsCount} comments</Text>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                    <FontAwesome
                        name={isLiked ? "heart" : "heart-o"}
                        size={22}
                        color={isLiked ? "#e41e3f" : (isDarkMode ? "#fff" : "#000")}
                    />
                    <Text style={[styles.actionText, isDarkMode ? styles.darkText : styles.lightText]}>Like</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('CommentScreen', { postId })}
                >
                    <FontAwesome name="comment-o" size={22} color={isDarkMode ? "#fff" : "#000"} />
                    <Text style={[styles.actionText, isDarkMode ? styles.darkText : styles.lightText]}>Comment</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton} onPress={handleSavePost}>
                    <FontAwesome
                        name={isSaved ? "bookmark" : "bookmark-o"}
                        size={22}
                        color={isDarkMode ? "#fff" : "#000"}
                    />
                    <Text style={[styles.actionText, isDarkMode ? styles.darkText : styles.lightText]}>Save</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton} onPress={handleSharePost}>
                    <FontAwesome name="share" size={22} color={isDarkMode ? "#fff" : "#000"} />
                    <Text style={[styles.actionText, isDarkMode ? styles.darkText : styles.lightText]}>Share</Text>
                </TouchableOpacity>
            </View>
            
            {/* Pinned comment */}
            {pinnedComment && (
                <View style={styles.pinnedCommentContainer}>
                    <View style={styles.pinnedCommentHeader}>
                        <MaterialIcons name="push-pin" size={16} color={isDarkMode ? "#aaa" : "#666"} />
                        <Text style={styles.pinnedCommentLabel}>Pinned Comment</Text>
                    </View>
                    <Text style={[styles.pinnedCommentText, isDarkMode ? styles.darkText : styles.lightText]}>
                        <Text style={styles.pinnedCommentUser}>{pinnedComment.username}: </Text>
                        {pinnedComment.text}
                    </Text>
                </View>
            )}

            {/* Hire Now button */}
            <TouchableOpacity 
                style={styles.hireButton}
                onPress={handleHireNow}
            >
                <Text style={styles.hireButtonText}>Hire Now</Text>
            </TouchableOpacity>
            
            {/* Document modal */}
            {renderDocumentsModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    postContainer: { 
        padding: 15, 
        borderRadius: 12, 
        marginBottom: 20, 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    lightPostContainer: { backgroundColor: '#fff' },
    darkPostContainer: { backgroundColor: '#1e1e1e' },
    userInfo: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 12,
        padding: 5
    },
    userInfoText: {
        flex: 1,
    },
    usernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userImage: { width: 44, height: 44, borderRadius: 22, marginRight: 10 },
    username: { fontWeight: 'bold', fontSize: 16 },
    verifiedIcon: { marginLeft: 4 },
    uploadDate: { fontSize: 12, color: '#666' },
    categoriesContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    categoryTag: {
        backgroundColor: '#f2f2f2',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginRight: 6,
    },
    categoryText: {
        fontSize: 12,
        color: '#4a87d5',
    },
    caption: { marginTop: 5, fontSize: 15, lineHeight: 22 },
    captionTruncated: {
        maxHeight: 80,
        overflow: 'hidden',
    },
    readMore: {
        color: '#4a87d5',
        marginTop: 4,
        fontSize: 14,
    },
    lightText: { color: '#000' },
    darkText: { color: '#fff' },
    projectInfoContainer: {
        flexDirection: 'row',
        marginTop: 10,
        marginBottom: 10,
    },
    projectInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    projectInfoText: {
        fontSize: 13,
        marginLeft: 4,
    },
    imageContainer: { marginTop: 10 },
    postImage: { 
        height: 240, 
        borderRadius: 8, 
        marginRight: 10,
        marginTop: 5
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ccc',
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: '#007bff',
    },
    videoContainer: {
        height: 240,
        borderRadius: 8,
        marginTop: 10,
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    beforeAfterContainer: {
        position: 'relative',
        height: 240,
        marginTop: 10,
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: '#000',
    },
    beforeAfterImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    afterImageContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
    sliderContainer: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sliderButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
    },
    sliderText: {
        color: '#fff',
        fontSize: 12,
    },
    beforeAfterGallery: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    beforeAfterGalleryImage: {
        width: width * 0.38,
        height: 200,
        borderRadius: 8,
        resizeMode: 'cover',
    },
    beforeAfterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4a87d5',
        alignSelf: 'flex-start',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
        marginTop: 10,
    },
    beforeAfterButtonText: {
        color: '#fff',
        fontSize: 12,
        marginLeft: 4,
    },
    documentsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5c946e',
        alignSelf: 'flex-start',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
        marginTop: 10,
    },
    documentsButtonText: {
        color: '#fff',
        fontSize: 12,
        marginLeft: 4,
    },
    statsText: { 
        marginTop: 15, 
        paddingVertical: 10, 
        fontSize: 14,
        color: '#666'
    },
    actionButtons: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: 5,
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
    },
    pinnedCommentContainer: {
        marginTop: 15,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 8,
    },
    pinnedCommentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    pinnedCommentLabel: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    pinnedCommentText: {
        fontSize: 14,
    },
    pinnedCommentUser: {
        fontWeight: 'bold',
    },
    hireButton: {
        backgroundColor: '#e41e3f',
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 15,
        alignItems: 'center',
    },
    hireButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        borderRadius: 12,
        padding: 20,
        maxHeight: '70%',
    },
    lightModalContent: {
        backgroundColor: '#fff',
    },
    darkModalContent: {
        backgroundColor: '#1e1e1e',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    documentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    documentName: {
        marginLeft: 10,
        fontSize: 16,
    },
    closeButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 5,
        marginTop: 15,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    loader: { marginVertical: 20 },
    debugText: {
        color: '#fff',
        fontSize: 12,
        padding: 5,
        backgroundColor: 'rgba(0,0,0,0.7)',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
    },
    errorText: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
        padding: 20,
        backgroundColor: 'rgba(255,0,0,0.3)',
    }
});

export default Post;