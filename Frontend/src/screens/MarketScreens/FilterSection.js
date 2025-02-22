import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const FilterSection = ({ setSelectedCategory }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setSelectedCategory("All")} style={styles.button}>
        <Text style={styles.buttonText}>All</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setSelectedCategory("Paint Machine")} style={styles.button}>
        <Text style={styles.buttonText}>Paint Machine</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setSelectedCategory("Other")} style={styles.button}>
        <Text style={styles.buttonText}>Other</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default FilterSection;
