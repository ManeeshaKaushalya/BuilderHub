import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    SafeAreaView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Post from './Posts';

function UploaderProfile() {
    const route = useRoute();
    const navigation = useNavigation();
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    // Get userId from route params or use current user id if not provided
    const { userId } = route.params || {};
    const profileId = userId || currentUser?.uid;
    
    const [userProfile, setUserProfile] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [stats, setStats] = useState({
        postsCount: 0,
        followersCount: 0,
        followingCount: 0
    });

    // Fetch user profile data
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                if (!profileId) {
                    setLoading(false);
                    return;
                }

                const userDocRef = doc(firestore, 'users', profileId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setUserProfile({
                        id: profileId,
                        name: userData.name || 'Unknown User',
                        bio: userData.bio || '',
                        profileImage: userData.profileImage || null,
                        followers: userData.followers || [],
                        following: userData.following || [],
                    });

                    // Check if current user is following this profile
                    if (currentUser) {
                        setIsFollowing(userData.followers?.includes(currentUser.uid) || false);
                    }

                    // Set stats
                    setStats({
                        postsCount: userData.postsCount || 0,
                        followersCount: userData.followers?.length || 0,
                        followingCount: userData.following?.length || 0
                    });
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
            }
        };

        fetchUserProfile();
    }, [profileId, currentUser]);

    // Fetch user posts
    useEffect(() => {
        const fetchUserPosts = async () => {
            try {
                if (!profileId) {
                    return;
                }

                const postsQuery = query(
                    collection(firestore, 'posts'),
                    where('uid', '==', profileId)
                );

                const querySnapshot = await getDocs(postsQuery);
                const posts = await Promise.all(
                    querySnapshot.docs.map(async (docSnapshot) => {
                        const postData = { id: docSnapshot.id, ...docSnapshot.data() };
                        return {
                            ...postData,
                            ownerName: userProfile?.name || 'Unknown User',
                            userImage: userProfile?.profileImage || null,
                        };
                    })
                );

                // Sort posts by timestamp (newest first)
                posts.sort((a, b) => {
                    if (!a.timestamp || !b.timestamp) return 0;
                    return b.timestamp.seconds - a.timestamp.seconds;
                });

                setUserPosts(posts);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching user posts:', error);
                setLoading(false);
            }
        };

        if (userProfile) {
            fetchUserPosts();
        }
    }, [profileId, userProfile]);

    const handleFollow = async () => {
        if (!currentUser || !profileId || currentUser.uid === profileId) return;

        try {
            const userRef = doc(firestore, 'users', profileId);
            const currentUserRef = doc(firestore, 'users', currentUser.uid);
            
            // Get user docs
            const userDoc = await getDoc(userRef);
            const currentUserDoc = await getDoc(currentUserRef);
            
            if (userDoc.exists() && currentUserDoc.exists()) {
                const userData = userDoc.data();
                const currentUserData = currentUserDoc.data();
                
                // Update followers/following lists
                if (isFollowing) {
                    // Unfollow
                    const updatedFollowers = (userData.followers || []).filter(
                        id => id !== currentUser.uid
                    );
                    const updatedFollowing = (currentUserData.following || []).filter(
                        id => id !== profileId
                    );
                    
                    await updateDoc(userRef, { followers: updatedFollowers });
                    await updateDoc(currentUserRef, { following: updatedFollowing });
                } else {
                    // Follow
                    const updatedFollowers = [...(userData.followers || []), currentUser.uid];
                    const updatedFollowing = [...(currentUserData.following || []), profileId];
                    
                    await updateDoc(userRef, { followers: updatedFollowers });
                    await updateDoc(currentUserRef, { following: updatedFollowing });
                }
                
                // Update UI state
                setIsFollowing(!isFollowing);
                setStats(prev => ({
                    ...prev,
                    followersCount: isFollowing 
                        ? prev.followersCount - 1 
                        : prev.followersCount + 1
                }));
            }
        } catch (error) {
            console.error('Error updating follow status:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (!userProfile) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>User not found</Text>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                {/* Header with back button */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{userProfile.name}</Text>
                    <View style={{ width: 24 }} /> {/* Empty view for spacing */}
                </View>

                {/* Profile Info */}
                <View style={styles.profileContainer}>
                    <Image 
                        source={{ uri: userProfile.profileImage || '../../assets/default-user.png' }} 
                        style={styles.profileImage} 
                    />
                    
                    <View style={styles.profileInfo}>
                        <Text style={styles.nameText}>{userProfile.name}</Text>
                        {userProfile.bio ? (
                            <Text style={styles.bioText}>{userProfile.bio}</Text>
                        ) : null}
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.postsCount}</Text>
                        <Text style={styles.statLabel}>Posts</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.followersCount}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.followingCount}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                </View>

                {/* Follow/Message Button Row */}
                {currentUser && currentUser.uid !== profileId && (
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity 
                            style={[
                                styles.followButton, 
                                isFollowing ? styles.followingButton : null
                            ]}
                            onPress={handleFollow}
                        >
                            <Text style={[
                                styles.followButtonText,
                                isFollowing ? styles.followingButtonText : null
                            ]}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.messageButton}
                            onPress={() => navigation.navigate('ChatScreen', { userId: profileId })}
                        >
                            <Text style={styles.messageButtonText}>Message</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Posts Section */}
                <View style={styles.postsSection}>
                    <Text style={styles.sectionTitle}>Posts</Text>
                    
                    {userPosts.length === 0 ? (
                        <View style={styles.emptyPostsContainer}>
                            <MaterialIcons name="post-add" size={50} color="#ccc" />
                            <Text style={styles.emptyPostsText}>No posts yet</Text>
                        </View>
                    ) : (
                        userPosts.map(post => (
                            <Post
                                key={post.id}
                                postId={post.id}
                                username={post.ownerName}
                                caption={post.caption}
                                imageList={post.imageUrls}
                                userImage={post.userImage}
                                uploadDate={post.timestamp}
                                ownerId={post.uid}
                                initialLikes={post.likes}
                            />
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    profileContainer: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 20,
    },
    profileInfo: {
        flex: 1,
    },
    nameText: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    bioText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 15,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    followButton: {
        flex: 1,
        backgroundColor: '#0095f6',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginRight: 10,
    },
    followingButton: {
        backgroundColor: '#eee',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    followButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    followingButtonText: {
        color: '#333',
    },
    messageButton: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    messageButtonText: {
        color: '#333',
        fontWeight: 'bold',
    },
    postsSection: {
        padding: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    emptyPostsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyPostsText: {
        fontSize: 16,
        color: '#888',
        marginTop: 10,
    },
    backButton: {
        padding: 5,
    },
    backButtonText: {
        color: '#0095f6',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default UploaderProfile;