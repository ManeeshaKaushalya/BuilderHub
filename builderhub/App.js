import React from 'react';
import { ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper'; // Import Paper Provider
import { LogBox } from 'react-native';
import 'react-native-get-random-values';
import Toast from 'react-native-toast-message';
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews with the same orientation',
'Text strings must be rendered within a <Text> component'
]);


// Context Providers
import { ThemeProvider } from './src/context/ThemeContext';
import { UserProvider } from './src/context/UserContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import CompanyRegister from './src/screens/company/CompanyRegister';
import ShopRegister from './src/screens/shops/ShopRegister';
import UserRegister from './src/screens/users/UserRegister';
import HomeScreen from './src/screens/HomeScreen';
import UsersPostsScreen from './src/screens/UsersPostsScreen';
import MarketScreen from './src/screens/MarketScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MessageScreen from './src/screens/MessageScreen';
import TabsScreen from './src/screens/TabsScreen';
import MapScreen from './src/screens/MapScreen';
import ForgetPassword from './src/screens/ForgetPassword';
import Sidebar from './src/screens/Sidebar';
import SidebarRow from './src/screens/SidebarRow';
import DarkModeScreen from './src/screens/DarkModeScreen';
import ImageUpload from './src/screens/ImageUpload';
import Posts from './src/screens/Posts';
import UserProfile from './src/screens/UserProfile';
import FilterSection from './src/screens/MarketScreens/FilterSection';
import FormatPrice from './src/screens/MarketScreens/FormatPrice';
import AddItem from './src/screens/MarketScreens/AddItem';
import ItemList from './src/screens/MarketScreens/ItemList';
import ItemDetails from './src/screens/MarketScreens/ItemDetails';
import CommentScreen from './src/screens/CommentScreen';
import EditItem from './src/screens/MarketScreens/EditItem';
import 'react-native-get-random-values';
import BuyItem from './src/screens/MarketScreens/BuyItem';
import ChatScreen from './src/screens/MarketScreens/ChatBox';
import ChatList from './src/screens/MarketScreens/ChatList';
import UploaderProfile from './src/screens/UploaderProfile';
import ContactProfessional from './src/screens/ContactProfessional';
import JobRequestForm from './src/screens/JobRequestForm';
import WorkerChatScreen from './src/screens/WorkerChatScreen';
import WorkerChatsList from './src/screens/WorkerChatList';
import PostDetails from './src/screens/PostDetails';
import MakeOrderScreen from './src/screens/MakeOrderScreen';
import ShopOrdersScreen from './src/screens/ShopOrdersScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';


const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider> {/* Wrap your app with PaperProvider */}
        <ThemeProvider>
          <UserProvider>
            <NavigationContainer fallback={<ActivityIndicator size="large" color="#007AFF" />}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="CompanyRegister" component={CompanyRegister} />
                <Stack.Screen name="ShopRegister" component={ShopRegister} />
                <Stack.Screen name="UserRegister" component={UserRegister} />
                <Stack.Screen name="Tabs" component={TabsScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="PostsScreen" component={UsersPostsScreen} />
                <Stack.Screen name="MarketScreen" component={MarketScreen} />
                <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
                <Stack.Screen name="MessageScreen" component={MessageScreen} />
                <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
                <Stack.Screen name="MapScreen" component={MapScreen} />
                <Stack.Screen name="ForgetPassword" component={ForgetPassword} />
                <Stack.Screen name="Sidebar" component={Sidebar} />
                <Stack.Screen name="SidebarRow" component={SidebarRow} />
                <Stack.Screen name="DarkModeScreen" component={DarkModeScreen} />
                <Stack.Screen name="ImageUpload" component={ImageUpload} />
                <Stack.Screen name="Posts" component={Posts} />
                <Stack.Screen name="UserProfile" component={UserProfile} />
                <Stack.Screen name="FilterSection" component={FilterSection} />
                <Stack.Screen name="FormatPrice" component={FormatPrice} />
                <Stack.Screen name="AddItem" component={AddItem} />
                <Stack.Screen name="ItemList" component={ItemList} />
                <Stack.Screen name="ItemDetails" component={ItemDetails} />
                <Stack.Screen name="CommentScreen" component={CommentScreen} />
                <Stack.Screen name="EditItem" component={EditItem} />
                <Stack.Screen name="BuyItem" component={BuyItem} />
                <Stack.Screen name="ChatScreen" component={ChatScreen} />
                <Stack.Screen name="ChatList" component={ChatList} />
                <Stack.Screen name="UploaderProfile" component={UploaderProfile} />
                <Stack.Screen name="ContactProfessional" component={ContactProfessional} />
                <Stack.Screen name="JobRequestForm" component={JobRequestForm} />
                <Stack.Screen name="WorkerChatScreen" component={WorkerChatScreen} />
                <Stack.Screen name="WorkerChatList" component={WorkerChatsList} />
                <Stack.Screen name="PostDetails" component={PostDetails} />
                <Stack.Screen name="MakeOrderScreen" component={MakeOrderScreen} />
                <Stack.Screen name="ShopOrdersScreen" component={ShopOrdersScreen} />
                <Stack.Screen name="OrderDetailsScreen" component={OrderDetailsScreen} />
              </Stack.Navigator>
            </NavigationContainer>
            <Toast />
          </UserProvider>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
    
  );
}
