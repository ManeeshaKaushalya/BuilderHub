import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
  Keyboard,
  Animated,
  Dimensions,
  Linking,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../../../firebase/firebaseConfig';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  limit,
  getDocs,
  startAfter
} from 'firebase/firestore';
import { storage } from '../../../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '../../context/UserContext';
import { getBotResponse } from './BotService';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useNetInfo } from '@react-native-community/netinfo';
import { BlurView } from 'expo-blur';

const MESSAGES_PER_LOAD = 20;

const ChatScreen = ({ route, navigation }) => {
  const { item, sellerData, isBotChat = false } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachment, setAttachment] = useState(null);

  const { user, isLoading: isAuthLoading } = useUser();
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const netInfo = useNetInfo();
  const isOffline = !netInfo.isConnected;

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  // Set up screen navigation options
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });

    return () => {
      if (chatId && !isBotChat) {
        updateTypingStatus(false);
      }
    };
  }, [navigation, chatId, isBotChat]);

  // Set up chat connection and create chat if needed
  useEffect(() => {
    const setupChat = async () => {
      if (isAuthLoading) {
        console.log('Waiting for auth to resolve');
        return;
      }

      if (!user || !user.uid) {
        console.log('User or user.uid is not available');
        setIsLoading(false);
        Alert.alert(
          'Authentication Required',
          'Please sign in to access the chat.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
        return;
      }

      if (!item?.id || !item?.itemOwnerId) {
        console.error('Item ID or item owner ID is missing');
        setIsLoading(false);
        Alert.alert('Error', 'Invalid item data. Please try again.');
        return;
      }

      try {
        if (isBotChat) {
          await setupBotChat();
        } else {
          await setupUserChat();
        }
      } catch (error) {
        console.error('Error setting up chat:', error);
        setIsLoading(false);
        Alert.alert('Error', 'Failed to set up chat. Please try again.');
      }
    };

    setupChat();
  }, [user, isAuthLoading, item, isBotChat, navigation]);

  // Bot chat setup function
  const setupBotChat = async () => {
    const botChatId = `bot_${user.uid}`;
    setChatId(botChatId);

    const chatRef = doc(firestore, 'chats', botChatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        itemId: 'constructionBot',
        itemName: 'Construction Help',
        participants: [user.uid, 'constructionBot'],
        createdAt: serverTimestamp(),
        lastMessage: 'Ask me about construction!',
        lastMessageTime: serverTimestamp(),
        lastMessageType: 'text'
      });
    }

    setIsLoading(false);
  };

  // User-to-user chat setup function
  const setupUserChat = async () => {
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
        if (chatData.participants.includes(item.itemOwnerId) &&
            chatData.participants.includes(user.uid)) {
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
          lastMessageTime: serverTimestamp(),
          lastMessageType: 'text',
          typing: {}
        });
        setChatId(newChatRef.id);
      }

      setIsLoading(false);
    }, (error) => {
      console.error('Chat query error:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to load chat. Please try again.');
    });

    return unsubscribe;
  };

  // Listen for new messages and typing indicators
  useEffect(() => {
    if (!chatId) return;

    loadInitialMessages();

    if (!isBotChat) {
      const chatRef = doc(firestore, 'chats', chatId);
      return onSnapshot(chatRef, (doc) => {
        if (doc.exists()) {
          const chatData = doc.data();
          if (chatData.typing && chatData.typing[item.itemOwnerId]) {
            setIsTyping(true);
          } else {
            setIsTyping(false);
          }
        }
      }, (error) => {
        console.error('Typing listener error:', error);
      });
    }
  }, [chatId, isBotChat, item.itemOwnerId]);

  // Load initial messages
  const loadInitialMessages = async () => {
    if (!chatId) return;

    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(MESSAGES_PER_LOAD)
    );

    try {
      const querySnapshot = await getDocs(q);
      const messagesData = [];

      querySnapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() });
      });

      updateReadStatus(querySnapshot);

      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMoreMessages(querySnapshot.docs.length === MESSAGES_PER_LOAD);
      } else {
        setHasMoreMessages(false);
      }

      setMessages(messagesData.reverse());
      setIsLoading(false);

      setupMessageListener();
    } catch (error) {
      console.error('Error loading initial messages:', error);
      setIsLoading(false);
    }
  };

  // Load more messages when scrolling up
  const loadMoreMessages = async () => {
    if (!hasMoreMessages || isLoadingMore || !chatId || !lastVisible) return;

    setIsLoadingMore(true);

    try {
      const messagesRef = collection(firestore, 'chats', chatId, 'messages');
      const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        startAfter(lastVisible),
        limit(MESSAGES_PER_LOAD)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setHasMoreMessages(false);
        setIsLoadingMore(false);
        return;
      }

      const olderMessages = [];
      querySnapshot.forEach((doc) => {
        olderMessages.push({ id: doc.id, ...doc.data() });
      });

      setMessages(prevMessages => [...prevMessages, ...olderMessages.reverse()]);

      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMoreMessages(querySnapshot.docs.length === MESSAGES_PER_LOAD);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Listen for new messages in real-time
  const setupMessageListener = useCallback(() => {
    if (!chatId) return;

    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    return onSnapshot(q, (querySnapshot) => {
      const newMessages = [];
      let hasNewMessage = false;

      querySnapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const message = { id: change.doc.id, ...change.doc.data() };
          const messageTime = message.timestamp?.toDate?.() || new Date();
          const isRecent = (new Date() - messageTime) < 60000;

          if (isRecent) {
            hasNewMessage = true;
            if (message.senderId !== user.uid) {
              updateMessageReadStatus(change.doc.id);
            }
            if (!messages.some(m => m.id === message.id)) {
              newMessages.push(message);
            }
          }
        }
      });

      if (newMessages.length > 0) {
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          newMessages.forEach(newMsg => {
            if (!updatedMessages.some(m => m.id === newMsg.id)) {
              updatedMessages.push(newMsg);
            }
          });
          return updatedMessages.sort((a, b) => {
            const timeA = a.timestamp?.toDate?.() || new Date();
            const timeB = b.timestamp?.toDate?.() || new Date();
            return timeA - timeB;
          });
        });

        if (hasNewMessage) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    }, (error) => {
      console.error('Message listener error:', error);
    });
  }, [chatId, user?.uid, messages]);

  // Update read status for all messages
  const updateReadStatus = (querySnapshot) => {
    if (isBotChat) return;

    querySnapshot.forEach((doc) => {
      const messageData = doc.data();
      if (messageData.senderId !== user.uid && !messageData.read) {
        updateMessageReadStatus(doc.id);
      }
    });
  };

  // Update read status for a specific message
  const updateMessageReadStatus = async (messageId) => {
    if (isBotChat) return;

    try {
      const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, { read: true });
    } catch (error) {
      console.error('Error updating message read status:', error);
    }
  };

  // Update typing status
  const updateTypingStatus = async (isTyping) => {
    if (isBotChat || !chatId) return;

    try {
      const chatRef = doc(firestore, 'chats', chatId);
      const updateData = {};
      updateData[`typing.${user.uid}`] = isTyping ? new Date().getTime() : null;
      await updateDoc(chatRef, updateData);
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  // Handle input text changes and typing indicator
  const handleInputChange = (text) => {
    setInputMessage(text);

    if (!isBotChat) {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      updateTypingStatus(true);

      const timeout = setTimeout(() => {
        updateTypingStatus(false);
      }, 3000);

      setTypingTimeout(timeout);
    }
  };

  // Handle image selection
  const handleImagePick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        alert('Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];

        setAttachment({
          uri: selectedAsset.uri,
          type: 'image',
          name: selectedAsset.uri.split('/').pop(),
          size: await getFileSizeFromUri(selectedAsset.uri)
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to select image. Please try again.');
    }
  };

  // Handle document selection
  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets[0]) {
        const docAsset = result.assets[0];

        if (docAsset.size > 5 * 1024 * 1024) {
          alert('File too large. Please select a file under 5MB.');
          return;
        }

        setAttachment({
          uri: docAsset.uri,
          type: 'document',
          name: docAsset.name,
          size: docAsset.size,
          mimeType: docAsset.mimeType
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Failed to select document. Please try again.');
    }
  };

  // Get file size from URI
  const getFileSizeFromUri = async (uri) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  };

  // Remove selected attachment
  const removeAttachment = () => {
    setAttachment(null);
  };

  // Upload file to Firebase Storage
  const uploadFile = async (uri, messageId) => {
    if (!uri) return null;

    try {
      const fileExtension = uri.split('.').pop();
      const fileName = `${chatId}/${messageId}.${fileExtension}`;
      const fileRef = ref(storage, `chats/${fileName}`);

      const response = await fetch(uri);
      const blob = await response.blob();

      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  // Send message function
  const sendMessage = async () => {
    if ((!inputMessage.trim() && !attachment) || !chatId || isSending) return;

    try {
      setIsSending(true);
      const messagesRef = collection(firestore, 'chats', chatId, 'messages');
      const chatRef = doc(firestore, 'chats', chatId);

      let messageData = {
        senderId: user.uid,
        senderName: user.displayName || 'User',
        timestamp: serverTimestamp(),
        read: false
      };

      if (inputMessage.trim()) {
        messageData.text = inputMessage.trim();
        messageData.type = 'text';
      }

      if (attachment) {
        const tempMessageId = Date.now().toString();
        const fileUrl = await uploadFile(attachment.uri, tempMessageId);

        if (fileUrl) {
          messageData.fileUrl = fileUrl;
          messageData.fileName = attachment.name;
          messageData.fileType = attachment.type;
          messageData.type = attachment.type;
        }
      }

      await addDoc(messagesRef, messageData);

      await updateDoc(chatRef, {
        lastMessage: inputMessage.trim() || (attachment ? `Sent ${attachment.type}` : ''),
        lastMessageTime: serverTimestamp(),
        lastMessageType: attachment ? attachment.type : 'text',
        lastMessageSenderId: user.uid
      });

      setInputMessage('');
      setAttachment(null);

      if (isBotChat && inputMessage.trim()) {
        handleBotResponse(inputMessage.trim());
      }

      if (!isBotChat) {
        updateTypingStatus(false);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle bot response
  const handleBotResponse = async (userMessage) => {
    try {
      setIsTyping(true);

      const botResponse = await new Promise((resolve) => {
        setTimeout(async () => {
          const response = await getBotResponse(userMessage);
          resolve(response);
        }, Math.random() * 1000 + 500);
      });

      const messagesRef = collection(firestore, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        senderId: 'constructionBot',
        senderName: 'Construction Bot',
        text: botResponse,
        timestamp: serverTimestamp(),
        read: false,
        type: 'text'
      });

      const chatRef = doc(firestore, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: botResponse,
        lastMessageTime: serverTimestamp(),
        lastMessageType: 'text',
        lastMessageSenderId: 'constructionBot'
      });

      setIsTyping(false);
    } catch (error) {
      console.error('Error sending bot response:', error);
      setIsTyping(false);
    }
  };

  // Format timestamp
  const formatMessageTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return 'Sending...';
    }

    const messageDate = timestamp.toDate();
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return messageDate.toLocaleDateString([], { day: '2-digit', month: 'short' }) +
           ', ' + messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render message item
  const renderMessage = ({ item: message, index }) => {
    const isCurrentUser = message.senderId === user.uid;
    const isBot = message.senderId === 'constructionBot';
    const showAvatar = !isCurrentUser &&
                      (index === 0 || messages[index - 1].senderId !== message.senderId);
    const isImage = message.type === 'image';
    const isDocument = message.type === 'document';

    const showDateSeparator = index === 0 ||
                             !isSameDay(message.timestamp?.toDate(),
                                       messages[index - 1].timestamp?.toDate());

    return (
      <>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatDateSeparator(message.timestamp?.toDate())}
            </Text>
          </View>
        )}

        <View style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : isBot ? styles.botMessage : styles.otherUserMessage
        ]}>
          {!isCurrentUser && showAvatar && (
            <View style={styles.avatarContainer}>
              {isBot ? (
                <Image source={require('../../../assets/bot-avatar.png')} style={styles.messageAvatar} />
              ) : sellerData?.profileImage ? (
                <Image source={{ uri: sellerData.profileImage }} style={styles.messageAvatar} />
              ) : (
                <View style={styles.messageAvatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {(sellerData?.name || 'S')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : isBot ? styles.botBubble : styles.otherUserBubble,
            (isImage || isDocument) && styles.mediaBubble
          ]}>
            {isImage && message.fileUrl && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ImageViewer', { uri: message.fileUrl })}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: message.fileUrl }}
                  style={styles.imageMessage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}

            {isDocument && message.fileUrl && (
              <TouchableOpacity
                style={styles.documentContainer}
                onPress={() => Linking.openURL(message.fileUrl)}
              >
                <Icon name="description" size={24} color="#4285F4" />
                <Text style={styles.documentName} numberOfLines={1}>
                  {message.fileName || 'Document'}
                </Text>
              </TouchableOpacity>
            )}

            {message.text && (
              <Text style={[
                styles.messageText,
                isCurrentUser ? styles.currentUserText : isBot ? styles.botText : styles.otherUserText
              ]}>
                {message.text}
              </Text>
            )}

            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                isCurrentUser ? styles.currentUserTime : isBot ? styles.botTime : styles.otherUserTime
              ]}>
                {formatMessageTime(message.timestamp)}
              </Text>

              {isCurrentUser && (
                <View style={styles.messageStatus}>
                  <Icon
                    name={message.read ? "done_all" : "done"}
                    size={16}
                    color={message.read ? "#4CAF50" : "#8e8e8e"}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  // Check if two dates are the same day
  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;

    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Format date for separator
  const formatDateSeparator = (date) => {
    if (!date) return 'Today';

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString([], {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDot} />
          <View style={[styles.typingDot, styles.typingDotMiddle]} />
          <View style={styles.typingDot} />
        </View>
        <Text style={styles.typingText}>
          {isBotChat ? 'Bot is typing...' : `${sellerData?.name || 'Seller'} is typing...`}
        </Text>
      </View>
    );
  };

  // Render list header (load more button)
  const renderListHeader = () => {
    if (!hasMoreMessages) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={loadMoreMessages}
        disabled={isLoadingMore}
      >
        {isLoadingMore ? (
          <ActivityIndicator size="small" color="#007bff" />
        ) : (
          <Text style={styles.loadMoreText}>Load earlier messages</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Render header component
  const renderHeader = () => (
    <Animated.View style={[styles.chatHeader, { opacity: headerOpacity }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.headerContent}>
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
                <Text style={styles.avatarText}>
                  {(sellerData?.name || 'S')[0].toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.chatHeaderText}>
              <Text style={styles.sellerName}>
                {isBotChat ? 'Construction Bot' : sellerData?.name || 'Seller'}
                {isTyping && !isBotChat && (
                  <Text style={styles.typingStatusText}> typing...</Text>
                )}
              </Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {isBotChat ? 'Expert construction advice' : item.itemName}
              </Text>
            </View>
          </View>

          {!isBotChat && (
            <View style={styles.chatHeaderRight}>
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>
                  Rs. {Number(item.price).toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.itemDetailsButton}
          onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })}
        >
          <Text style={styles.itemDetailsText}>View Item Details</Text>
          <Icon name="chevron-right" size={18} color="#007bff" />
        </TouchableOpacity>
      </View>

      {isOffline && (
        <View style={styles.offlineBar}>
          <Icon name="wifi-off" size={16} color="#fff" />
          <Text style={styles.offlineText}>No internet connection</Text>
        </View>
      )}
    </Animated.View>
  );

  // Render attachment preview
  const renderAttachmentPreview = () => {
    if (!attachment) return null;

    return (
      <View style={styles.attachmentPreview}>
        {attachment.type === 'image' ? (
          <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
        ) : (
          <View style={styles.documentPreview}>
            <Icon name="description" size={24} color="#4285F4" />
            <Text style={styles.documentPreviewName} numberOfLines={1}>
              {attachment.name}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.removeAttachment} onPress={removeAttachment}>
          <Icon name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render bottom input area
  const renderInputArea = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {renderAttachmentPreview()}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton} onPress={handleImagePick}>
          <Icon name="image" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.attachButton} onPress={handleDocumentPick}>
          <Icon name="attach-file" size={24} color="#666" />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={inputMessage}
          onChangeText={handleInputChange}
          placeholder={isBotChat ? "Ask about construction..." : "Type a message..."}
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          returnKeyType="default"
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputMessage.trim() && !attachment) && styles.disabledSendButton
          ]}
          onPress={sendMessage}
          disabled={(!inputMessage.trim() && !attachment) || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon
              name="send"
              size={22}
              color={(!inputMessage.trim() && !attachment) ? "#ccc" : "#fff"}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // Loading view
  if (isLoading || isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Setting up your conversation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        onEndReached={() => {
          if (messages.length > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
        }}
        onEndReachedThreshold={0.1}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderTypingIndicator}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={15}
        onRefresh={() => {
          setRefreshing(true);
          loadInitialMessages().finally(() => setRefreshing(false));
        }}
        refreshing={refreshing}
      />

      {renderInputArea()}
    </View>
  );
};

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555'
  },
  chatHeader: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 44 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 10
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  backButton: {
    marginBottom: 8,
    padding: 4
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  sellerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  chatHeaderText: {
    flex: 1
  },
  sellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  typingStatusText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666'
  },
  itemName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  chatHeaderRight: {
    marginLeft: 8
  },
  priceBadge: {
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#91d5ff'
  },
  priceText: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '600'
  },
  itemDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  itemDetailsText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500'
  },
  offlineBar: {
    backgroundColor: '#f44336',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  offlineText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500'
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 8
  },
  messageContainer: {
    marginBottom: 4,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'flex-end'
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    marginBottom: 8
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  botMessage: {
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 6
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#66a3ff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarInitial: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  mediaBubble: {
    padding: 4,
    overflow: 'hidden'
  },
  currentUserBubble: {
    backgroundColor: '#007bff',
    borderBottomRightRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  otherUserBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderBottomLeftRadius: 4
  },
  botBubble: {
    backgroundColor: '#e6f3ff',
    borderWidth: 1,
    borderColor: '#91d5ff',
    borderBottomLeftRadius: 4
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22
  },
  currentUserText: {
    color: '#fff'
  },
  otherUserText: {
    color: '#333'
  },
  botText: {
    color: '#0066cc'
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)'
  },
  otherUserTime: {
    color: '#999'
  },
  botTime: {
    color: '#6699cc'
  },
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  imageMessage: {
    width: 200,
    height: 200,
    borderRadius: 14,
    backgroundColor: '#f0f0f0'
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  documentName: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: '#333'
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16
  },
  dateSeparatorText: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    color: '#555',
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 8,
    width: 50,
    justifyContent: 'center'
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
    marginHorizontal: 2,
    opacity: 0.6
  },
  typingDotMiddle: {
    opacity: 0.8
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic'
  },
  loadMoreButton: {
    alignItems: 'center',
    padding: 12,
    marginBottom: 16
  },
  loadMoreText: {
    fontSize: 14,
    color: '#007bff'
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center'
  },
  attachButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f3f4',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
    color: '#333',
    marginHorizontal: 8
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  disabledSendButton: {
    backgroundColor: '#e0e0e0'
  },
  attachmentPreview: {
    backgroundColor: '#f1f3f4',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center'
  },
  attachmentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  documentPreviewName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    maxWidth: 200
  },
  removeAttachment: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  }
});

export default ChatScreen;