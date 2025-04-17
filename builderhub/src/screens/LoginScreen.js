import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../../firebase/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useUser } from '../context/UserContext';

const COLORS = {
  LIGHT_BG: '#fff',
  DARK_BG: '#1a1a1a',
  LIGHT_TEXT: '#333',
  DARK_TEXT: '#ddd',
  PRIMARY: '#007BFF',
  ERROR: '#ff4444',
  BORDER: '#ccc',
};

const LoginScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Explicitly defined here
  const db = getFirestore();
  const { loginUser } = useUser();

  // Debug logging to verify state
  useEffect(() => {
    console.log('LoginScreen rendered, isLoading:', isLoading);
  }, [isLoading]);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        loginUser(userData);
        if (__DEV__) {
          console.log('User data:', userData);
        }
      } else {
        throw new Error('User data not found in Firestore.');
      }

      Alert.alert('Success', 'Logged in successfully!');
      navigation.replace('Tabs'); // Ensure navigation is stable
    } catch (error) {
      let errorMessage = 'An error occurred during login.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message;
      }
      Alert.alert('Login Failed', errorMessage);
      if (__DEV__) {
        console.error('Login error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, db, loginUser, navigation]);

  const themedStyles = styles(isDarkMode);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={themedStyles.container}
    >
      <View style={themedStyles.innerContainer}>
        <Image
          source={require('../../assets/logo.png')}
          style={themedStyles.logo}
          accessibilityLabel="BuilderHub Logo"
        />

        <Text style={themedStyles.title}>Login</Text>

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

        <View style={themedStyles.inputContainer}>
          <Icon name="lock" size={20} color={COLORS.BORDER} style={themedStyles.icon} />
          <TextInput
            style={themedStyles.input}
            placeholder="Password"
            placeholderTextColor={isDarkMode ? '#888' : '#666'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="Password input"
          />
        </View>

        <TouchableOpacity
          style={[themedStyles.loginButton, isLoading && themedStyles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          accessibilityLabel="Login button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={themedStyles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('forgetpassword')}>
          <Text style={themedStyles.link}>
            Forgot Password? <Text style={themedStyles.linkBold}>Reset here</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={themedStyles.link}>
            Don’t have an account? <Text style={themedStyles.linkBold}>Register here</Text>
          </Text>
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
    logo: {
      width: 140,
      height: 100,
      marginBottom: 20,
      resizeMode: 'contain',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 20,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
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
    loginButton: {
      width: '100%',
      backgroundColor: COLORS.PRIMARY,
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    loginButtonDisabled: {
      opacity: 0.7, // Visual feedback for disabled state
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    link: {
      marginTop: 15,
      color: isDarkMode ? '#aaa' : '#666',
      fontSize: 14,
    },
    linkBold: {
      fontWeight: '600',
      color: COLORS.PRIMARY,
    },
  });

export default LoginScreen; // Removed React.memo for now to simplify debugging