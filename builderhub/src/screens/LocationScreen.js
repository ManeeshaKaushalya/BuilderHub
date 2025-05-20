import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import styles from '../styles/LocationScreenStyles';

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

export default LocationScreen;