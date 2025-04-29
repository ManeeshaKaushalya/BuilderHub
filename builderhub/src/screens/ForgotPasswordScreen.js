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
  PRIMARY: '#007BFF',
  ERROR: '#ff4444',
  BORDER: '#ccc',
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
      <View style={themedStyles.innerContainer}>
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={() => navigation.navigate('Login')}
          accessibilityLabel="Back to login"
        >
          <Icon name="arrow-left" size={20} color={isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT} />
          <Text style={themedStyles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={themedStyles.title}>Reset Password</Text>
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
    innerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'absolute',
      top: 40,
      left: 20,
    },
    backButtonText: {
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
      fontSize: 16,
      marginLeft: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 10,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
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
      backgroundColor: isDarkMode ? '#333' : '#fff',
    },
    icon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      height: 48,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
      fontSize: 16,
    },
    resetButton: {
      width: '100%',
      backgroundColor: COLORS.PRIMARY,
      paddingVertical: 15,
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
      fontWeight: '600',
    },
  });

export default ForgotPasswordScreen;