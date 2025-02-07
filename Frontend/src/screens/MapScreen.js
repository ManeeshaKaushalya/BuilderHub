import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const GOOGLE_API_KEY = 'AIzaSyBDEAmbHkQokLum169Nr4aY_FpIf80TuCE';

const MapScreen = ({ navigation, route }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const registrationType = route.params?.registrationType || 'user';

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  const handleLocationSelect = (data, details) => {
    const { lat, lng } = details.geometry.location;
    setSelectedLocation({
      latitude: lat,
      longitude: lng,
    });
  };

  const handleSelectLocation = (event) => {
    setSelectedLocation(event.nativeEvent.coordinate);
  };

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      const locationString = `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`;
      
      // Navigate back to the appropriate registration screen based on registrationType
      switch (registrationType) {
        case 'shop':
          navigation.navigate('ShopRegister', { location: locationString });
          break;
        case 'company':
          navigation.navigate('CompanyRegister', { location: locationString });
          break;
        case 'user':
          navigation.navigate('UserRegister', { location: locationString });
          break;
        default:
          console.warn('Unknown registration type:', registrationType);
          navigation.goBack();
      }
    } else {
      alert('Please select a location');
    }
  };

  if (!currentLocation) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          placeholder="Search for a location"
          onPress={handleLocationSelect}
          query={{
            key: GOOGLE_API_KEY,
            language: 'en',
          }}
          styles={{
            textInput: styles.searchInput,
          }}
        />
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          ...currentLocation,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={handleSelectLocation}
      >
        {selectedLocation && (
          <Marker coordinate={selectedLocation} />
        )}
      </MapView>

      <TouchableOpacity
        style={styles.button}
        onPress={handleConfirmLocation}
      >
        <Text style={styles.buttonText}>Confirm Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 40,
    width: '90%',
    alignSelf: 'center',
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 10,
    paddingLeft: 15,
    fontSize: 16,
  },
  map: {
    flex: 1,
  },
  button: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default MapScreen;