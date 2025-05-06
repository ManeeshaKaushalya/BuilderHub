// ChatBot.js
import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function ChatBot({ navigation }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello! I am your Construction Assistant. How can I help you today?', sender: 'bot' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef();

  // Replace with your actual OpenAI API key
  const OPENAI_API_KEY = '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';

  // Load chat history on component mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const savedMessages = await AsyncStorage.getItem('constructionAssistantChat');
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          // Only set messages if there are saved messages
          if (parsedMessages && parsedMessages.length > 0) {
            setMessages(parsedMessages);
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };
    
    loadMessages();
  }, []);

  // Save messages to AsyncStorage whenever they change
  useEffect(() => {
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem('constructionAssistantChat', JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    };
    
    saveMessages();
  }, [messages]);

  const sendMessage = async () => {
    if (message.trim() === '') return;
    
    // Add user message to the chat
    const userMessage = { id: Date.now().toString(), text: message, sender: 'user' };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      // Create a construction-focused system prompt
      const systemPrompt = `You are a knowledgeable assistant specializing in the construction industry. 
      Provide accurate, helpful information about construction materials, techniques, safety regulations, 
      building codes, project management, and cost estimation. Keep answers concise and practical.`;

      // Call OpenAI API
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4-turbo', // or another appropriate model
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            })),
            { role: 'user', content: message }
          ],
          max_tokens: 300
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );

      // Add bot response to chat
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: response.data.choices[0].message.content.trim(),
        sender: 'bot'
      };
      
      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      // Add error message
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'bot'
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    try {
      // Keep only the initial greeting message
      const initialMessage = [{ 
        id: '1', 
        text: 'Hello! I am your Construction Assistant. How can I help you today?', 
        sender: 'bot' 
      }];
      
      setMessages(initialMessage);
      await AsyncStorage.setItem('constructionAssistantChat', JSON.stringify(initialMessage));
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
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
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={clearConversation}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={messages}
        ref={flatListRef}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.messageText, item.sender === 'user' ? styles.userText : styles.botText]}>
              {item.text}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
          style={[styles.sendButton, message.trim() === '' && styles.disabledButton]} 
          onPress={sendMessage}
          disabled={message.trim() === ''}
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
    backgroundColor: '#F4B018', // Construction orange
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