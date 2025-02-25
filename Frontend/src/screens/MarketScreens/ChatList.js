import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useUser } from '../../context/UserContext';
import { firestore } from '../../../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc, 
  getDoc,
  onSnapshot
} from 'firebase/firestore';

const ChatList = () => {
  const navigation = useNavigation(); // Get navigation directly in ChatList
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    if (!user) return;

    // Create a simpler query that doesn't require a composite index
    const chatsRef = collection(firestore, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      let chatList = [];
      querySnapshot.forEach((doc) => {
        chatList.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort chats manually in JavaScript instead of using Firestore orderBy
      chatList.sort((a, b) => {
        const timeA = a.lastMessageTime ? a.lastMessageTime.toDate().getTime() : 0;
        const timeB = b.lastMessageTime ? b.lastMessageTime.toDate().getTime() : 0;
        return timeB - timeA; // Descending order (newest first)
      });
      
      setChats(chatList);
      setLoading(false);

      // Fetch user profiles for all participants
      chatList.forEach(chat => {
        const otherUserId = chat.participants.find(id => id !== user.uid);
        if (otherUserId && !userProfiles[otherUserId]) {
          fetchUserProfile(otherUserId);
        }
      });
    });

    return unsubscribe;
  }, [user]);

  const fetchUserProfile = async (userId) => {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setUserProfiles(prev => ({
          ...prev,
          [userId]: userSnap.data()
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getOtherUserProfile = (chat) => {
    if (!chat || !chat.participants) return null;
    
    const otherUserId = chat.participants.find(id => id !== user.uid);
    return userProfiles[otherUserId] || null;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    
    // If same day, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If within the last week, show day name
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    if (date > oneWeekAgo) {
      const options = { weekday: 'short' };
      return date.toLocaleDateString(undefined, options);
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const renderChatItem = ({ item }) => {
    const otherUser = getOtherUserProfile(item);
    
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          // First fetch the item data
          const fetchItemAndNavigate = async () => {
            try {
              const itemRef = doc(firestore, 'items', item.itemId);
              const itemSnap = await getDoc(itemRef);
              
              if (itemSnap.exists()) {
                const itemData = { id: itemSnap.id, ...itemSnap.data() };
                navigation.navigate('ChatScreen', { 
                  item: itemData, 
                  sellerData: otherUser,
                  chatId: item.id 
                });
              } else {
                // Item no longer exists
                navigation.navigate('ChatScreen', { 
                  item: { 
                    id: item.itemId, 
                    itemName: item.itemName || 'Deleted Item',
                    images: item.itemImage ? [item.itemImage] : [],
                    price: 'N/A'
                  }, 
                  sellerData: otherUser,
                  chatId: item.id
                });
              }
            } catch (error) {
              console.error('Error fetching item:', error);
            }
          };
          
          fetchItemAndNavigate();
        }}
      >
        <View style={styles.chatItemContent}>
          {/* User Avatar */}
          {otherUser && otherUser.profileImage ? (
            <Image source={{ uri: otherUser.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={24} color="#fff" />
            </View>
          )}
          
          {/* Chat Info */}
          <View style={styles.chatInfo}>
            <View style={styles.chatTopRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {otherUser ? otherUser.name : 'User'}
              </Text>
              <Text style={styles.timeStamp}>
                {item.lastMessageTime ? formatTimestamp(item.lastMessageTime) : ''}
              </Text>
            </View>
            
            <View style={styles.chatBottomRow}>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage || 'No messages yet'}
              </Text>
              <View style={styles.itemPreview}>
                {item.itemImage ? (
                  <Image source={{ uri: item.itemImage }} style={styles.itemThumbnail} />
                ) : (
                  <View style={styles.itemThumbnailPlaceholder}>
                    <Icon name="image-not-supported" size={12} color="#999" />
                  </View>
                )}
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.itemName || 'Item'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading your conversations...</Text>
      </View>
    );
  }

  if (chats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="forum" size={80} color="#e0e0e0" />
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptySubtitle}>
          When you contact sellers, your conversations will appear here
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.browseButtonText}>Browse Items</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    width: '100%', // Add this to ensure full width
  },
  listContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  chatItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  chatInfo: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  timeStamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  chatBottomRow: {
    flexDirection: 'column',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  itemThumbnail: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 6,
  },
  itemThumbnailPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  itemName: {
    fontSize: 12,
    color: '#555',
    maxWidth: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChatList;