import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import CompanyRegister from './company/CompanyRegister';
import ShopRegister from './shops/ShopRegister';
import UserRegister from './users/UserRegister';
import styles from '../styles/RegisterScreenStyles'; // Adjust the import path as necessary

const ACCOUNT_TYPES = {
  PERSON: 'Person',
  CLIENT: 'Client',
  MATERIAL_SHOP: 'MaterialShop',
};

const RegisterScreen = ({ navigation }) => {
  const [accountType, setAccountType] = useState(ACCOUNT_TYPES.PERSON);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  // Request permissions on mount
  useEffect(() => {
    if (!navigation) {
      console.error('Navigation prop is undefined');
      Alert.alert('Error', 'Navigation is not available.');
      return;
    }
    requestPermissions();
  }, [requestPermissions, navigation]);

  const requestPermissions = useCallback(async () => {
    try {
      setIsLoadingPermissions(true);
      if (!ImagePicker.requestMediaLibraryPermissionsAsync) {
        throw new Error('ImagePicker.requestMediaLibraryPermissionsAsync is undefined');
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera roll permissions to upload profile images. Please enable them in settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    } finally {
      setIsLoadingPermissions(false);
    }
  }, []);

  // Memoized rendering of register components
  const renderRegisterComponent = useCallback(() => {
    if (isLoadingPermissions) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={styles.picker.color} />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      );
    }

    console.log('Rendering component for account type:', accountType);
    switch (accountType) {
      case ACCOUNT_TYPES.PERSON:
        if (!UserRegister) {
          console.error('UserRegister component is undefined');
          return <Text style={styles.errorText}>User registration unavailable.</Text>;
        }
        return <UserRegister navigation={navigation} />;
      case ACCOUNT_TYPES.CLIENT:
        if (!CompanyRegister) {
          console.error('CompanyRegister component is undefined');
          return <Text style={styles.errorText}>Client registration unavailable.</Text>;
        }
        return <CompanyRegister navigation={navigation} />;
      case ACCOUNT_TYPES.MATERIAL_SHOP:
        if (!ShopRegister) {
          console.error('ShopRegister component is undefined');
          return <Text style={styles.errorText}>Shop registration unavailable.</Text>;
        }
        return <ShopRegister navigation={navigation} />;
      default:
        console.error('Invalid account type:', accountType);
        return <Text style={styles.errorText}>Invalid account type selected.</Text>;
    }
  }, [accountType, isLoadingPermissions, navigation]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Create Your Account at</Text>
        <Text style={styles.headerSubtitle}>BuilderHub</Text>
      </View>

      {/* Picker Section */}
      <View style={styles.formContainer}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={accountType}
            onValueChange={(value) => {
              console.log('Selected account type:', value);
              setAccountType(value);
            }}
            style={styles.picker}
            itemStyle={styles.pickerItem}
            mode="dropdown"
            accessibilityLabel="Select account type"
            accessibilityHint="Choose between Person, Client, or Material Selling Shop"
          >
            <Picker.Item label="Person" value={ACCOUNT_TYPES.PERSON} />
            <Picker.Item label="Client" value={ACCOUNT_TYPES.CLIENT} />
            <Picker.Item
              label="Material Selling Shop"
              value={ACCOUNT_TYPES.MATERIAL_SHOP}
            />
          </Picker>
        </View>

        {renderRegisterComponent()}
      </View>
    </ScrollView>
  );
};

export default React.memo(RegisterScreen);