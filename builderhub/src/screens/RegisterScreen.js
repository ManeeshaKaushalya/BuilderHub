import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import CompanyRegister from './company/CompanyRegister';
import ShopRegister from './shops/ShopRegister';
import UserRegister from './users/UserRegister';
import { useTheme } from '../context/ThemeContext';

// Constants
const COLORS = {
  LIGHT_BG: '#fff',
  DARK_BG: '#1a1a1a',
  LIGHT_TEXT: '#333',
  DARK_TEXT: '#ddd',
  PRIMARY: '#007BFF',
  BORDER: '#ccc',
  LIGHT_GRAY: '#f9f9f9',
};

const ACCOUNT_TYPES = {
  PERSON: 'Person',
  CLIENT: 'Client',
  MATERIAL_SHOP: 'MaterialShop',
};

const RegisterScreen = ({ navigation }) => {
  const { isDarkMode = false } = useTheme() || {}; // Fallback if useTheme fails
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
          [{ text: 'OK' }] // Simplified onPress
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
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      );
    }

    console.log('Rendering component for account type:', accountType); // Debug log
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

  const themedStyles = styles(isDarkMode);

  return (
    <ScrollView
      contentContainerStyle={themedStyles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={themedStyles.title} accessibilityLabel="Create Your Account">
        Create Your Account
      </Text>

      <View style={themedStyles.pickerContainer}>
        <Picker
          selectedValue={accountType}
          onValueChange={(value) => {
            console.log('Selected account type:', value); // Debug log
            setAccountType(value);
          }}
          style={themedStyles.picker}
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
    </ScrollView>
  );
};

const styles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      alignItems: 'center',
      padding: 20,
      backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 20,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
    },
    pickerContainer: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 20,
      borderColor: COLORS.BORDER,
      backgroundColor: isDarkMode ? '#333' : COLORS.LIGHT_GRAY,
      overflow: 'hidden',
      elevation: 2,
    },
    picker: {
      height: 50,
      width: '100%',
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
    },
    errorText: {
      fontSize: 16,
      color: 'red',
      textAlign: 'center',
    },
  });

export default React.memo(RegisterScreen);