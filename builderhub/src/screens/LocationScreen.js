import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const LocationScreen = ({ location, registrationType }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Selected Location:</Text>
      <Text style={styles.locationText}>
        {location || 'No location selected'}
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('MapScreen', {
          registrationType: registrationType,
          previousLocation: location
        })}
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