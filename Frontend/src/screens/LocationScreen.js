import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/FontAwesome';

const LocationScreen = () => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }
    })();
  }, []);

  const getLocation = async () => {
    try {
      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      // Get address from coordinates
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const locationAddress = reverseGeocode[0];
        setAddress(locationAddress);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not fetch location');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
        <Icon name="map-marker" size={24} color="white" />
        <Text style={styles.buttonText}>Get Current Location</Text>
      </TouchableOpacity>

      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.heading}>Location Details:</Text>
          <Text style={styles.text}>
            Latitude: {location.coords.latitude}
          </Text>
          <Text style={styles.text}>
            Longitude: {location.coords.longitude}
          </Text>
        </View>
      )}

      {address && (
        <View style={styles.addressInfo}>
          <Text style={styles.heading}>Address:</Text>
          <Text style={styles.text}>
            {address.street && `${address.street}, `}
            {address.city && `${address.city}, `}
            {address.region && `${address.region}, `}
            {address.country && address.country}
          </Text>
          <Text style={styles.text}>
            Postal Code: {address.postalCode || 'N/A'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  locationInfo: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  addressInfo: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
});

export default LocationScreen;