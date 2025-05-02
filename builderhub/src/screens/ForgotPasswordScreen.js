import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../../firebase/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

const COLORS = {
  LIGHT_BG: '#fff',
  DARK_BG: '#1a1a1a',
  LIGHT_TEXT: '#333',
  DARK_TEXT: '#ddd',
  ACCENT: '#F4B018', // Updated to match LoginScreen
  ERROR: '#ff4444',
  BORDER: '#aaa', // Updated to match LoginScreen
  INPUT_BG: '#eee', // Added to match LoginScreen input background
};

const ForgotPasswordScreen = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        'Success',
        'A password reset email has been sent to your email address.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      let errorMessage = 'An error occurred while sending the reset email.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        default:
          errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
      if (__DEV__) {
        console.error('Reset password error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, navigation]);

  const themedStyles = styles(isDarkMode);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={themedStyles.container}
    >
      {/* Header Section */}
      <View style={themedStyles.headerSection}>
    
        <Text style={themedStyles.headerTitle}>Reset Your Password at</Text>
        <Text style={themedStyles.headerSubtitle}>BuilderHub</Text>
      </View>

      <View style={themedStyles.formContainer}>
      

        <Text style={themedStyles.subtitle}>
          Enter your email address to receive a password reset link.
        </Text>

        <View style={themedStyles.inputContainer}>
          <Icon name="envelope" size={20} color={COLORS.BORDER} style={themedStyles.icon} />
          <TextInput
            style={themedStyles.input}
            placeholder="Email"
            placeholderTextColor={isDarkMode ? '#888' : '#666'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email input"
          />
        </View>

        <TouchableOpacity
          style={[themedStyles.resetButton, isLoading && themedStyles.resetButtonDisabled]}
          onPress={handleResetPassword}
          disabled={isLoading}
          accessibilityLabel="Send reset email button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={themedStyles.resetButtonText}>Send Reset Email</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
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
      flex: 1,
      width: '100%',
      paddingHorizontal: 24, // Matches LoginScreen padding
      marginTop: 30, // Matches LoginScreen spacing
      alignItems: 'center',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: 2,
    },
    backButtonText: {
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
      fontSize: 16,
      marginLeft: 30,
    },
    subtitle: {
      fontSize: 16,
      color: isDarkMode ? '#aaa' : '#666',
      textAlign: 'center',
      marginBottom: 20,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: 15,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: COLORS.INPUT_BG, // Matches LoginScreen input background
    },
    icon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      height: 48, // Matches LoginScreen input height
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
      fontSize: 16,
    },
    resetButton: {
      width: '100%',
      backgroundColor: COLORS.ACCENT, // Matches LoginScreen button color
      paddingVertical: 14, // Matches LoginScreen button padding
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    resetButtonDisabled: {
      opacity: 0.7,
    },
    resetButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold', // Matches LoginScreen button text
    },
  });

export default ForgotPasswordScreen;