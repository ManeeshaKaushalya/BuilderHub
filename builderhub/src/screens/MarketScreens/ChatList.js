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
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

const ChatList = () => {
  const navigation = useNavigation();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    // Make sure user exists and has a uid before querying
    if (!user || !user.uid) {
      console.log('User or user.uid is undefined, skipping chat fetch');
      return;
    }

    const chatsRef = collection(firestore, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      let chatList = [];
      querySnapshot.forEach((doc) => {
        chatList.push({ id: doc.id, ...doc.data() });
      });

      // Add persistent support chat entry
      const supportChatId = `support_${user.uid}`;
      const supportChatIndex = chatList.findIndex(chat => chat.id === supportChatId);
      const supportChat = {
        id: supportChatId,
        itemId: 'supportAgent',
        itemName: 'Customer Support',
        itemImage: null,
        participants: [user.uid, 'supportAgent'],
        lastMessage: chatList[supportChatIndex]?.lastMessage || 'How can we help you today?',
        lastMessageTime: chatList[supportChatIndex]?.lastMessageTime || serverTimestamp(),
        isSupportChat: true
      };

      // Replace or add support chat at the top
      if (supportChatIndex >= 0) {
        chatList[supportChatIndex] = supportChat;
      } else {
        chatList.unshift(supportChat);
      }

      // Sort chats: support first, then unread, then by timestamp
      chatList.sort((a, b) => {
        // Support chat always first
        if (a.isSupportChat) return -1;
        if (b.isSupportChat) return 1;

        // Prioritize unread chats
        if ((a.unreadBy?.includes(user.uid) && !b.unreadBy?.includes(user.uid))) return -1;
        if ((!a.unreadBy?.includes(user.uid) && b.unreadBy?.includes(user.uid))) return 1;

        // Sort by time
        const timeA = a.lastMessageTime ? a.lastMessageTime.toDate().getTime() : 0;
        const timeB = b.lastMessageTime ? b.lastMessageTime.toDate().getTime() : 0;
        return timeB - timeA; // Descending order (newest first)
      });

      setChats(chatList);
      setLoading(false);

      // Fetch user profiles for all participants (excluding support)
      chatList.forEach(chat => {
        if (!chat.isSupportChat) {
          const otherUserId = chat.participants.find(id => id !== user.uid);
          if (otherUserId && !userProfiles[otherUserId]) {
            fetchUserProfile(otherUserId);
          }
        }
      });
    }, (error) => {
      console.error('Error listening to chats: ', error);
      setLoading(false);
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
    if (!chat || !chat.participants || chat.isSupportChat) return null;
    const otherUserId = chat.participants.find(id => id !== user?.uid);
    return userProfiles[otherUserId] || null;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      if (date > oneWeekAgo) {
        return date.toLocaleDateString(undefined, { weekday: 'short' });
      }
      
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  const deleteChat = async (chatId) => {
    try {
      Alert.alert(
        "Delete Conversation",
        "Are you sure you want to delete this conversation?",
        [
          { text: "Cancel", style: "cancel" },
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
    if (!user?.uid) return;
    
    try {
      const chatRef = doc(firestore, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        if (chatData.unreadBy?.includes(user.uid)) {
          const updatedUnreadBy = chatData.unreadBy.filter(id => id !== user.uid);
          await updateDoc(chatRef, { unreadBy: updatedUnreadBy });
        }
      }
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  const navigateToChat = async (item, otherUser) => {
    if (!user?.uid) {
      Alert.alert('Error', 'You need to be logged in to access chat');
      return;
    }
    
    try {
      if (item.isSupportChat) {
        navigation.navigate('ChatScreen', {
          item: { id: 'supportAgent', itemName: 'Customer Support', images: [], price: 'N/A' },
          sellerData: { name: 'Support Team', profileImage: null },
          isSupportChat: true,
          chatId: item.id
        });
        return;
      }

      await markChatAsRead(item.id);
      const itemRef = doc(firestore, 'items', item.itemId);
      const itemSnap = await getDoc(itemRef);
      
      navigation.navigate('ChatScreen', { 
        item: itemSnap.exists() ? { id: itemSnap.id, ...itemSnap.data() } : { 
          id: item.itemId, 
          itemName: item.itemName || 'Item Unavailable',
          images: item.itemImage ? [item.itemImage] : [],
          price: 'N/A'
        }, 
        sellerData: otherUser,
        chatId: item.id 
      });
    } catch (error) {
      console.error('Error navigating to chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    }
  };

  const countUnreadMessages = (chat) => {
    if (!chat || !chat.unreadCount || !chat.unreadBy || !user?.uid || !chat.unreadBy.includes(user.uid)) return 0;
    return chat.unreadCount[user.uid] || 1;
  };

  const renderChatItem = ({ item }) => {
    const otherUser = item.isSupportChat ? { name: 'Support Team', profileImage: null } : getOtherUserProfile(item);
    const hasUnread = user?.uid && item.unreadBy?.includes(user.uid);
    const unreadCount = countUnreadMessages(item);

    return (
      <TouchableOpacity
        style={[styles.chatItem, hasUnread && styles.unreadChatItem]}
        onPress={() => navigateToChat(item, otherUser)}
        onLongPress={() => !item.isSupportChat && deleteChat(item.id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.isSupportChat ? (
            <View style={styles.supportAvatar}>
              <Icon name="support-agent" size={26} color="#fff" />
            </View>
          ) : otherUser?.profileImage ? (
            <Image source={{ uri: otherUser.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, hasUnread && styles.unreadAvatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {otherUser?.name ? otherUser.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          {hasUnread && <View style={styles.statusIndicator} />}
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.userName, hasUnread && styles.unreadText]} numberOfLines={1}>
              {item.isSupportChat ? 'Support Team' : (otherUser?.name || 'User')}
            </Text>
            <Text style={styles.timeStamp}>
              {item.lastMessageTime ? formatTimestamp(item.lastMessageTime) : ''}
            </Text>
          </View>
          
          <View style={styles.messagePreview}>
            <Text style={[styles.lastMessage, hasUnread && styles.unreadText]} numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
            {hasUnread && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
          
          {!item.isSupportChat && item.itemName && (
            <View style={styles.itemTag}>
              {item.itemImage ? (
                <Image source={{ uri: item.itemImage }} style={styles.itemThumb} />
              ) : (
                <View style={styles.itemThumbPlaceholder}>
                  <Icon name="inventory-2" size={12} color="#555" />
                </View>
              )}
              <Text style={styles.itemName} numberOfLines={1}>
                {item.itemName}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="chat-bubble-outline" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        When you connect with someone, your conversations will appear here
      </Text>
    </View>
  );

  // Show loading state if we're still initializing or if user is null
  if (loading || user === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6fa5" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  // Show login prompt if user is undefined (not loading, but not logged in)
  if (user === undefined) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="account-circle" size={60} color="#ccc" />
        <Text style={styles.emptyTitle}>Not logged in</Text>
        <Text style={styles.emptySubtitle}>
          Please log in to view your conversations
        </Text>
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
        ListEmptyComponent={renderEmptyComponent}
        refreshing={loading}
        onRefresh={() => {
          setLoading(true);
          // The useEffect will automatically refresh the data
          setTimeout(() => setLoading(false), 1000);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  listContent: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4a6fa5',
    fontWeight: '500',
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadChatItem: {
    backgroundColor: '#f0f6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#4a6fa5',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e0e6ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadAvatarPlaceholder: {
    backgroundColor: '#4a6fa5',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4a6fa5',
  },
  supportAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4a6fa5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#ffffff',
    bottom: 0,
    right: 0,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '700',
    color: '#1a365d',
  },
  timeStamp: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '400',
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
    marginRight: 8,
  },
  badgeContainer: {
    backgroundColor: '#4a6fa5',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f4f6',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  itemThumb: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 6,
  },
  itemThumbPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#e0e6ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  itemName: {
    fontSize: 12,
    color: '#546e7a',
    maxWidth: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4a6fa5',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 8,
  }
});

export default ChatList;