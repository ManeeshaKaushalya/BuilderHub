import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const LocationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute(); // Access the route params
  const selectedLocation = route?.params?.location || 'No location selected'; // Fallback if no location is passed

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Selected Location:</Text>
      <Text style={styles.locationText}>{selectedLocation}</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate('MapScreen')}
      >
        <Text style={styles.buttonText}>Select Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationText: {
    fontSize: 14,
    marginVertical: 5,
    color: '#555',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default LocationScreen;
