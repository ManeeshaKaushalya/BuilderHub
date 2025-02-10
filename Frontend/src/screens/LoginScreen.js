import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../hooks/ThemeContext';  // Import useTheme hook
import { auth } from '../../firebase/firebaseConfig'; // ✅ Correct
import { signInWithEmailAndPassword } from 'firebase/auth';


const LoginScreen = ({ navigation }) => {
    const { isDarkMode } = useTheme(); // Get dark mode state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
      if (!email || !password) {
        Alert.alert("Error", "Please enter email and password");
        return;
      }
  
      try {
        setIsLoading(true);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User logged in:", userCredential.user);
        Alert.alert("Success", "Logged in successfully!");
  
        // Navigate to home screen
        navigation.replace('Tabs'); 
      } catch (error) {
        console.error("Login error:", error.message);
        Alert.alert("Login Failed", error.message);
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        
        <Text style={styles.title}>Login</Text>

        <View style={styles.inputContainer}>
          <Icon name="envelope" size={20} color="#666" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="lock" size={20} color="#666" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('forgetpassword')}>
          <Text style={styles.link}>Forgot Password? <Text style={styles.linkBold}>Forget passowrd</Text></Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Register here</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
     flex: 1,
      backgroundColor: '#fff'
     },
  innerContainer: { 
    flex: 1,
     justifyContent: 'center',
      alignItems: 'center',
       padding: 20
     },
  logo: {
     width: 140, 
     height: 100, 
     marginBottom: 20
     },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold',
    marginBottom: 20, 
    color: '#333' 
    },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '100%',
     marginBottom: 15, 
     borderWidth: 1, 
     borderColor: '#ccc', 
     borderRadius: 5, 
     paddingHorizontal: 10 
    },
  icon: { 
    marginRight: 10
 },
  input: { 
    flex: 1, 
    height: 40, 
    color: '#333' 
 },
  loginButton: { 
    width: '100%', 
    backgroundColor: '#007BFF', 
    padding: 15, 
    borderRadius: 5, 
    alignItems: 'center', 
    marginTop: 10 
},
  loginButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold'
 },
  link: { 
    marginTop: 15,
     color: '#666'
     },
  linkBold: { 
    fontWeight: 'bold',
     color: '#007BFF' 
    },
});

export default LoginScreen;
