import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useTheme } from '../../context/ThemeContext';
import { Linking } from 'react-native';
import { COLORS, styles } from '../../styles/shopstyles/OrderAddressMapStyles'; 

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyB4Nm99rBDcpjDkapSc8Z51zJZ5bOU7PI0';
if (!GOOGLE_API_KEY) {
  throw new Error('Google API Key is missing. Set GOOGLE_API_KEY in .env');
}

const INITIAL_DELTA = { latitudeDelta: 0.0922, longitudeDelta: 0.0421 };

const OrderAddressMap = ({ navigation, route }) => {
  const { isDarkMode } = useTheme();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState(''); // Stores human-readable address for UI
  const [isLoading, setIsLoading] = useState(true);
  const autocompleteRef = useRef();
  const watchSubscription = useRef(null);
  const themedStyles = styles(isDarkMode); // Generate dynamic styles

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) {
            Alert.alert(
              'Permission Denied',
              'Location access is required to select a delivery location. Please enable it in settings.',
              [
                { text: 'Cancel', onPress: () => navigation.goBack() },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
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
        if (mounted) watchSubscription.current = subscription;
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
      if (watchSubscription.current) {
        watchSubscription.current.remove();
      }
    };
  }, []);

  const handleLocationSelect = useCallback((data, details) => {
    const { lat, lng } = details.geometry.location;
    setSelectedLocation({ latitude: lat, longitude: lng });
    setLocationAddress(details.formatted_address || data.description); // Set human-readable address
    autocompleteRef.current?.blur();
  }, []);

  const handleMapPress = useCallback(async (event) => {
    const coords = event.nativeEvent.coordinate;
    setSelectedLocation(coords);

    // Reverse geocoding to get address
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setLocationAddress(data.results[0].formatted_address);
      } else {
        setLocationAddress('Unknown location');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setLocationAddress('Unable to fetch address');
    }
  }, []);

  const handleConfirmLocation = useCallback(async () => {
    const locationToUse = selectedLocation || currentLocation;
    if (!locationToUse) {
      Alert.alert('Error', 'Unable to determine location. Please try again.');
      return;
    }

    let addressString = locationAddress;
    if (!addressString && locationToUse) {
      // Fetch address if not already set
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${locationToUse.latitude},${locationToUse.longitude}&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          addressString = data.results[0].formatted_address;
        } else {
          addressString = 'Unknown location';
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        addressString = 'Unable to fetch address';
      }
      setLocationAddress(addressString);
    }

    const locationString = `${locationToUse.latitude.toFixed(6)}, ${locationToUse.longitude.toFixed(6)}`;
    navigation.goBack();
    route.params?.onLocationSelected?.({ coordinates: locationString, address: addressString });
  }, [selectedLocation, currentLocation, locationAddress, navigation, route.params]);

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
      <View style={themedStyles.searchContainer} pointerEvents="box-none">
        <GooglePlacesAutocomplete
          ref={autocompleteRef}
          placeholder="Search for a delivery location"
          fetchDetails={true}
          debounce={300}
          enablePoweredByContainer={false}
          onPress={handleLocationSelect}
          onFail={(error) => console.error('GooglePlacesAutocomplete error:', error)}
          query={{
            key: GOOGLE_API_KEY,
            language: 'en',
          }}
          styles={{
            container: {
              flex: 0,
              position: 'absolute',
              width: '100%',
              zIndex: 9999,
            },
            textInput: themedStyles.searchInput,
            listView: {
              backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
              zIndex: 9999,
            },
          }}
          textInputProps={{
            autoCorrect: false,
            autoCapitalize: 'none',
            accessibilityLabel: 'Search delivery location',
            accessibilityHint: 'Enter a place name to find it on the map',
          }}
          keyboardShouldPersistTaps="handled"
        />
      </View>
      <View style={themedStyles.addressContainer}>
        <TextInput
          style={themedStyles.addressInput}
          value={locationAddress}
          placeholder="Selected address"
          editable={false}
          accessibilityLabel="Selected delivery address"
          accessibilityRole="text"
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
        accessibilityLabel="Interactive map for selecting a delivery location"
        accessibilityRole="image"
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            pinColor="blue"
            accessibilityLabel="Your current location marker"
            accessibilityHint="Your current location on the map"
          />
        )}
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="Selected Delivery Location"
            pinColor="red"
            accessibilityLabel="Selected delivery location marker"
            accessibilityHint="Tap to view or change the selected location"
          />
        )}
      </MapView>
      <TouchableOpacity
        style={themedStyles.button}
        onPress={handleConfirmLocation}
        accessibilityLabel="Confirm selected delivery location"
        accessibilityRole="button"
      >
        <Text style={themedStyles.buttonText}>Confirm Location</Text>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(OrderAddressMap);