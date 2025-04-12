import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    SafeAreaView,
    Dimensions,
    Animated,
    Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Post from './Posts';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'AIzaSyBDEAmbHkQokLum169Nr4aY_FpIf80TuCE'; // Replace with your actual API key

function UploaderProfile() {
    const route = useRoute();
    const navigation = useNavigation();
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    const { userId } = route.params || {};
    const profileId = userId;
    
    const [userProfile, setUserProfile] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);
    const [ratingAnimation] = useState(new Animated.Value(1));
    const [stats, setStats] = useState({
        postsCount: 0,
        followersCount: 0,
        followingCount: 0
    });
    const [currentLocation, setCurrentLocation] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [mapError, setMapError] = useState(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                if (!profileId) {
                    console.log('No profileId provided');
                    setLoading(false);
                    return;
                }

                console.log('Fetching profile for userId:', profileId);

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
                        ratings: userData.ratings || {},
                        profession: userData.profession || 'Creator',
                        location: userData.location || null,
                        website: userData.website || null,
                    });

                    if (currentUser) {
                        setIsFollowing(userData.followers?.includes(currentUser.uid) || false);
                        if (userData.ratings && userData.ratings.users && 
                            userData.ratings.users[currentUser.uid]) {
                            setUserRating(userData.ratings.users[currentUser.uid]);
                        }
                    }

                    if (userData.ratings && userData.ratings.users) {
                        const ratings = Object.values(userData.ratings.users);
                        if (ratings.length > 0) {
                            const sum = ratings.reduce((a, b) => a + b, 0);
                            setAverageRating(sum / ratings.length);
                            setTotalRatings(ratings.length);
                        }
                    }

                    setStats({
                        postsCount: userData.postsCount || 0,
                        followersCount: userData.followers?.length || 0,
                        followingCount: userData.following?.length || 0
                    });
                } else {
                    console.log('User document does not exist for ID:', profileId);
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
            } finally {
                setLoading(false);
            }
        };

        const getCurrentLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                    setCurrentLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    });
                } else {
                    setMapError('Location permission denied');
                }
            } catch (error) {
                console.error('Error getting current location:', error);
                setMapError('Failed to get current location');
            }
        };

        fetchUserProfile();
        getCurrentLocation();
    }, [profileId, currentUser]);

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

                posts.sort((a, b) => {
                    if (!a.timestamp || !b.timestamp) return 0;
                    return b.timestamp.seconds - a.timestamp.seconds;
                });

                setUserPosts(posts);
            } catch (error) {
                console.error('Error fetching user posts:', error);
            }
        };

        if (userProfile) {
            fetchUserPosts();
        }
    }, [profileId, userProfile]);

    useEffect(() => {
        const fetchRoute = async () => {
            if (!currentLocation || !userProfile?.location) return;

            const userLocation = parseLocationString(userProfile.location);
            if (!userLocation) {
                setMapError('Invalid user location');
                setRouteCoordinates([currentLocation, userLocation]); // Straight line fallback
                return;
            }

            try {
                const url = `https://maps.googleapis.com/maps/api/directions/json?` +
                    `origin=${currentLocation.latitude},${currentLocation.longitude}` +
                    `&destination=${userLocation.latitude},${userLocation.longitude}` +
                    `&key=${GOOGLE_MAPS_API_KEY}`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.status === 'OK' && data.routes.length) {
                    const points = decodePolyline(data.routes[0].overview_polyline.points);
                    setRouteCoordinates(points);
                    setMapError(null);
                } else {
                    console.warn('No route found:', data.status);
                    setMapError('No route found');
                    setRouteCoordinates([currentLocation, userLocation]); // Straight line fallback
                }
            } catch (error) {
                console.error('Error fetching route:', error);
                setMapError('Failed to fetch route');
                setRouteCoordinates([currentLocation, userLocation]); // Straight line fallback
            }
        };

        fetchRoute();
    }, [currentLocation, userProfile]);

    useEffect(() => {
        Animated.timing(ratingAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [ratingAnimation]);

    const handleFollow = async () => {
        if (!currentUser || !profileId || currentUser.uid === profileId) return;

        try {
            const userRef = doc(firestore, 'users', profileId);
            const currentUserRef = doc(firestore, 'users', currentUser.uid);
            
            const userDoc = await getDoc(userRef);
            const currentUserDoc = await getDoc(currentUserRef);
            
            if (userDoc.exists() && currentUserDoc.exists()) {
                const userData = userDoc.data();
                const currentUserData = currentUserDoc.data();
                
                if (isFollowing) {
                    const updatedFollowers = (userData.followers || []).filter(
                        id => id !== currentUser.uid
                    );
                    const updatedFollowing = (currentUserData.following || []).filter(
                        id => id !== profileId
                    );
                    
                    await updateDoc(userRef, { followers: updatedFollowers });
                    await updateDoc(currentUserRef, { following: updatedFollowing });
                } else {
                    const updatedFollowers = [...(userData.followers || []), currentUser.uid];
                    const updatedFollowing = [...(currentUserData.following || []), profileId];
                    
                    await updateDoc(userRef, { followers: updatedFollowers });
                    await updateDoc(currentUserRef, { following: updatedFollowing });
                }
                
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

    const handleRating = async (rating) => {
        if (!currentUser || !profileId || currentUser.uid === profileId) return;

        try {
            const userRef = doc(firestore, 'users', profileId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const ratings = userData.ratings || { users: {} };
                
                ratings.users = {
                    ...ratings.users,
                    [currentUser.uid]: rating
                };
                
                const ratingValues = Object.values(ratings.users);
                const newAverage = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
                
                await updateDoc(userRef, { 
                    ratings: ratings,
                    averageRating: newAverage 
                });
                
                setUserRating(rating);
                setAverageRating(newAverage);
                setTotalRatings(ratingValues.length);
                
                Animated.sequence([
                    Animated.timing(ratingAnimation, {
                        toValue: 0.8,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(ratingAnimation, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    })
                ]).start();
            }
        } catch (error) {
            console.error('Error updating rating:', error);
        }
    };

    const parseLocationString = (locationString) => {
        if (!locationString) return null;
        const [latitude, longitude] = locationString.split(',').map(coord => parseFloat(coord.trim()));
        if (isNaN(latitude) || isNaN(longitude)) return null;
        return { latitude, longitude };
    };

    const decodePolyline = (encoded) => {
        let points = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.push({
                latitude: lat / 1e5,
                longitude: lng / 1e5
            });
        }
        return points;
    };

    const renderStars = (rating, onRatingPress, size = 24) => {
        const stars = [];
        const maxStars = 5;
        
        for (let i = 1; i <= maxStars; i++) {
            stars.push(
                <TouchableOpacity 
                    key={i} 
                    onPress={() => onRatingPress && onRatingPress(i)}
                    style={styles.starContainer}
                    activeOpacity={onRatingPress ? 0.6 : 1}
                >
                    <FontAwesome 
                        name={i <= rating ? "star" : "star-o"} 
                        size={size} 
                        color={i <= rating ? "#FFD700" : "#aaa"} 
                    />
                </TouchableOpacity>
            );
        }
        
        return stars;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0095f6" />
            </View>
        );
    }

    if (!userProfile) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>User not found</Text>
                <TouchableOpacity 
                    style={styles.backButtonFallback}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const userLocation = parseLocationString(userProfile.location);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonIcon}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{userProfile.name}</Text>
                <TouchableOpacity style={styles.headerIconButton}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.coverContainer}>
                    <LinearGradient
                        colors={['#4c669f', '#3b5998', '#192f6a']}
                        style={styles.coverGradient}
                    >
                        <View style={styles.profileImageContainer}>
                            <Image 
                                source={{ uri: userProfile.profileImage || '../../assets/default-user.png' }} 
                                style={styles.profileImage} 
                                resizeMode="cover"
                            />
                            <View style={styles.onlineIndicator} />
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.profileInfoCard}>
                    <View style={styles.userInfoSection}>
                        <Text style={styles.nameText}>{userProfile.name}</Text>
                        <Text style={styles.professionText}>{userProfile.profession}</Text>
                        
                        {userProfile.location && (
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={16} color="#666" />
                                <Text style={styles.infoText}>{userProfile.location}</Text>
                            </View>
                        )}
                        
                        {userProfile.website && (
                            <View style={styles.infoRow}>
                                <Ionicons name="globe-outline" size={16} color="#666" />
                                <Text style={styles.infoText}>{userProfile.website}</Text>
                            </View>
                        )}
                        
                        {userProfile.bio ? (
                            <Text style={styles.bioText}>{userProfile.bio}</Text>
                        ) : null}
                    </View>

                    {currentLocation && userLocation ? (
                        <View style={styles.mapContainer}>
                            <MapView
                                provider={PROVIDER_GOOGLE}
                                style={styles.map}
                                initialRegion={{
                                    latitude: (currentLocation.latitude + userLocation.latitude) / 2,
                                    longitude: (currentLocation.longitude + userLocation.longitude) / 2,
                                    latitudeDelta: Math.abs(currentLocation.latitude - userLocation.latitude) * 1.5,
                                    longitudeDelta: Math.abs(currentLocation.longitude - userLocation.longitude) * 1.5,
                                }}
                            >
                                <Marker
                                    coordinate={currentLocation}
                                    title="My Location"
                                    pinColor="#007BFF"
                                />
                                <Marker
                                    coordinate={userLocation}
                                    title={userProfile.name}
                                    pinColor="#FF0000"
                                />
                                {routeCoordinates.length > 0 && (
                                    <Polyline
                                        coordinates={routeCoordinates}
                                        strokeColor="#007BFF"
                                        strokeWidth={3}
                                    />
                                )}
                            </MapView>
                            {mapError && (
                                <Text style={styles.mapErrorText}>{mapError}</Text>
                            )}
                        </View>
                    ) : (
                        <Text style={styles.mapErrorText}>Location data unavailable</Text>
                    )}

                    <Animated.View 
                        style={[
                            styles.ratingCard,
                            {
                                opacity: ratingAnimation,
                                transform: [
                                    { scale: ratingAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1]
                                    }) }
                                ]
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['#f5f7fa', '#e4e8f0']}
                            style={styles.ratingGradient}
                        >
                            <View style={styles.ratingHeader}>
                                <MaterialCommunityIcons name="star-circle" size={22} color="#FFB400" />
                                <Text style={styles.ratingTitle}>Reputation Score</Text>
                            </View>
                            
                            <View style={styles.ratingValue}>
                                <Text style={styles.ratingNumber}>
                                    {totalRatings > 0 ? averageRating.toFixed(1) : '0.0'}
                                </Text>
                                <View style={styles.ratingStarsContainer}>
                                    <View style={styles.ratingStarsRow}>
                                        {renderStars(averageRating, null, 18)}
                                    </View>
                                    <Text style={styles.ratingCount}>
                                        {totalRatings} {totalRatings === 1 ? 'review' : 'reviews'}
                                    </Text>
                                </View>
                            </View>
                            
                            {currentUser && currentUser.uid !== profileId && (
                                <View style={styles.userRatingContainer}>
                                    <Text style={styles.userRatingTitle}>
                                        {userRating > 0 ? 'Your Rating' : 'Rate This Profile'}
                                    </Text>
                                    <View style={styles.userRatingStars}>
                                        {renderStars(userRating, handleRating, 26)}
                                    </View>
                                </View>
                            )}
                        </LinearGradient>
                    </Animated.View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{stats.postsCount}</Text>
                            <Text style={styles.statLabel}>Posts</Text>
                        </View>
                        <View style={[styles.statItem, styles.statDivider]}>
                            <Text style={styles.statNumber}>{stats.followersCount}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{stats.followingCount}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                    </View>

                    {currentUser && currentUser.uid !== profileId && (
                        <View style={styles.actionButtonsContainer}>
                            <TouchableOpacity 
                                style={[
                                    styles.followButton, 
                                    isFollowing ? styles.followingButton : null
                                ]}
                                onPress={handleFollow}
                            >
                                <Ionicons 
                                    name={isFollowing ? "checkmark-circle" : "person-add"} 
                                    size={18} 
                                    color={isFollowing ? "#0095f6" : "#fff"} 
                                    style={styles.buttonIcon}
                                />
                                <Text style={[
                                    styles.followButtonText,
                                    isFollowing ? styles.followingButtonText : null
                                ]}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.messageButton}
                                onPress={() => navigation.navigate('WorkerChatScreen', { userId: profileId })}
                            >
                                <Ionicons 
                                    name="chatbubble-ellipses-outline" 
                                    size={18} 
                                    color="#fff" 
                                    style={styles.buttonIcon}
                                />
                                <Text style={styles.messageButtonText}>Message</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.postsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Posts</Text>
                        <TouchableOpacity style={styles.seeAllButton}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    
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
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#192f6a',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerIconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonIcon: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverContainer: {
        width: '100%',
        height: 200,
    },
    coverGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    profileImageContainer: {
        width: 120,
        height: 120,
        marginBottom: -60,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#fff',
        overflow: 'hidden',
        backgroundColor: '#fff',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    onlineIndicator: {
        position: 'absolute',
        width: 20,
        height: 20,
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        bottom: 0,
        right: 0,
        borderWidth: 3,
        borderColor: '#fff',
    },
    profileInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginTop: 70,
        marginHorizontal: 15,
        paddingTop: 60,
        paddingBottom: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    userInfoSection: {
        paddingHorizontal: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    nameText: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    professionText: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    infoText: {
        marginLeft: 5,
        fontSize: 14,
        color: '#666',
    },
    bioText: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
        marginTop: 15,
        lineHeight: 20,
    },
    mapContainer: {
        marginHorizontal: 15,
        marginBottom: 20,
        width: width - 60,
        height: width - 60,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapErrorText: {
        textAlign: 'center',
        color: '#FF0000',
        fontSize: 14,
        marginTop: 5,
    },
    ratingCard: {
        marginHorizontal: 15,
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    ratingGradient: {
        padding: 15,
        borderRadius: 12,
    },
    ratingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    ratingTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
        color: '#333',
    },
    ratingValue: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    ratingNumber: {
        fontSize: 36,
        fontWeight: 'bold',
        marginRight: 15,
        color: '#333',
    },
    ratingStarsContainer: {
        flex: 1,
    },
    ratingStarsRow: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    ratingCount: {
        fontSize: 12,
        color: '#666',
    },
    userRatingContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    userRatingTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#555',
    },
    userRatingStars: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    starContainer: {
        padding: 3,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        marginBottom: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#f0f0f0',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    followButton: {
        flex: 1,
        backgroundColor: '#0095f6',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginRight: 10,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    followingButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#0095f6',
    },
    followButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    followingButtonText: {
        color: '#0095f6',
    },
    messageButton: {
        flex: 1,
        backgroundColor: '#0095f6',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    messageButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    buttonIcon: {
        marginRight: 6,
    },
    postsSection: {
        marginTop: 20,
        marginBottom: 30,
        backgroundColor: '#fff',
        borderRadius: 15,
        paddingVertical: 15,
        marginHorizontal: 15,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    seeAllButton: {
        padding: 5,
    },
    seeAllText: {
        color: '#0095f6',
        fontWeight: '600',
    },
    emptyPostsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyPostsText: {
        marginTop: 10,
        color: '#999',
        fontSize: 16,
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
    backButtonFallback: {
        backgroundColor: '#0095f6',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default UploaderProfile;