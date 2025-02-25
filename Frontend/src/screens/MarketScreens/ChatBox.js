import React, { useState, useEffect, useRef } from 'react';
import {View,Text,TextInput,TouchableOpacity,FlatList,StyleSheet,KeyboardAvoidingView,Platform,ActivityIndicator,Image}from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection,addDoc,query, where, orderBy, onSnapshot, serverTimestamp, doc,getDoc,updateDoc} from 'firebase/firestore';
import { useUser } from '../../context/UserContext';

const ChatScreen = ({ route, navigation }) => {
  const { item, sellerData } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState(null);
  const { user } = useUser();
  const flatListRef = useRef(null);

  // Get or create a chat session between buyer and seller
  useEffect(() => {
    const setupChat = async () => {
      try {
        // Check if a chat already exists between these users for this item
        const chatsRef = collection(firestore, 'chats');
        const chatQuery = query(
          chatsRef,
          where('itemId', '==', item.id),
          where('participants', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(chatQuery, async (querySnapshot) => {
          let existingChat = null;
          
          querySnapshot.forEach((doc) => {
            const chatData = doc.data();
            // Check if this chat involves both the current user and the item owner
            if (chatData.participants.includes(item.itemOwnerId) && 
                chatData.participants.includes(user.uid)) {
              existingChat = { id: doc.id, ...chatData };
            }
          });

          if (existingChat) {
            // Use existing chat
            setChatId(existingChat.id);
          } else {
            // Create a new chat
            const newChatRef = await addDoc(chatsRef, {
              itemId: item.id,
              itemName: item.itemName,
              itemImage: item.images && item.images.length > 0 ? item.images[0] : null,
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

    if (user && item) {
      setupChat();
    }
  }, [user, item]);

  // Listen for messages once we have a chatId
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = [];
      querySnapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() });
      });
      setMessages(messagesData);
      
      // Scroll to the bottom when new messages arrive
      if (messagesData.length > 0 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current.scrollToEnd({ animated: true });
        }, 200);
      }
    });

    return unsubscribe;
  }, [chatId]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !chatId) return;

    try {
      // Add message to the messages subcollection
      const messagesRef = collection(firestore, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        text: inputMessage.trim(),
        timestamp: serverTimestamp(),
        read: false
      });
      
      // Update last message in chat document using updateDoc instead
      const chatRef = doc(firestore, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: inputMessage.trim(),
        lastMessageTime: serverTimestamp()
      });

      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item: message }) => {
    const isCurrentUser = message.senderId === user.uid;
  
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {message.text}
          </Text>
          <View style={styles.timeContainer}>
            <Text style={[
              styles.messageTime,
              isCurrentUser ? styles.currentUserTime : styles.otherUserTime
            ]}>
              {message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sending...'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Chat header with seller/item info
  const renderHeader = () => (
    <View style={styles.chatHeader}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      
      <View style={styles.chatHeaderInfo}>
        <View style={styles.chatHeaderLeft}>
          {sellerData && sellerData.profileImage ? (
            <Image source={{ uri: sellerData.profileImage }} style={styles.sellerAvatar} />
          ) : (
            <View style={styles.sellerAvatarPlaceholder}>
              <Icon name="person" size={24} color="#fff" />
            </View>
          )}
          
          <View style={styles.chatHeaderText}>
            <Text style={styles.sellerName}>
              {sellerData ? sellerData.name : 'Seller'}
            </Text>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.itemName}
            </Text>
          </View>
        </View>
        
        <View style={styles.chatHeaderRight}>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>Rs. {Number(item.price).toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Setting up your conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {renderHeader()}
      
      {messages.length === 0 ? (
        <View style={styles.emptyChat}>
          <Icon name="chat" size={60} color="#e0e0e0" />
          <Text style={styles.emptyChatText}>Start your conversation with the seller</Text>
          <Text style={styles.emptyChatSubtext}>Ask about the item condition, delivery options, or negotiate the price</Text>
          
          <View style={styles.suggestionContainer}>
            <Text style={styles.suggestedMessagesTitle}>Suggested messages:</Text>
            <TouchableOpacity 
              style={styles.suggestedMessage}
              onPress={() => setInputMessage("Is this item still available?")}
            >
              <Text style={styles.suggestedMessageText}>Is this item still available?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.suggestedMessage}
              onPress={() => setInputMessage(`Can you deliver to my location?`)}
            >
              <Text style={styles.suggestedMessageText}>Can you deliver to my location?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.suggestedMessage}
              onPress={() => setInputMessage(`Would you accept Rs. ${Math.floor(item.price * 0.9)} for this item?`)}
            >
              <Text style={styles.suggestedMessageText}>Would you accept a lower price?</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputMessage.trim() && styles.disabledSendButton]}
          onPress={sendMessage}
          disabled={!inputMessage.trim()}
        >
          <Icon 
            name="send" 
            size={24} 
            color={inputMessage.trim() ? "#fff" : "#ccc"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  chatHeader: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  backButton: {
    marginBottom: 8,
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  sellerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatHeaderText: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemName: {
    fontSize: 14,
    color: '#666',
  },
  chatHeaderRight: {
    marginLeft: 8,
  },
  priceBadge: {
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  priceText: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '600',
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 8, // Reduced from 22
  },
  currentUserBubble: {
    backgroundColor: '#007bff',
  },
  otherUserBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4, // Add space between text and timestamp
  },
  timeContainer: {
    alignSelf: 'flex-end', // Align to right side
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    // Remove position: 'absolute' properties
    color: '#999',
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTime: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f3f4',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 48,
    fontSize: 16,
    maxHeight: 120,
    color: '#333',
  },
  sendButton: {
    position: 'absolute',
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: '#e0e0e0',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  suggestionContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  suggestedMessagesTitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 12,
  },
  suggestedMessage: {
    backgroundColor: '#f1f3f4',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  suggestedMessageText: {
    fontSize: 14,
    color: '#333',
  },
});

export default ChatScreen;