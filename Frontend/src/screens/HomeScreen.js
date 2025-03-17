import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Animated } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../hooks/ThemeContext';

// Constants
const GOOGLE_API_KEY = 'AIzaSyBDEAmbHkQokLum169Nr4aY_FpIf80TuCE';
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
const INITIAL_DELTA = { latitudeDelta: 0.005, longitudeDelta: 0.005 };

const HomeScreen = () => {
  const { isDarkMode } = useTheme();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [watchSubscription, setWatchSubscription] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    let mounted = true;

    const getLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) {
            Alert.alert(
              'Permission Denied',
              'Location access is required to show your location on the map.'
            );
          }
          setIsLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        if (mounted) {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 10,
          },
          (newLocation) => {
            if (mounted) {
              setCurrentLocation({
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
              });
            }
          }
        );
        
        if (mounted) setWatchSubscription(subscription);
      } catch (error) {
        if (mounted) {
          console.error('Location error:', error);
          Alert.alert('Error', 'Failed to access location services.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    getLocationPermission();

    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();

    return () => {
      mounted = false;
      if (watchSubscription) watchSubscription.remove();
    };
  }, [pulseAnim]);

  // Map style for dark mode
  const mapStyle = isDarkMode ? [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#746855" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#38414e" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#17263c" }]
    }
  ] : [];

  const themedStyles = styles(isDarkMode);

  // Interpolate animation values
  const radius1 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 300],
  });

  const radius2 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 250],
  });

  const opacity1 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  const opacity2 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0],
  });

  // Convert opacity to rgba string
  const strokeColor1 = opacity1.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(65, 105, 225, 0.5)', 'rgba(65, 105, 225, 0)'],
  });

  const fillColor1 = opacity1.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(65, 105, 225, 0.25)', 'rgba(65, 105, 225, 0)'],
  });

  const strokeColor2 = opacity2.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(65, 105, 225, 0.3)', 'rgba(65, 105, 225, 0)'],
  });

  const fillColor2 = opacity2.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(65, 105, 225, 0.15)', 'rgba(65, 105, 225, 0)'],
  });

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
        initialRegion={{ ...currentLocation, ...INITIAL_DELTA }}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        rotateEnabled
        accessibilityLabel="Interactive map showing your location"
      >
        <Marker
          coordinate={currentLocation}
          title="My Location"
          description="You are here"
        />
        
        <AnimatedCircle
          center={currentLocation}
          radius={radius1}
          strokeWidth={2}
          strokeColor={strokeColor1}
          fillColor={fillColor1}
        />
        <AnimatedCircle
          center={currentLocation}
          radius={radius2}
          strokeWidth={2}
          strokeColor={strokeColor2}
          fillColor={fillColor2}
        />
      </MapView>
      
      <View style={themedStyles.infoContainer}>
        <Text style={themedStyles.infoText}>
          Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
        </Text>
        <Text style={themedStyles.signalText}>Signal broadcasting...</Text>
      </View>
    </View>
  );
};

// Custom Animated Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
    }
  });

export default HomeScreen;