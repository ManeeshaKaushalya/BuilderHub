import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { COLORS, styles } from '../styles/ForgotPasswordScreenStyles'; 

const ForgotPasswordScreen = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const themedStyles = styles(isDarkMode); // Generate dynamic styles

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

export default ForgotPasswordScreen;