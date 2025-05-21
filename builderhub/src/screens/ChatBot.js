import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { OPENAIAPI_KEY } from '@env';
import { useUser } from '../context/UserContext'; // Import UserContext
import { firestore } from '../../firebase/firebaseConfig'; // Import Firebase config
import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDocs,
  query,
  orderBy,
} from 'firebase/firestore';

export default function ChatBot({ navigation }) {
  const { user } = useUser(); // Get the current user from UserContext
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Hello! I am your Construction Assistant. How can I help you today?',
      sender: 'bot',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef();

  // Load chat history from Firestore when the user is authenticated
  useEffect(() => {
    if (!user) {
      setMessages([
        {
          id: '1',
          text: 'Please sign in to access your personal chat history.',
          sender: 'bot',
        },
      ]);
      return;
    }

    const loadMessages = async () => {
      try {
        const chatCollectionRef = collection(
          firestore,
          'users',
          user.uid,
          'chatHistory'
        );
        const q = query(chatCollectionRef, orderBy('timestamp', 'asc')); // Order by timestamp
        const querySnapshot = await getDocs(q);
        const loadedMessages = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // If no messages exist, keep the default welcome message
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Error loading messages from Firestore:', error);
      }
    };

    loadMessages();
  }, [user]);

  // Save a new message to Firestore
  const saveMessageToFirestore = async (newMessage) => {
    if (!user) return;
    try {
      const chatCollectionRef = collection(
        firestore,
        'users',
        user.uid,
        'chatHistory'
      );
      await addDoc(chatCollectionRef, {
        ...newMessage,
        timestamp: new Date().toISOString(), // Add timestamp for ordering
      });
    } catch (error) {
      console.error('Error saving message to Firestore:', error);
    }
  };

  const sendMessage = async () => {
    if (message.trim() === '' || !user) {
      if (!user) {
        Alert.alert('Sign In Required', 'Please sign in to send messages.');
      }
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    await saveMessageToFirestore(userMessage); // Save user message to Firestore
    setMessage('');
    setIsLoading(true);

    try {
      const systemPrompt = `You are a knowledgeable assistant specializing in the construction industry. 
      Provide accurate, helpful information about construction materials, techniques, safety regulations, 
      building codes, project management, and cost estimation. Keep answers concise and practical.`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((msg) => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text,
            })),
            { role: 'user', content: message },
          ],
          max_tokens: 300,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAIAPI_KEY}`,
          },
        }
      );

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: response.data.choices[0].message.content.trim(),
        sender: 'bot',
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
      await saveMessageToFirestore(botMessage); // Save bot response to Firestore
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'bot',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
      await saveMessageToFirestore(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    if (!user) return;

    try {
      // Delete all documents in the user's chatHistory subcollection
      const chatCollectionRef = collection(
        firestore,
        'users',
        user.uid,
        'chatHistory'
      );
      const querySnapshot = await getDocs(chatCollectionRef);
      const deletePromises = querySnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Reset to initial message
      const initialMessage = [
        {
          id: '1',
          text: 'Hello! I am your Construction Assistant. How can I help you today?',
          sender: 'bot',
        },
      ];
      setMessages(initialMessage);
      await saveMessageToFirestore(initialMessage[0]); // Save initial message
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  const confirmClearChat = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to clear chat history.');
      return;
    }
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearConversation },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        {navigation && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerText}>Construction Assistant</Text>
        <TouchableOpacity style={styles.clearButton} onPress={confirmClearChat}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        ref={flatListRef}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.sender === 'user' ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                item.sender === 'user' ? styles.userText : styles.botText,
              ]}
            >
              {item.text}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF6600" />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Ask about construction..."
          placeholderTextColor="#888"
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline={true}
          maxHeight={100}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            message.trim() === '' && styles.disabledButton,
          ]}
          onPress={sendMessage}
          disabled={message.trim() === '' || !user}
        >
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#F4B018',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 5,
  },
  clearButton: {
    padding: 5,
  },
  messageList: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    marginVertical: 5,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#FF6600',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  botBubble: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: 'black',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 25,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#FF6600',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 15,
    marginBottom: 5,
  },
  loadingText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
});