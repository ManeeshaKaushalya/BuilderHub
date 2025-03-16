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
import { useTheme } from '../hooks/ThemeContext'; // Assuming this exists in your project

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
  COMPANY: 'Company',
  MATERIAL_SHOP: 'MaterialShop',
};

const RegisterScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme(); // Integrate theme support
  const [accountType, setAccountType] = useState(ACCOUNT_TYPES.PERSON);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      setIsLoadingPermissions(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera roll permissions to upload profile images. Please enable them in settings.',
          [
            { text: 'OK', onPress: () => console.log('Permission denied') },
            // Optionally add a "Go to Settings" button if supported by expo-linking
          ]
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

    switch (accountType) {
      case ACCOUNT_TYPES.PERSON:
        return <UserRegister navigation={navigation} />;
      case ACCOUNT_TYPES.COMPANY:
        return <CompanyRegister navigation={navigation} />;
      case ACCOUNT_TYPES.MATERIAL_SHOP:
        return <ShopRegister navigation={navigation} />;
      default:
        return (
          <Text style={styles.errorText}>Invalid account type selected.</Text>
        );
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
          onValueChange={setAccountType}
          style={themedStyles.picker}
          mode="dropdown"
          accessibilityLabel="Select account type"
          accessibilityHint="Choose between Person, Company, or Material Selling Shop"
        >
          <Picker.Item label="Person" value={ACCOUNT_TYPES.PERSON} />
          <Picker.Item label="Company" value={ACCOUNT_TYPES.COMPANY} />
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
      borderRadius: 8, // Softer corners
      marginBottom: 20,
      borderColor: COLORS.BORDER,
      backgroundColor: isDarkMode ? '#333' : COLORS.LIGHT_GRAY,
      overflow: 'hidden',
      elevation: 2, // Subtle shadow for depth
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
      color: COLORS.ERROR,
      textAlign: 'center',
    },
  });

export default React.memo(RegisterScreen); // Memoize to optimize re-renders