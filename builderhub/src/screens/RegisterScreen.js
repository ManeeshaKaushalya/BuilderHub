import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import CompanyRegister from './company/CompanyRegister';
import ShopRegister from './shops/ShopRegister';
import UserRegister from './users/UserRegister';
import styles from '../styles/RegisterScreenStyles';

const ACCOUNT_TYPES = {
  PERSON: 'Person',
  CLIENT: 'Client',
  MATERIAL_SHOP: 'MaterialShop',
};

const RegisterScreen = ({ navigation }) => {
  const [accountType, setAccountType] = useState(ACCOUNT_TYPES.PERSON);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  useEffect(() => {
    if (!navigation) {
      console.error('Navigation prop is undefined');
      Alert.alert('Error', 'Navigation is not available.');
      return;
    }
    requestPermissions();
  }, [navigation]);

  const requestPermissions = useCallback(async () => {
    try {
      setIsLoadingPermissions(true);
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

  const renderRegisterComponent = useCallback(() => {
    if (isLoadingPermissions) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={styles.picker.color || '#000'} />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      );
    }

    switch (accountType) {
      case ACCOUNT_TYPES.PERSON:
        return <UserRegister navigation={navigation} />;
      case ACCOUNT_TYPES.CLIENT:
        return <CompanyRegister navigation={navigation} />;
      case ACCOUNT_TYPES.MATERIAL_SHOP:
        return <ShopRegister navigation={navigation} />;
      default:
        return <Text style={styles.errorText}>Invalid account type selected.</Text>;
    }
  }, [accountType, isLoadingPermissions, navigation]);

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={10}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
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
              onValueChange={(value) => setAccountType(value)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              mode="dropdown"
            >
              <Picker.Item label="Person" value={ACCOUNT_TYPES.PERSON} />
              <Picker.Item label="Client" value={ACCOUNT_TYPES.CLIENT} />
              <Picker.Item label="Material Selling Shop" value={ACCOUNT_TYPES.MATERIAL_SHOP} />
            </Picker>
          </View>

          {/* Register Component */}
          <View style={{ flexGrow: 1 }}>{renderRegisterComponent()}</View>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};

export default React.memo(RegisterScreen);
