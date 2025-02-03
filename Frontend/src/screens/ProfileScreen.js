import React from 'react'
import { View, Text, StyleSheet,TouchableOpacity } from 'react-native';



function ProfileScreen({ navigation }) {
  const handleLogout = () => {
    // TODO: Add Firebase login logic here
   // console.log('Logging in with:', email, password);
    navigation.replace('Login'); // Navigate to Tabs (which includes Home)
  };
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to Profile Screen</Text>
       <TouchableOpacity style={styles.loginButton} onPress={handleLogout}>
                <Text style={styles.loginButtonText}>LogOut</Text>
              </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 18, fontWeight: 'bold' },
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
});

export default ProfileScreen