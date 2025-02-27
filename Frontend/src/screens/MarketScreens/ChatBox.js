import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc, updateDoc, getDocs } from 'firebase/firestore';
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
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const typingRef = useRef(null);

  // Add this ref to track when messages change
  const messagesLengthRef = useRef(0);

  useEffect(() => {
    console.log("ChatScreen useEffect triggered, isBotChat:", isBotChat);
    console.log("User from context:", user ? { uid: user.uid } : "null");

    const setupChat = async () => {
      if (!user || !user.uid) {
        console.log("No user authenticated or missing UID, exiting setupChat");
        setLoading(false);
        return;
      }

      console.log("User UID:", user.uid);

      if (isBotChat) {
        const botChatId = `bot_${user.uid}`;
        console.log("Setting up bot chat with ID:", botChatId);
        setChatId(botChatId);

        const chatRef = doc(firestore, 'chats', botChatId);
        try {
          const chatSnap = await getDoc(chatRef);
          console.log("Chat document exists:", chatSnap.exists());

          if (!chatSnap.exists()) {
            console.log("Creating new bot chat document...");
            await setDoc(chatRef, {
              itemId: 'constructionBot',
              itemName: 'Construction Help',
              participants: [user.uid, 'constructionBot'],
              createdAt: serverTimestamp(),
              lastMessage: 'Ask me about construction!',
              lastMessageTime: serverTimestamp(),
            });
            const messagesRef = collection(firestore, 'chats', botChatId, 'messages');
            const initialGreeting = await getBotResponse('', true);
            console.log("Adding initial greeting:", initialGreeting);
            await addDoc(messagesRef, {
              senderId: 'constructionBot',
              text: initialGreeting,
              timestamp: serverTimestamp(),
              read: false,
            });
            setIsFirstMessage(true);
          } else {
            console.log("Checking for user messages in existing bot chat...");
            const messagesRef = collection(firestore, 'chats', botChatId, 'messages');
            const userMessagesQuery = query(messagesRef, where('senderId', '==', user.uid));
            try {
              const userMessagesSnap = await getDocs(userMessagesQuery);
              console.log("User messages found:", !userMessagesSnap.empty);
              setIsFirstMessage(userMessagesSnap.empty);
            } catch (queryError) {
              console.error("Error querying user messages:", queryError);
              setIsFirstMessage(true);
            }
          }
          console.log("Bot chat setup complete");
          setLoading(false);
        } catch (error) {
          console.error("Error setting up bot chat:", error);
          setLoading(false);
        }
        return;
      }

      try {
        console.log("Setting up user-to-user chat for item:", item.id);
        const chatsRef = collection(firestore, 'chats');
        const chatQuery = query(chatsRef, where('itemId', '==', item.id), where('participants', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(chatQuery, async (querySnapshot) => {
          console.log("Chat query snapshot size:", querySnapshot.size);
          let existingChat = null;
          querySnapshot.forEach((docSnap) => {
            const chatData = docSnap.data();
            if (chatData.participants.includes(item.itemOwnerId) && chatData.participants.includes(user.uid)) {
              existingChat = { id: docSnap.id, ...chatData };
            }
          });

          if (existingChat) {
            console.log("Found existing chat:", existingChat.id);
            setChatId(existingChat.id);
          } else {
            console.log("Creating new user-to-user chat...");
            const newChatRef = await addDoc(chatsRef, {
              itemId: item.id,
              itemName: item.itemName,
              itemImage: item.images?.[0] || null,
              participants: [user.uid, item.itemOwnerId],
              createdAt: serverTimestamp(),
              lastMessage: '',
              lastMessageTime: serverTimestamp(),
            });
            setChatId(newChatRef.id);
          }
          console.log("User-to-user chat setup complete");
          setLoading(false);
        }, (error) => {
          console.error("Error in user-to-user chat snapshot:", error);
          setLoading(false);
        });
        return unsubscribe;
      } catch (error) {
        console.error('Error setting up user-to-user chat:', error);
        setLoading(false);
      }
    };

    setupChat();
  }, [user, item, isBotChat]);

  useEffect(() => {
    if (!chatId) return;

    console.log("Setting up messages listener for chatId:", chatId);
    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log("Messages snapshot received, size:", querySnapshot.size);
      const messagesData = [];
      querySnapshot.forEach((doc) => {
        const message = { id: doc.id, ...doc.data() };
        if (typingRef.current && typingRef.current.id === message.id) {
          message.text = typingRef.current.text;
          message.isTyping = true;
        }
        messagesData.push(message);
      });
      // Sort messages by timestamp to ensure latest is last
      messagesData.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return a.timestamp.toMillis() - b.timestamp.toMillis();
        }
        return 0;
      });
      
      // Update the messages length ref to track changes
      messagesLengthRef.current = messagesData.length;
      
      setMessages(messagesData);
      
      // Scroll to bottom when messages change
      scrollToBottom();
    }, (error) => {
      console.error("Error in messages snapshot:", error);
    });

    return () => {
      console.log("Unsubscribing from messages listener");
      unsubscribe();
    };
  }, [chatId]);

  // More reliable scroll to bottom function
  const scrollToBottom = () => {
    if (messages.length === 0) return;
    
    // Use multiple techniques to ensure scrolling works
    setTimeout(() => {
      if (flatListRef.current) {
        try {
          // First try scrollToEnd which is more reliable
          flatListRef.current.scrollToEnd({ animated: false });
          
          // Backup: use scrollToIndex as fallback with try/catch
          try {
            flatListRef.current.scrollToIndex({ 
              index: Math.max(0, messagesLengthRef.current - 1),
              animated: false,
              viewPosition: 1
            });
          } catch (indexError) {
            console.log("scrollToIndex error:", indexError);
          }
        } catch (error) {
          console.error("Error scrolling to bottom:", error);
        }
      }
    }, 300); // Increased delay for more reliable rendering
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom();
    }
  }, [loading]);

  // Explicitly watch for messages length changes
  useEffect(() => {
    if (messages.length !== messagesLengthRef.current) {
      messagesLengthRef.current = messages.length;
      scrollToBottom();
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !chatId) return;

    try {
      const messagesRef = collection(firestore, 'chats', chatId, 'messages');
      const chatRef = doc(firestore, 'chats', chatId);

      const messageData = {
        senderId: user.uid,
        text: inputMessage.trim(),
        timestamp: serverTimestamp(),
        read: false,
      };
      console.log("Sending user message:", messageData.text);
      await addDoc(messagesRef, messageData);

      await updateDoc(chatRef, {
        lastMessage: inputMessage.trim(),
        lastMessageTime: serverTimestamp(),
      }).catch(async (error) => {
        if (error.code === 'not-found') {
          console.log("Chat document not found, creating it...");
          await setDoc(chatRef, {
            itemId: isBotChat ? 'constructionBot' : item.id,
            itemName: isBotChat ? 'Construction Help' : item.itemName,
            participants: isBotChat ? [user.uid, 'constructionBot'] : [user.uid, item.itemOwnerId],
            createdAt: serverTimestamp(),
            lastMessage: inputMessage.trim(),
            lastMessageTime: serverTimestamp(),
          });
        } else {
          throw error;
        }
      });

      if (isBotChat) {
        const botResponse = await getBotResponse(inputMessage, isFirstMessage);
        console.log("Bot response received:", botResponse);

        const botMessageRef = await addDoc(messagesRef, {
          senderId: 'constructionBot',
          text: '',
          timestamp: serverTimestamp(),
          read: false,
        });
        const botMessageId = botMessageRef.id;

        typingRef.current = { id: botMessageId, text: '', isTyping: true };
        setMessages(prev => [...prev.filter(msg => msg.id !== botMessageId), { ...typingRef.current }]);

        let currentText = '';
        const typingSpeed = 5; // Still fast: 5ms per character (~200 chars/sec)
        for (let i = 0; i < botResponse.length; i++) {
          await new Promise((resolve) => {
            setTimeout(() => {
              currentText += botResponse[i];
              typingRef.current.text = currentText;
              setMessages(prev => {
                const updated = [...prev.filter(msg => msg.id !== botMessageId)];
                updated.push({ ...typingRef.current });
                return updated;
              });
              resolve();
            }, typingSpeed);
          });
        }

        await updateDoc(doc(firestore, 'chats', chatId, 'messages', botMessageId), {
          text: botResponse,
        });
        await updateDoc(chatRef, {
          lastMessage: botResponse,
          lastMessageTime: serverTimestamp(),
        });

        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId ? { ...msg, text: botResponse, isTyping: false } : msg
        ));
        typingRef.current = null;
        setIsFirstMessage(false);

        // Scroll to bottom after bot response
        scrollToBottom();
      }

      setInputMessage('');
      // Clear input and immediately scroll to bottom for better UX
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      typingRef.current = null;
    }
  };

  const renderMessage = ({ item: message }) => {
    const isCurrentUser = message.senderId === user.uid;
    const isBot = message.senderId === 'constructionBot';
    const displayText = message.isTyping ? message.text : message.text;

    return (
      <View style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessage : isBot ? styles.botMessage : styles.otherUserMessage]}>
        <View style={[styles.messageBubble, isCurrentUser ? styles.currentUserBubble : isBot ? styles.botBubble : styles.otherUserBubble]}>
          <Text style={[styles.messageText, isCurrentUser ? styles.currentUserText : isBot ? styles.botText : styles.otherUserText]}>
            {displayText}
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

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#007bff" /><Text>Setting up your conversation...</Text></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {renderHeader()}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        initialNumToRender={messages.length} // Render all messages initially
        onContentSizeChange={scrollToBottom} // Add this to scroll when content size changes
        onLayout={scrollToBottom} // Add this to scroll when layout changes
        maintainVisibleContentPosition={{ // Add this to keep position when keyboard appears
          minIndexForVisible: 0,
        }}
        getItemLayout={(data, index) => ({
          length: 80, // Approximate message height
          offset: 80 * index,
          index,
        })}
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
  messagesContainer: { flexGrow: 1, padding: 16, paddingBottom: 24 }, // Add extra padding at bottom
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
  disabledSendButton: { backgroundColor: '#e0e0e0' },
});

export default ChatScreen;