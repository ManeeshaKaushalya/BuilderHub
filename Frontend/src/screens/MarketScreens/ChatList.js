import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
  onSnapshot,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

const ChatList = () => {
  const navigation = useNavigation();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    if (!user) return;

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
      
      // Sort chats: unread first, then by timestamp
      chatList.sort((a, b) => {
        // First prioritize unread chats
        if ((a.unreadBy && a.unreadBy.includes(user.uid)) && 
            !(b.unreadBy && b.unreadBy.includes(user.uid))) {
          return -1;
        }
        if (!(a.unreadBy && a.unreadBy.includes(user.uid)) && 
            (b.unreadBy && b.unreadBy.includes(user.uid))) {
          return 1;
        }
        
        // Then sort by time
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

  // Function to delete a chat
  const deleteChat = async (chatId) => {
    try {
      Alert.alert(
        "Delete Conversation",
        "Are you sure you want to delete this conversation?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            onPress: async () => {
              setLoading(true);
              await deleteDoc(doc(firestore, 'chats', chatId));
              setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
              setLoading(false);
            },
            style: "destructive"
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete conversation. Please try again.');
      setLoading(false);
    }
  };

  const markChatAsRead = async (chatId) => {
    try {
      const chatRef = doc(firestore, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        
        if (chatData.unreadBy && chatData.unreadBy.includes(user.uid)) {
          const updatedUnreadBy = chatData.unreadBy.filter(id => id !== user.uid);
          
          await updateDoc(chatRef, {
            unreadBy: updatedUnreadBy
          });
        }
      }
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  const navigateToChat = async (item, otherUser) => {
    try {
      // Mark as read when navigating to chat
      await markChatAsRead(item.id);
      
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

  const countUnreadMessages = (chat) => {
    if (!chat || !chat.unreadCount || !chat.unreadBy || !chat.unreadBy.includes(user.uid)) {
      return 0;
    }
    return chat.unreadCount[user.uid] || 1; // Default to 1 if count not specified
  };

  const renderChatItem = ({ item }) => {
    const otherUser = getOtherUserProfile(item);
    const hasUnread = item.unreadBy && item.unreadBy.includes(user.uid);
    const unreadCount = countUnreadMessages(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          hasUnread && styles.unreadChatItem
        ]}
        onPress={() => navigateToChat(item, otherUser)}
        onLongPress={() => deleteChat(item.id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.chatItemContent}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            {otherUser && otherUser.profileImage ? (
              <Image source={{ uri: otherUser.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, hasUnread && styles.unreadAvatarPlaceholder]}>
                <Icon name="person" size={24} color="#fff" />
              </View>
            )}
          </View>
          
          {/* Middle Content */}
          <View style={styles.chatInfo}>
            {/* Name and Time Row */}
            <View style={styles.chatTopRow}>
              <Text 
                style={[
                  styles.userName, 
                  hasUnread && styles.unreadText
                ]} 
                numberOfLines={1}
              >
                {otherUser ? otherUser.name : 'User'}
              </Text>
              <Text style={styles.timeStamp}>
                {item.lastMessageTime ? formatTimestamp(item.lastMessageTime) : ''}
              </Text>
            </View>
            
            {/* Preview and Item Row */}
            <View style={styles.chatBottomRow}>
              <View style={styles.lastMessageContainer}>
                <Text 
                  style={[
                    styles.lastMessage,
                    hasUnread && styles.unreadText
                  ]} 
                  numberOfLines={1}
                >
                  {item.lastMessage || 'No messages yet'}
                </Text>
              </View>
              
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
          
          {/* Unread Count Badge */}
          {hasUnread && (
            <View style={styles.badgeContainer}>
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Swipe/Long Press Hint - Only visible initially */}
       
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
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    width: '100%',
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
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  unreadChatItem: {
    backgroundColor: '#fff', // Keep white background for clean look
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#A0A0A0', // Default gray for read messages
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadAvatarPlaceholder: {
    backgroundColor: '#007bff', // Brighter blue for unread messages
  },
  chatInfo: {
    flex: 1,
    marginRight: 8,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '700', // Bolder for unread
    color: '#000000', // Darker for unread
  },
  timeStamp: {
    fontSize: 12,
    color: '#757575',
  },
  chatBottomRow: {
    flexDirection: 'column',
  },
  lastMessageContainer: {
    marginBottom: 6,
  },
  lastMessage: {
    fontSize: 14,
    color: '#757575',
  },
  itemPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
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
  badgeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#007bff',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
  hintText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 8,
    opacity: 0.7,
  },
});

export default ChatList;