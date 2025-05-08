import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../../firebase/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import styles from '../styles/LoginScreenStyles';

const LoginScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const db = getFirestore();
  const { loginUser } = useUser();
  const passwordInputRef = useRef(null);

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

  const handleEmailSubmit = () => {
    passwordInputRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: isDarkMode ? 'rgba(60, 60, 60, 0.4)' : 'rgba(156, 134, 134, 0.4)' }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
              <Icon name="envelope" size={18} color={styles.inputWrapper.borderColor} style={styles.icon} />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#999"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={handleEmailSubmit}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Icon name="lock" size={20} color={styles.inputWrapper.borderColor} style={styles.icon} />
              <TextInput
                ref={passwordInputRef}
                placeholder="Password"
                placeholderTextColor="#999"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={toggleShowPassword}>
                <Icon
                  name={showPassword ? 'eye' : 'eye-slash'}
                  size={18}
                  color={styles.inputWrapper.borderColor}
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
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;