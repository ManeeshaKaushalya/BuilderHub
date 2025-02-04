import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet,Button,Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Your Google API Key (store in .env for security)
const GOOGLE_API_KEY = 'AIzaSyBDEAmbHkQokLum169Nr4aY_FpIf80TuCE';

const MapScreen = ({ navigation }) => {
  const [selectedLocation, setSelectedLocation] = useState(null); // Selected location
  const [currentLocation, setCurrentLocation] = useState(null); // Current location of the user

  // Fetch current location when the component mounts
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

  // Function to handle selection from Google Places Autocomplete search
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
      const locationName = `Lat: ${selectedLocation.latitude}, Lng: ${selectedLocation.longitude}`;
      navigation.navigate('UserRegister', { location: locationName });
    } else {
      alert('Please select a location');
    }
  };
  

  if (!currentLocation) {
    // If the location is not yet fetched, show a loading indicator
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Google Places Autocomplete */}
      <GooglePlacesAutocomplete
        placeholder="Search for a location"
        fetchDetails={true}
        onPress={handleLocationSelect} // Update location when user selects from the list
        query={{
          key: GOOGLE_API_KEY,
          language: 'en',
          types: 'geocode', // restricts results to addresses only
        }}
        enablePoweredByContainer={false}
        styles={{
          textInput: styles.searchInput,
          container: styles.searchContainer,
        }}
      />

      {/* Map View */}
      <MapView
        style={styles.map}
        region={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={handleSelectLocation} // Allow map press to set location
        showsUserLocation={true} // Show the user's location on the map
        followUserLocation={true} // Follow user's location while moving
      >
        {/* Marker for selected location */}
        {selectedLocation && <Marker coordinate={selectedLocation} />}
      </MapView>

      {/* Confirm Button */}
      <TouchableOpacity style={styles.button} onPress={handleConfirmLocation}>
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
