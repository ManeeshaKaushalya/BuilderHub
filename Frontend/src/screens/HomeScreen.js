import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Animated, Image } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../hooks/ThemeContext';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';

// Constants
const GOOGLE_API_KEY = 'AIzaSyBDEAmbHkQokLum169Nr4aY_FpIf80TuCE';
const DEFAULT_PROFILE_IMAGE = require('../../assets/default-profile.png');

const COLORS = {
  LIGHT_BG: '#fff',
  DARK_BG: '#1a1a1a',
  LIGHT_TEXT: '#333',
  DARK_TEXT: '#ddd',
  PRIMARY: '#007BFF',
  GRAY: '#666',
  LIGHT_GRAY: '#f9f9f9',
  DARK_GRAY: '#333',
};

const MAP_CONFIG = {
  INITIAL_DELTA: { latitudeDelta: 0.05, longitudeDelta: 0.05 },
  PULSE_DURATION: 2000,
  OUTER_PULSE: { start: 1000, end: 3000 }, // Outer circle in meters
  INNER_PULSE: { start: 0, end: 500 },    // Inner circle in meters
};

// Utility Functions
const parseLocation = (locationString) => {
  const [latitude, longitude] = locationString.split(',').map(coord => parseFloat(coord.trim()));
  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error(`Invalid location format: ${locationString}`);
  }
  return { latitude, longitude };
};

// Component
const HomeScreen = () => {
  const { isDarkMode } = useTheme();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userLocations, setUserLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [watchSubscription, setWatchSubscription] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(0));

  // Fetch user locations from Firestore
  const fetchUserLocations = () => {
    return onSnapshot(collection(firestore, 'users'), (snapshot) => {
      const locations = snapshot.docs
        .map(doc => {
          const data = doc.data();
          try {
            const { latitude, longitude } = parseLocation(data.location);
            return {
              id: doc.id,
              latitude,
              longitude,
              name: data.name || 'Anonymous',
              profession: data.profession || 'Unknown',
              profileImage: data.profileImage || null,
            };
          } catch (error) {
            console.warn(`Skipping user ${doc.id}: ${error.message}`);
            return null;
          }
        })
        .filter(location => location !== null);
      setUserLocations(locations);
    }, (error) => {
      console.error('Firestore fetch error:', error);
      Alert.alert('Error', 'Failed to fetch user locations.');
    });
  };

  // Request and watch device location
  const setupDeviceLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to show your location on the map.');
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 10 },
        (newLocation) => {
          setCurrentLocation({ latitude: newLocation.coords.latitude, longitude: newLocation.coords.longitude });
        }
      );
      setWatchSubscription(subscription);
    } catch (error) {
      console.error('Location setup error:', error);
      Alert.alert('Error', 'Failed to access location services.');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup effect
  useEffect(() => {
    let mounted = true;
    const unsubscribeFirestore = fetchUserLocations();
    setupDeviceLocation();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: MAP_CONFIG.PULSE_DURATION, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start();

    return () => {
      mounted = false;
      if (watchSubscription) watchSubscription.remove();
      unsubscribeFirestore();
    };
  }, [pulseAnim]);

  // Map styles and animations
  const mapStyle = isDarkMode ? [/* your dark mode styles */] : [];
  const themedStyles = styles(isDarkMode);

  const radius1 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [MAP_CONFIG.OUTER_PULSE.start, MAP_CONFIG.OUTER_PULSE.end] });
  const radius2 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [MAP_CONFIG.INNER_PULSE.start, MAP_CONFIG.INNER_PULSE.end] });
  const opacity1 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const opacity2 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] });
  const strokeColor1 = opacity1.interpolate({ inputRange: [0, 1], outputRange: ['rgba(65, 105, 225, 0.5)', 'rgba(65, 105, 225, 0)'] });
  const fillColor1 = opacity1.interpolate({ inputRange: [0, 1], outputRange: ['rgba(65, 105, 225, 0.25)', 'rgba(65, 105, 225, 0)'] });
  const strokeColor2 = opacity2.interpolate({ inputRange: [0, 1], outputRange: ['rgba(65, 105, 225, 0.3)', 'rgba(65, 105, 225, 0)'] });
  const fillColor2 = opacity2.interpolate({ inputRange: [0, 1], outputRange: ['rgba(65, 105, 225, 0.15)', 'rgba(65, 105, 225, 0)'] });

  // Loading state
  if (isLoading || !currentLocation) {
    return (
      <View style={themedStyles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={themedStyles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={themedStyles.map}
        customMapStyle={mapStyle}
        initialRegion={{ ...currentLocation, ...MAP_CONFIG.INITIAL_DELTA }}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        rotateEnabled
        accessibilityLabel="Interactive map showing your location and other users"
      >
        <Marker coordinate={currentLocation} title="My Location" description="You are here" pinColor={COLORS.PRIMARY} />
        <AnimatedCircle center={currentLocation} radius={radius1} strokeWidth={2} strokeColor={strokeColor1} fillColor={fillColor1} />
        <AnimatedCircle center={currentLocation} radius={radius2} strokeWidth={2} strokeColor={strokeColor2} fillColor={fillColor2} />

        {userLocations.map((user) => (
          <Marker
            key={user.id}
            coordinate={{ latitude: user.latitude, longitude: user.longitude }}
            title={user.name}
            description={`${user.profession} - Lat: ${user.latitude.toFixed(6)}, Lon: ${user.longitude.toFixed(6)}`}
          >
            <Image
              source={user.profileImage ? { uri: user.profileImage } : DEFAULT_PROFILE_IMAGE}
              style={themedStyles.profileMarker}
              onError={() => console.log(`Failed to load image for ${user.name}`)}
            />
          </Marker>
        ))}
      </MapView>

      <View style={themedStyles.infoContainer}>
        <Text style={themedStyles.infoText}>
          My Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
        </Text>
        <Text style={themedStyles.infoText}>Nearby Users: {userLocations.length}</Text>
        <Text style={themedStyles.signalText}>Signal broadcasting...</Text>
      </View>
    </View>
  );
};

// Animated Component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Styles
const styles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
    },
    map: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
    },
    infoContainer: {
      position: 'absolute',
      bottom: 20,
      alignSelf: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      width: '90%',
    },
    infoText: {
      color: '#fff',
      fontSize: 14,
      marginBottom: 5,
    },
    signalText: {
      color: '#fff',
      fontSize: 14,
      fontStyle: 'italic',
    },
    profileMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: '#fff',
    },
  });

export default HomeScreen;