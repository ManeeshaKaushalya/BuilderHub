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
const GOOGLE_MAPS_API_KEY = 'AIzaSyB4Nm99rBDcpjDkapSc8Z51zJZ5bOU7PI0'; // Replace with your actual API key

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
    const [userRating, setUserRating] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);
    const [ratingAnimation] = useState(new Animated.Value(1));
    const [stats, setStats] = useState({
        postsCount: 0
    });
    const [currentLocation, setCurrentLocation] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [mapError, setMapError] = useState(null);
    const [showAllSkills, setShowAllSkills] = useState(false);

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
                        ratings: userData.ratings || {},
                        profession: userData.profession || 'Professional',
                        location: userData.location || null,
                        website: userData.website || null,
                        skills: userData.skills ? (typeof userData.skills === 'string' ? [userData.skills] : userData.skills) : [],
                        experience: userData.experience || [],
                        education: userData.education || [],
                        certifications: userData.certifications || [],
                        yearsOfExperience: userData.yearsOfExperience || 0,
                        accountType: userData.accountType || 'Person'
                    });

                    if (userData.ratings && userData.ratings.users && 
                        currentUser && userData.ratings.users[currentUser.uid]) {
                        setUserRating(userData.ratings.users[currentUser.uid]);
                    }

                    if (userData.ratings && userData.ratings.users) {
                        const ratings = Object.values(userData.ratings.users);
                        if (ratings.length > 0) {
                            const sum = ratings.reduce((a, b) => a + b, 0);
                            setAverageRating(sum / ratings.length);
                            setTotalRatings(ratings.length);
                        }
                    }
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
                            imageList: postData.imageList || [],
                            videoUrl: postData.videoUrl || null
                        };
                    })
                );

                posts.sort((a, b) => {
                    if (!a.timestamp || !b.timestamp) return 0;
                    return b.timestamp.seconds - a.timestamp.seconds;
                });

                setUserPosts(posts);
                setStats((prevStats) => ({
                    ...prevStats,
                    postsCount: posts.length // Update postsCount based on fetched posts
                }));
            } catch (error) {
                console.error('Error fetching user posts:', error);
                setStats((prevStats) => ({
                    ...prevStats,
                    postsCount: 0 // Fallback to 0 on error
                }));
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
                setRouteCoordinates([currentLocation, userLocation]);
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
                    setRouteCoordinates([currentLocation, userLocation]);
                }
            } catch (error) {
                console.error('Error fetching route:', error);
                setMapError('Failed to fetch route');
                setRouteCoordinates([currentLocation, userLocation]);
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

    const handleMakeOrder = () => {
        navigation.navigate('MakeOrderScreen', { userId: profileId });
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

    const toggleShowAllSkills = () => {
        setShowAllSkills(!showAllSkills);
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
                        <View style={styles.professionContainer}>
                            <MaterialCommunityIcons name="briefcase" size={16} color="#0095f6" />
                            <Text style={styles.professionText}>{userProfile.profession}</Text>
                            {userProfile.yearsOfExperience > 0 && (
                                <View style={styles.experienceTag}>
                                    <Text style={styles.experienceTagText}>
                                        {userProfile.yearsOfExperience}+ yrs exp
                                    </Text>
                                </View>
                            )}
                        </View>
                        
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

                    {userProfile.skills && Array.isArray(userProfile.skills) && userProfile.skills.length > 0 && (
                        <View style={styles.professionalSection}>
                            <View style={styles.sectionTitleRow}>
                                <MaterialCommunityIcons name="lightning-bolt" size={18} color="#0095f6" />
                                <Text style={styles.professionalSectionTitle}>Skills</Text>
                            </View>
                            <View style={styles.skillsContainer}>
                                {(showAllSkills ? userProfile.skills : userProfile.skills.slice(0, 5)).map((skill, index) => (
                                    <View key={index} style={styles.skillBadge}>
                                        <Text style={styles.skillText}>{skill}</Text>
                                    </View>
                                ))}
                            </View>
                            {userProfile.skills.length > 5 && (
                                <TouchableOpacity 
                                    style={styles.showMoreButton} 
                                    onPress={toggleShowAllSkills}
                                >
                                    <Text style={styles.showMoreText}>
                                        {showAllSkills 
                                            ? "Show Less" 
                                            : `Show All (${userProfile.skills.length})`}
                                    </Text>
                                    <Ionicons 
                                        name={showAllSkills ? "chevron-up" : "chevron-down"} 
                                        size={16} 
                                        color="#0095f6" 
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {userProfile.experience && Array.isArray(userProfile.experience) && userProfile.experience.length > 0 && (
                        <View style={styles.professionalSection}>
                            <View style={styles.sectionTitleRow}>
                                <MaterialIcons name="work" size={18} color="#0095f6" />
                                <Text style={styles.professionalSectionTitle}>Work Experience</Text>
                            </View>
                            <View style={styles.experienceContainer}>
                                {userProfile.experience.map((exp, index) => (
                                    <View key={index} style={styles.experienceItem}>
                                        {exp.companyLogo ? (
                                            <Image 
                                                source={{ uri: exp.companyLogo }} 
                                                style={styles.companyLogo} 
                                            />
                                        ) : (
                                            <View style={styles.companyLogoPlaceholder}>
                                                <MaterialIcons name="business" size={22} color="#666" />
                                            </View>
                                        )}
                                        <View style={styles.experienceDetails}>
                                            <Text style={styles.experienceRole}>{exp.role}</Text>
                                            <Text style={styles.experienceCompany}>{exp.company}</Text>
                                            <Text style={styles.experiencePeriod}>
                                                {exp.startDate} - {exp.endDate || 'Present'}
                                            </Text>
                                            {exp.description && (
                                                <Text style={styles.experienceDescription}>
                                                    {exp.description}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {((userProfile.education && Array.isArray(userProfile.education) && userProfile.education.length > 0) || 
                      (userProfile.certifications && Array.isArray(userProfile.certifications) && userProfile.certifications.length > 0)) ? (
                        <View style={styles.professionalSection}>
                            {userProfile.education && Array.isArray(userProfile.education) && userProfile.education.length > 0 && (
                                <>
                                    <View style={styles.sectionTitleRow}>
                                        <Ionicons name="school" size={18} color="#0095f6" />
                                        <Text style={styles.professionalSectionTitle}>Education</Text>
                                    </View>
                                    <View style={styles.educationContainer}>
                                        {userProfile.education.map((edu, index) => (
                                            <View key={index} style={styles.educationItem}>
                                                <Text style={styles.educationDegree}>{edu.degree}</Text>
                                                <Text style={styles.educationInstitution}>{edu.institution}</Text>
                                                <Text style={styles.educationYear}>{edu.year}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}

                            {userProfile.certifications && Array.isArray(userProfile.certifications) && userProfile.certifications.length > 0 && (
                                <>
                                    <View style={[styles.sectionTitleRow, {marginTop: 15}]}>
                                        <MaterialCommunityIcons name="certificate" size={18} color="#0095f6" />
                                        <Text style={styles.professionalSectionTitle}>Certifications</Text>
                                    </View>
                                    <View style={styles.certificationsContainer}>
                                        {userProfile.certifications.map((cert, index) => (
                                            <View key={index} style={styles.certificationItem}>
                                                <Text style={styles.certificationName}>{cert.name}</Text>
                                                <Text style={styles.certificationIssuer}>{cert.issuer}</Text>
                                                <Text style={styles.certificationDate}>{cert.date}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>
                    ) : null}

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
                                        {userRating > 0 ? 'Your Rating' : 'Rate This Professional'}
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
                    </View>

                    {currentUser && currentUser.uid !== profileId && (
                        <View style={
                            userProfile.accountType === 'Shop' 
                                ? styles.actionButtonsContainerShop 
                                : styles.actionButtonsContainer
                        }>
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

                            {userProfile.accountType === 'Shop' && (
                                <TouchableOpacity 
                                    style={styles.orderButton}
                                    onPress={handleMakeOrder}
                                >
                                    <MaterialCommunityIcons 
                                        name="cart-outline" 
                                        size={18} 
                                        color="#fff" 
                                        style={styles.buttonIcon}
                                    />
                                    <Text style={styles.orderButtonText}>Make Orders</Text>
                                </TouchableOpacity>
                            )}
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
                                imageList={post.imageList}
                                videoUrl={post.videoUrl}
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
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#ff3b30',
        marginBottom: 20,
    },
    backButtonFallback: {
        backgroundColor: '#0095f6',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    header: {
        backgroundColor: '#0095f6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    backButtonIcon: {
        padding: 5,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    headerIconButton: {
        padding: 5,
    },
    coverContainer: {
        height: 160,
        width: '100%',
    },
    coverGradient: {
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    profileImageContainer: {
        position: 'absolute',
        bottom: -50,
        alignItems: 'center',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#fff',
    },
    onlineIndicator: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#4CD964',
        borderWidth: 2,
        borderColor: '#fff',
        bottom: 12,
        right: 6,
    },
    profileInfoCard: {
        backgroundColor: '#fff',
        marginTop: 60,
        marginHorizontal: 12,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    userInfoSection: {
        alignItems: 'center',
        marginBottom: 16,
    },
    nameText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    professionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    professionText: {
        color: '#0095f6',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 5,
    },
    experienceTag: {
        backgroundColor: '#e4f2ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 8,
    },
    experienceTagText: {
        color: '#0095f6',
        fontSize: 12,
        fontWeight: '500',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    infoText: {
        color: '#666',
        fontSize: 14,
        marginLeft: 6,
    },
    bioText: {
        color: '#333',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
    },
    professionalSection: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    professionalSectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
        marginLeft: 6,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    skillBadge: {
        backgroundColor: '#e4f2ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    skillText: {
        color: '#0095f6',
        fontSize: 13,
        fontWeight: '500',
    },
    showMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    showMoreText: {
        color: '#0095f6',
        fontSize: 14,
        fontWeight: '500',
        marginRight: 4,
    },
    experienceContainer: {
        marginTop: 4,
    },
    experienceItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    companyLogo: {
        width: 40,
        height: 40,
        borderRadius: 8,
    },
    companyLogoPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#e4e8f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    experienceDetails: {
        marginLeft: 12,
        flex: 1,
    },
    experienceRole: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    experienceCompany: {
        fontSize: 14,
        color: '#444',
        marginTop: 2,
    },
    experiencePeriod: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    experienceDescription: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
        lineHeight: 18,
    },
    educationContainer: {
        marginTop: 4,
    },
    educationItem: {
        marginBottom: 12,
    },
    educationDegree: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    educationInstitution: {
        fontSize: 14,
        color: '#444',
        marginTop: 2,
    },
    educationYear: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    certificationsContainer: {
        marginTop: 4,
    },
    certificationItem: {
        marginBottom: 12,
    },
    certificationName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    certificationIssuer: {
        fontSize: 14,
        color: '#444',
        marginTop: 2,
    },
    certificationDate: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    mapContainer: {
        height: 200,
        marginTop: 20,
        borderRadius: 12,
        overflow: 'hidden',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    mapErrorText: {
        color: '#ff3b30',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
    },
    ratingCard: {
        marginTop: 20,
        borderRadius: 12,
        overflow: 'hidden',
    },
    ratingGradient: {
        padding: 16,
    },
    ratingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 6,
    },
    ratingValue: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    ratingNumber: {
        fontSize: 30,
        fontWeight: '700',
        color: '#333',
        marginRight: 12,
    },
    ratingStarsContainer: {
        flex: 1,
    },
    ratingStarsRow: {
        flexDirection: 'row',
    },
    ratingCount: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
    },
    userRatingContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    userRatingTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: '#444',
        marginBottom: 8,
    },
    userRatingStars: {
        flexDirection: 'row',
    },
    starContainer: {
        marginRight: 6,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    statLabel: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
    },
    actionButtonsContainerShop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        flexWrap: 'wrap',
    },
    messageButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#333',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 8,
    },
    messageButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    orderButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#28a745',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 8,
        marginTop: 8,
    },
    orderButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    buttonIcon: {
        marginRight: 6,
    },
    postsSection: {
        marginTop: 20,
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    seeAllButton: {
        padding: 4,
    },
    seeAllText: {
        color: '#0095f6',
        fontSize: 14,
        fontWeight: '500',
    },
    emptyPostsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
    },
    emptyPostsText: {
        fontSize: 16,
        color: '#999',
        marginTop: 12,
    },
});

export default UploaderProfile;