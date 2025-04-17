import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig'; // ✅ Correct
import { useTheme } from '../context/ThemeContext';

const ForgetPassword = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isDarkMode } = useTheme();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Success',
        'Password reset email sent. Please check your inbox.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error) {
      let errorMessage = 'Failed to send reset email';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      ...styles.container,
      backgroundColor: isDarkMode ? '#1a1a1a' : '#fff'
    },
    title: {
      ...styles.title,
      color: isDarkMode ? '#fff' : '#000'
    },
    description: {
      ...styles.description,
      color: isDarkMode ? '#ddd' : '#666'
    },
    inputContainer: {
      ...styles.inputContainer,
      backgroundColor: isDarkMode ? '#333' : '#f9f9f9',
      borderColor: isDarkMode ? '#444' : '#ccc'
    },
    input: {
      ...styles.input,
      color: isDarkMode ? '#fff' : '#000'
    },
    link: {
      ...styles.link,
      color: isDarkMode ? '#66b0ff' : '#007BFF'
    }
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Reset Password</Text>

      <Text style={dynamicStyles.description}>
        Enter your email address and we'll send you instructions to reset your password.
      </Text>

      <View style={dynamicStyles.inputContainer}>
        <Icon
          name="envelope"
          size={20}
          style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]}
        />
        <TextInput
          style={dynamicStyles.input}
          placeholder="Email Address"
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={handleResetPassword}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={styles.backButton}
      >
        <Text style={dynamicStyles.link}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007BFF',
    width: '100%',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  backButton: {
    marginTop: 20,
  },
  link: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default ForgetPassword;