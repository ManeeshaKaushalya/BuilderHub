import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    SafeAreaView,
    Dimensions,
    Animated,
    Platform,
    Alert,
    Modal,
    TouchableWithoutFeedback
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { firestore, auth } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import Post from './posts/Posts';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import styles from '../styles/UploaderProfileStyles'; 

const { width } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'AIzaSyB4Nm99rBDcpjDkapSc8Z51zJZ5bOU7PI0'; // Replace with your actual API key

function UploaderProfile() {
    const route = useRoute();
    const navigation = useNavigation();
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
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const [showMenu, setShowMenu] = useState(false);
    const menuAnimation = useRef(new Animated.Value(0)).current;

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
                const unsubscribe = onSnapshot(
                    userDocRef,
                    (docSnap) => {
                        if (docSnap.exists()) {
                            const userData = docSnap.data();
                            setUserProfile({
                                id: profileId,
                                name: userData.name || 'Unknown User',
                                bio: userData.description || '',
                                profileImage: userData.profileImage || null,
                                ratings: userData.ratings || {},
                                profession: userData.profession || 'Professional',
                                location: userData.location || null,
                                website: userData.website || null,
                                skills: userData.skills ? (Array.isArray(userData.skills) ? userData.skills : [userData.skills]) : [],
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
                            setUserProfile(null);
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error('Error fetching user profile:', error);
                        setLoading(false);
                    }
                );

                return () => unsubscribe();
            } catch (error) {
                console.error('Error setting up profile listener:', error);
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
                    postsCount: posts.length
                }));
            } catch (error) {
                console.error('Error fetching user posts:', error);
                setStats((prevStats) => ({
                    ...prevStats,
                    postsCount: 0
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
                return;
            }

            if (currentUser && currentUser.uid === profileId) {
                setRouteCoordinates([]);
                setMapError(null);
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
    }, [currentLocation, userProfile, currentUser, profileId]);

    useEffect(() => {
        Animated.timing(ratingAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [ratingAnimation]);

    useEffect(() => {
        if (!currentUser || !profileId || currentUser.uid !== profileId) {
            setPendingOrdersCount(0);
            return;
        }

        const ordersRef = collection(firestore, 'item_orders');
        const q1 = query(
            ordersRef,
            where('itemOwnerId', '==', profileId),
            where('status', '==', 'pending')
        );
        const q2 = query(
            ordersRef,
            where('buyerId', '==', profileId),
            where('status', '==', 'pending')
        );

        const unsubscribe1 = onSnapshot(q1, (snapshot) => {
            const ownerPendingCount = snapshot.docs.length;
            setPendingOrdersCount((prev) => {
                const buyerPendingCount = prev - snapshot.docs.length;
                return ownerPendingCount + (buyerPendingCount >= 0 ? buyerPendingCount : 0);
            });
        }, (error) => {
            console.error('Error fetching pending owner orders:', error);
        });

        const unsubscribe2 = onSnapshot(q2, (snapshot) => {
            const buyerPendingCount = snapshot.docs.length;
            setPendingOrdersCount((prev) => {
                const ownerPendingCount = prev - snapshot.docs.length;
                return buyerPendingCount + (ownerPendingCount >= 0 ? ownerPendingCount : 0);
            });
        }, (error) => {
            console.error('Error fetching pending buyer orders:', error);
        });

        return () => {
            unsubscribe1();
            unsubscribe2();
        };
    }, [currentUser, profileId]);

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

    const handleHire = () => {
        navigation.navigate('HireUserScreen', { userId: profileId });
    };

    const handleLogout = () => {
        setShowMenu(false);
        Alert.alert(
            'Confirm Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await auth.signOut();
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        } catch (error) {
                            console.error('Error signing out:', error);
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const handleHelp = () => {
        setShowMenu(false);
        navigation.navigate('HelpScreen');
    };

    const toggleMenu = () => {
        if (currentUser && currentUser.uid === profileId) {
            setShowMenu(!showMenu);
            Animated.timing(menuAnimation, {
                toValue: showMenu ? 0 : 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    };

    const handleEditProfile = () => {
        navigation.navigate('EditProfileScreen', { userId: profileId });
    };

    const handleViewOrders = () => {
        navigation.navigate('OrdersScreen', { userId: profileId });
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
                        color={i <= rating ? "#FFC107" : "#aaa"}
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
                <ActivityIndicator size="large" color="#F4B018" />
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
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{userProfile.name}</Text>
                <TouchableOpacity style={styles.headerIconButton} onPress={toggleMenu}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="black" />
                </TouchableOpacity>
            </View>

            <Modal
                transparent={true}
                visible={showMenu}
                animationType="none"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
                    <View style={styles.modalOverlay}>
                        <Animated.View
                            style={[
                                styles.dropdownMenu,
                                {
                                    opacity: menuAnimation,
                                    transform: [
                                        {
                                            translateY: menuAnimation.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [-10, 0]
                                            })
                                        }
                                    ]
                                }
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={handleHelp}
                            >
                                <Ionicons
                                    name="help-circle-outline"
                                    size={18}
                                    color="#333"
                                    style={styles.dropdownIcon}
                                />
                                <Text style={styles.dropdownText}>Help</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={handleLogout}
                            >
                                <Ionicons
                                    name="log-out-outline"
                                    size={18}
                                    color="#D32F2F"
                                    style={styles.dropdownIcon}
                                />
                                <Text style={[styles.dropdownText, { color: '#D32F2F' }]}>Logout</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.coverContainer}>
                    <LinearGradient
                        colors={['#0288D1', '#4FC3F7', '#B3E5FC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.coverGradient}
                    >
                        <View style={styles.coverOverlay} />
                        <View style={styles.profileImageContainer}>
                            <View style={styles.profileImageWrapper}>
                                <Image
                                    source={{ uri: userProfile.profileImage || '../../assets/default-user.png' }}
                                    style={styles.profileImage}
                                    resizeMode="cover"
                                />
                            </View>
                            <View style={styles.onlineIndicator} />
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.profileInfoCard}>
                    <View style={styles.userInfoSection}>
                        <Text style={styles.nameText}>{userProfile.name}</Text>
                        <View style={styles.professionContainer}>
                            <MaterialCommunityIcons name="briefcase" size={16} color="#0288D1" />
                            <Text style={styles.professionText}>{userProfile.profession}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                            <Text style={styles.infoText}>
                                {userProfile.experience || 0} years of experience
                            </Text>
                        </View>

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
                                <MaterialCommunityIcons name="lightning-bolt" size={18} color="#0288D1" />
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
                                        color="#0288D1"
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {currentLocation && (
                        <View style={styles.mapContainer}>
                            <MapView
                                provider={PROVIDER_GOOGLE}
                                style={styles.map}
                                initialRegion={{
                                    latitude: currentLocation.latitude,
                                    longitude: currentLocation.longitude,
                                    latitudeDelta: 0.0922,
                                    longitudeDelta: 0.0421,
                                }}
                            >
                                {currentUser && currentUser.uid === profileId ? (
                                    <Marker
                                        coordinate={currentLocation}
                                        title="My Location"
                                        pinColor="#0288D1"
                                    />
                                ) : userLocation ? (
                                    <>
                                        <Marker
                                            coordinate={currentLocation}
                                            title="My Location"
                                            pinColor="#0288D1"
                                        />
                                        <Marker
                                            coordinate={userLocation}
                                            title={userProfile.name}
                                            pinColor="#FF0000"
                                        />
                                        {routeCoordinates.length > 0 && (
                                            <Polyline
                                                coordinates={routeCoordinates}
                                                strokeColor="#0288D1"
                                                strokeWidth={3}
                                            />
                                        )}
                                    </>
                                ) : null}
                            </MapView>
                            {mapError && (
                                <Text style={styles.mapErrorText}>{mapError}</Text>
                            )}
                        </View>
                    ) || (
                        <Text style={styles.mapErrorText}>Location data unavailable</Text>
                    )}

                    <Animated.View
                        style={[
                            styles.ratingCard,
                            {
                                opacity: ratingAnimation,
                                transform: [
                                    {
                                        scale: ratingAnimation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1]
                                        })
                                    }
                                ]
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['#E1F5FE', '#B3E5FC']}
                            style={styles.ratingGradient}
                        >
                            <View style={styles.ratingHeader}>
                                <MaterialCommunityIcons name="star-circle" size={22} color="#0288D1" />
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

                    {currentUser && (
                        <View style={
                            (userProfile.accountType === 'Shop' || userProfile.accountType === 'Company' || userProfile.accountType === 'Person') && currentUser.uid !== profileId
                                ? styles.actionButtonsContainerMulti
                                : styles.actionButtonsContainer
                        }>
                            {currentUser.uid !== profileId && (
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
                            )}

                            {userProfile.accountType === 'Shop' && currentUser.uid !== profileId && (
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

                            {(userProfile.accountType === 'Company' || userProfile.accountType === 'Person') && currentUser.uid !== profileId && (
                                <TouchableOpacity
                                    style={styles.hireButton}
                                    onPress={handleHire}
                                >
                                    <MaterialCommunityIcons
                                        name="briefcase-plus-outline"
                                        size={18}
                                        color="#fff"
                                        style={styles.buttonIcon}
                                    />
                                    <Text style={styles.hireButtonText}>Hire</Text>
                                </TouchableOpacity>
                            )}

                            {currentUser.uid === profileId && (
                                <>
                                    <View style={styles.buttonWithBadge}>
                                        <TouchableOpacity
                                            style={styles.ordersButton}
                                            onPress={handleViewOrders}
                                        >
                                            <MaterialCommunityIcons
                                                name="cart-outline"
                                                size={18}
                                                color="#fff"
                                                style={styles.buttonIcon}
                                            />
                                            <Text style={styles.ordersButtonText}>Your Orders</Text>
                                        </TouchableOpacity>
                                        {pendingOrdersCount > 0 && (
                                            <View style={styles.badge}>
                                                <Text style={styles.badgeText}>{pendingOrdersCount}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        style={styles.editProfileButton}
                                        onPress={handleEditProfile}
                                    >
                                        <Ionicons
                                            name="pencil-outline"
                                            size={18}
                                            color="#fff"
                                            style={styles.buttonIcon}
                                        />
                                        <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                                    </TouchableOpacity>
                                </>
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

export default UploaderProfile;