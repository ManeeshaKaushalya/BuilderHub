import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import ChatList from './MarketScreens/ChatList'; // Marketplace chat list (uses 'chats' collection)
import WorkerChatsList from './WorkerChatList'; // Worker chat list (uses 'workerChats' collection)

function MessageScreen() {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('market'); // Default to marketplace chats

  return (
    <View style={[
      styles.container,
      isDarkMode ? styles.darkContainer : styles.lightContainer
    ]}>
      {/* Tab Navigation */}
      <View style={[
        styles.tabContainer,
        isDarkMode ? styles.darkTabContainer : styles.lightTabContainer
      ]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'market' && (isDarkMode ? styles.activeDarkTab : styles.activeLightTab)
          ]}
          onPress={() => setActiveTab('market')}
        >
          <Text style={[
            styles.tabText,
            isDarkMode ? styles.darkText : styles.lightText,
            activeTab === 'market' && styles.activeTabText
          ]}>
            Marketplace Chats
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'worker' && (isDarkMode ? styles.activeDarkTab : styles.activeLightTab)
          ]}
          onPress={() => setActiveTab('worker')}
        >
          <Text style={[
            styles.tabText,
            isDarkMode ? styles.darkText : styles.lightText,
            activeTab === 'worker' && styles.activeTabText
          ]}>
            Worker Chats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conditional Rendering of Chat Lists */}
      {activeTab === 'market' ? (
        <ChatList navigation={navigation} />
      ) : (
        <WorkerChatsList navigation={navigation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingTop: 10,
  },
  lightTabContainer: {
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f7fa',
  },
  darkTabContainer: {
    borderBottomColor: '#333',
    backgroundColor: '#1e1e1e',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeLightTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4a6fa5',
  },
  activeDarkTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4a6fa5',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  lightText: {
    color: '#2c3e50',
  },
  darkText: {
    color: '#fff',
  },
  activeTabText: {
    fontWeight: '700',
  },
});

export default MessageScreen;