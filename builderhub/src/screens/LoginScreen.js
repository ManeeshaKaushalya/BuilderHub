import React, { useState, useCallback } from 'react';
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
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../../firebase/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useUser } from '../context/UserContext';

const COLORS = {
  DARK: '#1A1A1A',
  LIGHT: '#fff',
  ACCENT: '#f7b731',
  TEXT_DARK: '#333',
  TEXT_LIGHT: '#ddd',
  ERROR: '#e74c3c',
  BORDER: '#aaa',
};

const LoginScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const db = getFirestore();
  const { loginUser } = useUser();

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        loginUser(docSnap.data());
        Alert.alert('Welcome', 'Logged in successfully!');
        navigation.replace('Tabs');
      } else {
        throw new Error('User data not found.');
      }
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found') errorMessage = 'User not found.';
      else if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password.';
      else if (error.code === 'auth/too-many-requests') errorMessage = 'Too many attempts. Try later.';

      Alert.alert('Login Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [email, password]);

  const toggleShowPassword = () => setShowPassword(!showPassword);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT }]}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header with logo and titles */}
      <View style={styles.headerSection}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>Welcome to</Text>
        <Text style={styles.headerSubtitle}>BuilderHub</Text>
      </View>

      {/* Login Form */}
      <View style={styles.formContainer}>
        <View style={styles.inputWrapper}>
          <Icon name="envelope" size={18} color={COLORS.BORDER} style={styles.icon} />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Icon name="lock" size={20} color={COLORS.BORDER} style={styles.icon} />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={toggleShowPassword}>
            <Icon
              name={showPassword ? 'eye' : 'eye-slash'}
              size={18}
              color={COLORS.BORDER}
              style={styles.eyeIcon}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('forgetpassword')}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.boldLink}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerSection: {
    width: '120 %',
    alignSelf: 'center',
    paddingTop: 135, // Reduced from 20 to 10
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 70,
    elevation: 5,
    backgroundColor: '#F4B018', // or COLORS.ACCENT
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logo: {
    
    width: 150,
    height: 150,
    resizeMode: 'contain',
    
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
    marginBottom: 50,
  },
  formContainer: {
    width: '100%',
    marginTop: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.TEXT_DARK,
  },
  eyeIcon: {
    paddingHorizontal: 8,
  },
  loginButton: {
    backgroundColor: COLORS.ACCENT,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    textAlign: 'center',
    marginTop: 15,
    color: COLORS.BORDER,
  },
  boldLink: {
    color: COLORS.ACCENT,
    fontWeight: 'bold',
  },
});

export default LoginScreen;