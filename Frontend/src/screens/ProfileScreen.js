import React from 'react'
import { View, Text, StyleSheet } from 'react-native';
import TabBarComponent from './TabBarComponent'

function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text>Profile Screen Content</Text>
      <TabBarComponent/>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});


export default ProfileScreen