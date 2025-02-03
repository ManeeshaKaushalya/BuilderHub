import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import UsersPostsScreen from './src/screens/UsersPostsScreen';
import MarketScreen from './src/screens/MarketScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MessageScreen from './src/screens/MessageScreen';
import TabsScreen from './src/screens/TabsScreen';


const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen}  options={{ headerShown: false }}/>
        <Stack.Screen name="Register" component={RegisterScreen}  options={{ headerShown: false }}/>
        <Stack.Screen name="Home" component={HomeScreen}  options={{ headerShown: false }}/>
        <Stack.Screen name="PostsScreen" component={UsersPostsScreen}  options={{ headerShown: false }}/>
        <Stack.Screen name="MarketScreen" component={MarketScreen}  options={{ headerShown: false }}/>
        <Stack.Screen name="NotificationScreen" component={NotificationScreen}  options={{ headerShown: false }}/>
        <Stack.Screen name="MessageScreen" component={MessageScreen}  options={{ headerShown: false }}/>
        <Stack.Screen name="ProfileScreen" component={ProfileScreen}  options={{ headerShown: false }}/>
        <Stack.Screen name="Tabs" component={TabsScreen}  options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
