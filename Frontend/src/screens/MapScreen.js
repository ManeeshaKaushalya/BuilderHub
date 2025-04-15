import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useTheme } from '../context/ThemeContext'; // Custom hook

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyB4Nm99rBDcpjDkapSc8Z51zJZ5bOU7PI0';
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
const INITIAL_DELTA = { latitudeDelta: 0.0922, longitudeDelta: 0.0421 };
const REGISTRATION_TYPES = ['user', 'shop', 'company'];

const MapScreen = ({ navigation, route }) => {
  const { isDarkMode } = useTheme();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [watchSubscription, setWatchSubscription] = useState(null);
  const autocompleteRef = useRef();
  const registrationType = route?.params?.registrationType || 'user';

  useEffect(() => {
    if (!REGISTRATION_TYPES.includes(registrationType)) {
      console.warn('Invalid registration type:', registrationType);
      navigation.goBack();
    }
  }, [registrationType, navigation]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) {
            Alert.alert(
              'Permission Denied',
              'Location access is required to select a location. Please enable it in settings.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
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
          Alert.alert('Error', 'Failed to access location. Please try again.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (watchSubscription) watchSubscription.remove();
    };
  }, [watchSubscription]);

  const handleLocationSelect = useCallback((data, details) => {
    const { lat, lng } = details.geometry.location;
    setSelectedLocation({ latitude: lat, longitude: lng });

    // Hide suggestions
    autocompleteRef.current?.blur();
  }, []);

  const handleMapPress = useCallback((event) => {
    setSelectedLocation(event.nativeEvent.coordinate);
  }, []);

  const handleConfirmLocation = useCallback(() => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please select a location on the map or via search.');
      return;
    }

    const locationString = `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`;
    const targetScreen = {
      user: 'UserRegister',
      shop: 'ShopRegister',
      company: 'CompanyRegister',
    }[registrationType] || 'UserRegister';

    navigation.navigate(targetScreen, { location: locationString });
  }, [selectedLocation, registrationType, navigation]);

  const themedStyles = styles(isDarkMode);

  if (isLoading || !currentLocation) {
    return (
      <View style={themedStyles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={themedStyles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.searchContainer}>
        <GooglePlacesAutocomplete
          ref={autocompleteRef}
          placeholder="Search for a place"
          fetchDetails={true}
          onPress={handleLocationSelect}
          onFail={(error) => console.log('GooglePlacesAutocomplete error:', error)}
          query={{
            key: GOOGLE_API_KEY,
            language: 'en',
          }}
          styles={{
            container: {
              zIndex: 9999,
            },
            textInput: themedStyles.searchInput,
            listView: {
              backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
              zIndex: 9999,
            },
          }}
          textInputProps={{
            accessibilityLabel: 'Search location',
            accessibilityHint: 'Enter a place name to find it on the map',
          }}
        />
      </View>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={themedStyles.map}
        initialRegion={{ ...currentLocation, ...INITIAL_DELTA }}
        region={selectedLocation ? { ...selectedLocation, ...INITIAL_DELTA } : undefined}
        showsUserLocation
        showsMyLocationButton
        onPress={handleMapPress}
        accessibilityLabel="Interactive map"
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            pinColor="blue"
          />
        )}
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="Selected Location"
            pinColor="red"
          />
        )}
      </MapView>

      <TouchableOpacity
        style={themedStyles.button}
        onPress={handleConfirmLocation}
        accessibilityLabel="Confirm selected location"
      >
        <Text style={themedStyles.buttonText}>Confirm Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
    },
    searchContainer: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      width: '90%',
      alignSelf: 'center',
      zIndex: 9999,
    },
    searchInput: {
      backgroundColor: isDarkMode ? COLORS.DARK_GRAY : COLORS.LIGHT_BG,
      height: 50,
      borderRadius: 10,
      paddingLeft: 15,
      fontSize: 16,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
      borderWidth: 1,
      borderColor: isDarkMode ? '#444' : COLORS.GRAY,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    map: {
      flex: 1,
      zIndex: 0,
    },
    button: {
      position: 'absolute',
      bottom: 20,
      alignSelf: 'center',
      backgroundColor: COLORS.PRIMARY,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 10,
      width: '90%',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 0,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
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
  });

export default React.memo(MapScreen);
