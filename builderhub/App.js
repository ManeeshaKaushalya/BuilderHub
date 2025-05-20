import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { LogBox } from 'react-native';
import 'react-native-get-random-values';
import Toast from 'react-native-toast-message';

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
import MessageScreen from './src/screens/MessageScreen';
import TabsScreen from './src/screens/TabsScreen';
import MapScreen from './src/screens/MapScreen';
import ImageUpload from './src/screens/posts/ImageUpload';
import Posts from './src/screens/posts/Posts';
import FormatPrice from './src/screens/MarketScreens/FormatPrice';
import AddItem from './src/screens/MarketScreens/AddItem';
import ItemDetails from './src/screens/MarketScreens/ItemDetails';
import CommentScreen from './src/screens/posts/CommentScreen';
import EditItem from './src/screens/MarketScreens/EditItem';
import BuyItem from './src/screens/MarketScreens/BuyItem';
import ChatScreen from './src/screens/MarketScreens/ChatBox';
import ChatList from './src/screens/MarketScreens/ChatList';
import UploaderProfile from './src/screens/UploaderProfile';
import WorkerChatScreen from './src/screens/WorkerChatScreen';
import WorkerChatsList from './src/screens/WorkerChatList';
import PostDetailsScreen from './src/screens/posts/PostDetailsScreen';
import MakeOrderScreen from './src/screens/shops/MakeOrderScreen';
import ShopOrdersScreen from './src/screens/shops/ShopOrdersScreen';
import OrderDetailsScreen from './src/screens/shops/OrderDetailsScreen';
import ChatBot from './src/screens/ChatBot';
import PostCards from './src/screens/posts/PostCards';
import OrderAddressMap from './src/screens/shops/OrderAddressMap';
import EditProfile from './src/screens/users/EditProfile';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HireUserScreen from './src/screens/HireUserScreen';
import OrdersScreen from './src/screens/MarketScreens/OrderScreen';
import OrderItemDetails from './src/screens/MarketScreens/OrderDetails';
import PostListScreen from './src/screens/posts/PostListScreen';
import ClientRegister from './src/screens/client/ClientRegister';
import HireRequestDetailsScreen from './src/screens/HireRequestDetailsScreen';


const Stack = createStackNavigator();

// Component to catch rendering errors
const SafeRender = ({ children }) => {
  try {
    return children;
  } catch (error) {
    console.error('Rendering error:', error);
    return (
      <View>
        <Text>Error rendering component</Text>
      </View>
    );
  }
};

// Suppress specific warnings
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews with the same orientation',
  'Text strings must be rendered within a <Text> component',
]);

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <SafeRender>
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
                  <Stack.Screen name="MapScreen" component={MapScreen} />
                  <Stack.Screen name="ImageUpload" component={ImageUpload} />
                  <Stack.Screen name="Posts" component={Posts} />
                  <Stack.Screen name="FormatPrice" component={FormatPrice} />
                  <Stack.Screen name="AddItem" component={AddItem} />
                  <Stack.Screen name="ItemDetails" component={ItemDetails} />
                  <Stack.Screen name="CommentScreen" component={CommentScreen} />
                  <Stack.Screen name="EditItem" component={EditItem} />
                  <Stack.Screen name="BuyItem" component={BuyItem} />
                  <Stack.Screen name="ChatScreen" component={ChatScreen} />
                  <Stack.Screen name="ChatList" component={ChatList} />
                  <Stack.Screen name="UploaderProfile" component={UploaderProfile} />
                  <Stack.Screen name="WorkerChatScreen" component={WorkerChatScreen} />
                  <Stack.Screen name="WorkerChatList" component={WorkerChatsList} />
                  <Stack.Screen name="PostDetails" component={PostDetailsScreen} />
                  <Stack.Screen name="OrderAddressMap" component={OrderAddressMap} />
                  <Stack.Screen name="MakeOrderScreen" component={MakeOrderScreen} />
                  <Stack.Screen name="ShopOrdersScreen" component={ShopOrdersScreen} />
                  <Stack.Screen name="OrderDetailsScreen" component={OrderDetailsScreen} />
                   <Stack.Screen name="HireRequestDetailsScreen" component={HireRequestDetailsScreen} />
                  <Stack.Screen name="ChatBot" component={ChatBot} />
                  <Stack.Screen name="PostCards" component={PostCards} />
                  <Stack.Screen name="EditProfileScreen" component={EditProfile} />
                  <Stack.Screen name="forgetpassword" component={ForgotPasswordScreen} />
                  <Stack.Screen name="HireUserScreen" component={HireUserScreen} />
                  <Stack.Screen name="OrdersScreen" component={OrdersScreen} />
                  <Stack.Screen name="OrderItemDetails" component={OrderItemDetails} />
                  <Stack.Screen name="PostList" component={PostListScreen} />
                  <Stack.Screen name="ClientRegister" component={ClientRegister} />
                </Stack.Navigator>
              </NavigationContainer>
              <Toast />
            </UserProvider>
          </ThemeProvider>
        </SafeRender>
      </PaperProvider>
    </SafeAreaProvider>
  );
}