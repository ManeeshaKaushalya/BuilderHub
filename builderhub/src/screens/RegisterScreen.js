import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
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
  BORDER: '#aaa', // Updated to match LoginScreen
  LIGHT_GRAY: '#eee', // Updated to match LoginScreen input background
  ACCENT: '#F4B018', // Added to match LoginScreen header
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
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
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

  const themedStyles = styles(isDarkMode);

  return (
    <ScrollView
      contentContainerStyle={themedStyles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header Section */}
      <View style={themedStyles.headerSection}>
        <Text style={themedStyles.headerTitle}>Create Your Account at</Text>
        <Text style={themedStyles.headerSubtitle}>BuilderHub</Text>
      </View>

      {/* Picker Section */}
      <View style={themedStyles.formContainer}>
        <View style={themedStyles.pickerContainer}>
          <Picker
            selectedValue={accountType}
            onValueChange={(value) => {
              console.log('Selected account type:', value);
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
      </View>
    </ScrollView>
  );
};

const styles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
    },
    headerSection: {
      width: '120%',
      alignSelf: 'center',
      paddingTop: 10, // Matches LoginScreen
      paddingBottom: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomLeftRadius: 70,
      borderBottomRightRadius: 70,
      elevation: 5,
      backgroundColor: COLORS.ACCENT, // Matches LoginScreen header color
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    logo: {
      width: 100,
      height: 100,
      resizeMode: 'contain',
      marginBottom: 5, // Matches LoginScreen
    },
    headerTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '600',
    },
    headerSubtitle: {
      color: '#fff',
      fontSize: 28,
      fontWeight: 'bold',
      marginTop: 5,
    },
    formContainer: {
      width: '100%',
      paddingHorizontal: 24, // Matches LoginScreen padding
      marginTop: 30, // Matches LoginScreen spacing
    },
    pickerContainer: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 20,
      borderColor: COLORS.BORDER,
      backgroundColor: COLORS.LIGHT_GRAY, // Matches LoginScreen input background
      overflow: 'hidden',
      elevation: 2,
    },
    picker: {
      height: 48, // Matches LoginScreen input height
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