import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
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
  serverTimestamp,
} from 'firebase/firestore';
import styles from '../../styles/marketplacestyles/ChatListStyles'; 

const ChatList = () => {
  const navigation = useNavigation();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    
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

      
      chatList.sort((a, b) => {
        // Prioritize unread chats
        if (a.unreadBy?.includes(user.uid) && !b.unreadBy?.includes(user.uid)) return -1;
        if (!a.unreadBy?.includes(user.uid) && b.unreadBy?.includes(user.uid)) return 1;

        // Sort by time
        const timeA = a.lastMessageTime ? a.lastMessageTime.toDate().getTime() : 0;
        const timeB = b.lastMessageTime ? b.lastMessageTime.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setChats(chatList);
      setLoading(false);

      // Fetch user profiles for all 
      chatList.forEach((chat) => {
        const otherUserId = chat.participants.find((id) => id !== user.uid);
        if (otherUserId && !userProfiles[otherUserId]) {
          fetchUserProfile(otherUserId);
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
        setUserProfiles((prev) => ({
          ...prev,
          [userId]: userSnap.data(),
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getOtherUserProfile = (chat) => {
    if (!chat || !chat.participants) return null;
    const otherUserId = chat.participants.find((id) => id !== user?.uid);
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
      Alert.alert('Delete Conversation', 'Are you sure you want to delete this conversation?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            setLoading(true);
            await deleteDoc(doc(firestore, 'chats', chatId));
            setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
            setLoading(false);
          },
          style: 'destructive',
        },
      ]);
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
          const updatedUnreadBy = chatData.unreadBy.filter((id) => id !== user.uid);
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
      await markChatAsRead(item.id);
      const itemRef = doc(firestore, 'items', item.itemId);
      const itemSnap = await getDoc(itemRef);

      navigation.navigate('ChatScreen', {
        item: itemSnap.exists()
          ? { id: itemSnap.id, ...itemSnap.data() }
          : {
              id: item.itemId,
              itemName: 'Item Unavailable',
              images: [],
              price: 'N/A',
            },
        sellerData: otherUser,
        chatId: item.id,
      });
    } catch (error) {
      console.error('Error navigating to chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    }
  };

  const countUnreadMessages = (chat) => {
    if (!chat || !chat.unreadCount || !chat.unreadBy || !user?.uid || !chat.unreadBy.includes(user.uid))
      return 0;
    return chat.unreadCount[user.uid] || 1;
  };

  // Sanitize lastMessage to remove item names within quotes
  const sanitizeLastMessage = (message) => {
    if (!message) return 'No messages yet';
    
    return message.replace(/"[^"]*"/g, 'an item').replace(/\s+/g, ' ').trim();
  };

  const renderChatItem = ({ item }) => {
    const otherUser = getOtherUserProfile(item);
    const hasUnread = user?.uid && item.unreadBy?.includes(user.uid);
    const unreadCount = countUnreadMessages(item);

    return (
      <TouchableOpacity
        style={[styles.chatItem, hasUnread && styles.unreadChatItem]}
        onPress={() => navigateToChat(item, otherUser)}
        onLongPress={() => deleteChat(item.id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {otherUser?.profileImage ? (
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
              {otherUser?.name || 'User'}
            </Text>
            <Text style={styles.timeStamp}>
              {item.lastMessageTime ? formatTimestamp(item.lastMessageTime) : ''}
            </Text>
          </View>

          <View style={styles.messagePreview}>
            <Text style={[styles.lastMessage, hasUnread && styles.unreadText]} numberOfLines={1}>
              {sanitizeLastMessage(item.lastMessage)}
            </Text>
            {hasUnread && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
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

  // loading state
  if (loading || user === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6fa5" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  // login prompt if user is undefin
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
          // refersh data bt usestate
          setTimeout(() => setLoading(false), 1000);
        }}
      />
    </View>
  );
};

export default ChatList;