import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ChatList from './MarketScreens/ChatList'; // Marketplace chat list (uses 'chats' collection)
import WorkerChatsList from './WorkerChatList'; // Worker chat list (uses 'workerChats' collection)

function MessageScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('worker'); // Default to worker chats

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'worker' && styles.activeTab]}
          onPress={() => setActiveTab('worker')}
          accessibilityLabel="View Worker Chats"
          accessibilityHint="Switches to the worker chats tab"
        >
          <Text style={[styles.tabText, activeTab === 'worker' && styles.activeTabText]}>
            Worker Chats
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'market' && styles.activeTab]}
          onPress={() => setActiveTab('market')}
          accessibilityLabel="View Marketplace Chats"
          accessibilityHint="Switches to the marketplace chats tab"
        >
          <Text style={[styles.tabText, activeTab === 'market' && styles.activeTabText]}>
            Marketplace Chats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conditional Rendering of Chat Lists */}
      {activeTab === 'worker' ? (
        <WorkerChatsList navigation={navigation} />
      ) : (
        <ChatList navigation={navigation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f7fa',
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4a6fa5',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  activeTabText: {
    fontWeight: '700',
  },
});

export default MessageScreen;