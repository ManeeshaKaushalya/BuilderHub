import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import { getBotResponse } from './BotService';

const ChatScreen = ({ route, navigation }) => {
  const { item, sellerData, isBotChat = false } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState(null);
  const { user } = useUser();
  const flatListRef = useRef(null);

  useEffect(() => {
    const setupChat = async () => {
      if (!user) return;

      if (isBotChat) {
        const botChatId = `bot_${user.uid}`;
        setChatId(botChatId);

        // Check if bot chat exists, create it if not
        const chatRef = doc(firestore, 'chats', botChatId);
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
          await setDoc(chatRef, {
            itemId: 'constructionBot',
            itemName: 'Construction Help',
            participants: [user.uid, 'constructionBot'],
            createdAt: serverTimestamp(),
            lastMessage: 'Ask me about construction!',
            lastMessageTime: serverTimestamp()
          });
        }
        setLoading(false);
        return;
      }

      // Existing user-to-user chat setup
      try {
        const chatsRef = collection(firestore, 'chats');
        const chatQuery = query(chatsRef, where('itemId', '==', item.id), where('participants', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(chatQuery, async (querySnapshot) => {
          let existingChat = null;
          querySnapshot.forEach((doc) => {
            const chatData = doc.data();
            if (chatData.participants.includes(item.itemOwnerId) && chatData.participants.includes(user.uid)) {
              existingChat = { id: doc.id, ...chatData };
            }
          });

          if (existingChat) {
            setChatId(existingChat.id);
          } else {
            const newChatRef = await addDoc(chatsRef, {
              itemId: item.id,
              itemName: item.itemName,
              itemImage: item.images?.[0] || null,
              participants: [user.uid, item.itemOwnerId],
              createdAt: serverTimestamp(),
              lastMessage: '',
              lastMessageTime: serverTimestamp()
            });
            setChatId(newChatRef.id);
          }
          setLoading(false);
        });
        return unsubscribe;
      } catch (error) {
        console.error('Error setting up chat:', error);
        setLoading(false);
      }
    };
    setupChat();
  }, [user, item, isBotChat]);

  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = [];
      querySnapshot.forEach((doc) => messagesData.push({ id: doc.id, ...doc.data() }));
      setMessages(messagesData);
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return unsubscribe;
  }, [chatId]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !chatId) return;

    try {
      const messagesRef = collection(firestore, 'chats', chatId, 'messages');
      const chatRef = doc(firestore, 'chats', chatId);

      // Send user message
      const messageData = {
        senderId: user.uid,
        text: inputMessage.trim(),
        timestamp: serverTimestamp(),
        read: false
      };
      await addDoc(messagesRef, messageData);

      // Update chat metadata
      await updateDoc(chatRef, {
        lastMessage: inputMessage.trim(),
        lastMessageTime: serverTimestamp()
      }).catch(async (error) => {
        if (error.code === 'not-found') {
          // If document doesn't exist (shouldn't happen with bot chat now), create it
          await setDoc(chatRef, {
            itemId: isBotChat ? 'constructionBot' : item.id,
            itemName: isBotChat ? 'Construction Help' : item.itemName,
            participants: isBotChat ? [user.uid, 'constructionBot'] : [user.uid, item.itemOwnerId],
            createdAt: serverTimestamp(),
            lastMessage: inputMessage.trim(),
            lastMessageTime: serverTimestamp()
          });
        } else {
          throw error;
        }
      });

      // Bot response for bot chat
      if (isBotChat) {
        const botResponse = await getBotResponse(inputMessage);
        await addDoc(messagesRef, {
          senderId: 'constructionBot',
          text: botResponse,
          timestamp: serverTimestamp(),
          read: false
        });
        await updateDoc(chatRef, {
          lastMessage: botResponse,
          lastMessageTime: serverTimestamp()
        });
      }

      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item: message }) => {
    const isCurrentUser = message.senderId === user.uid;
    const isBot = message.senderId === 'constructionBot';

    return (
      <View style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessage : isBot ? styles.botMessage : styles.otherUserMessage]}>
        <View style={[styles.messageBubble, isCurrentUser ? styles.currentUserBubble : isBot ? styles.botBubble : styles.otherUserBubble]}>
          <Text style={[styles.messageText, isCurrentUser ? styles.currentUserText : isBot ? styles.botText : styles.otherUserText]}>
            {message.text}
          </Text>
          <Text style={[styles.messageTime, isCurrentUser ? styles.currentUserTime : isBot ? styles.botTime : styles.otherUserTime]}>
            {message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...'}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.chatHeader}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <View style={styles.chatHeaderInfo}>
        <View style={styles.chatHeaderLeft}>
          {isBotChat ? (
            <Image source={require('../../../assets/bot-avatar.png')} style={styles.sellerAvatar} />
          ) : sellerData?.profileImage ? (
            <Image source={{ uri: sellerData.profileImage }} style={styles.sellerAvatar} />
          ) : (
            <View style={styles.sellerAvatarPlaceholder}>
              <Icon name="person" size={24} color="#fff" />
            </View>
          )}
          <View style={styles.chatHeaderText}>
            <Text style={styles.sellerName}>{isBotChat ? 'Construction Bot' : sellerData?.name || 'Seller'}</Text>
            <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
          </View>
        </View>
        {!isBotChat && (
          <View style={styles.chatHeaderRight}>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>Rs. {Number(item.price).toLocaleString()}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#007bff" /><Text>Setting up your conversation...</Text></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {renderHeader()}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder={isBotChat ? "Ask about construction..." : "Type a message..."}
          multiline
        />
        <TouchableOpacity style={[styles.sendButton, !inputMessage.trim() && styles.disabledSendButton]} onPress={sendMessage} disabled={!inputMessage.trim()}>
          <Icon name="send" size={24} color={inputMessage.trim() ? "#fff" : "#ccc"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatHeader: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', elevation: 2 },
  backButton: { marginBottom: 8 },
  chatHeaderInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  sellerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  chatHeaderText: { flex: 1 },
  sellerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemName: { fontSize: 14, color: '#666' },
  chatHeaderRight: { marginLeft: 8 },
  priceBadge: { backgroundColor: '#e6f7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#91d5ff' },
  priceText: { fontSize: 14, color: '#0066cc', fontWeight: '600' },
  messagesContainer: { flexGrow: 1, padding: 16 },
  messageContainer: { marginBottom: 8, maxWidth: '80%' },
  currentUserMessage: { alignSelf: 'flex-end' },
  otherUserMessage: { alignSelf: 'flex-start' },
  botMessage: { alignSelf: 'flex-start' },
  messageBubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  currentUserBubble: { backgroundColor: '#007bff' },
  otherUserBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0' },
  botBubble: { backgroundColor: '#e6f3ff', borderWidth: 1, borderColor: '#91d5ff' },
  messageText: { fontSize: 16, marginBottom: 4 },
  currentUserText: { color: '#fff' },
  otherUserText: { color: '#333' },
  botText: { color: '#0066cc' },
  messageTime: { fontSize: 10, color: '#999', alignSelf: 'flex-end' },
  currentUserTime: { color: 'rgba(255, 255, 255, 0.7)' },
  otherUserTime: { color: '#999' },
  botTime: { color: '#6699cc' },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: '#f1f3f4', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 120, color: '#333' },
  sendButton: { position: 'absolute', right: 24, width: 40, height: 40, borderRadius: 20, backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center' },
  disabledSendButton: { backgroundColor: '#e0e0e0' }
});

export default ChatScreen;