import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import CompanyRegister from './company/CompanyRegister';
import ShopRegister from './shops/ShopRegister';
import UserRegister from './users/UserRegister';

const RegisterScreen = ({ navigation }) => {
  const [accountType, setAccountType] = useState('Person');

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera roll permissions to upload images.',
          [{ text: 'OK', onPress: () => { } }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert(
        'Error',
        'Failed to request camera roll permissions.',
        [{ text: 'OK', onPress: () => { } }]
      );
    }
  };

  const renderRegisterComponent = () => {
    switch (accountType) {
      case 'Person':
        return <UserRegister navigation={navigation} />;
      case 'Company':
        return <CompanyRegister navigation={navigation} />;
      case 'MaterialShop':
        return <ShopRegister navigation={navigation} />;
      default:
        return null;
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create Your Account</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={accountType}
          onValueChange={setAccountType}
          style={styles.picker}
          mode="dropdown"
        >
          <Picker.Item label="Person" value="Person" />
          <Picker.Item label="Company" value="Company" />
          <Picker.Item label="Material Selling Shop" value="MaterialShop" />
        </Picker>
      </View>

      {renderRegisterComponent()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  pickerContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
});

export default RegisterScreen;