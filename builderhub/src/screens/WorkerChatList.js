import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    SafeAreaView,
    TextInput,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    doc, 
    getDoc,
    getDocs
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firestore } from '../../firebase/firebaseConfig';
import styles from '../styles/WorkerChatsListStyles'; 

const WorkerChatsList = ({ navigation }) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [filteredChats, setFilteredChats] = useState([]);
    
    useEffect(() => {
        if (!currentUser) {
            console.log('No current user authenticated');
            setLoading(false);
            return;
        }
        
        const chatsQuery = query(
            collection(firestore, 'workerChats'),
            where('participants', 'array-contains', currentUser.uid),
            orderBy('lastMessageTime', 'desc')
        );
        
        const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
            try {
                const chatsList = await Promise.all(
                    snapshot.docs.map(async (chatDoc) => {
                        const chatData = chatDoc.data();
                        const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
                        
                        let userData = null;
                        if (otherUserId) {
                            const userDoc = await getDoc(doc(firestore, 'users', otherUserId));
                            if (userDoc.exists()) {
                                userData = userDoc.data();
                            }
                        }
                        
                        let lastMessageTime = null;
                        if (chatData.lastMessageTime) {
                            lastMessageTime = chatData.lastMessageTime.toDate();
                        }
                        
                        const unreadCount = chatData.unreadCount?.[currentUser.uid] || 0;
                        console.log(`Chat ${chatDoc.id} unreadCount for ${currentUser.uid}: ${unreadCount}`);
                        
                        return {
                            id: chatDoc.id,
                            lastMessage: chatData.lastMessage || 'Start a conversation',
                            lastMessageTime: lastMessageTime,
                            unreadCount: unreadCount,
                            otherUserId: otherUserId,
                            otherUserName: userData?.name || 'Unknown User',
                            otherUserImage: userData?.profileImage || null,
                            otherUserStatus: userData?.status || 'offline'
                        };
                    })
                );
                
                console.log('Worker chats loaded:', chatsList);
                setChats(chatsList);
                setFilteredChats(chatsList);
                setLoading(false);
            } catch (error) {
                console.error('Error loading worker chats:', error);
                if (error.code === 'failed-precondition') {
                    Alert.alert(
                        'Database Error',
                        'This feature requires a database index. Please contact support or try again later.'
                    );
                }
                setLoading(false);
            }
        }, (error) => {
            console.error('Snapshot listener error:', error);
            setLoading(false);
        });
        
        return () => unsubscribe();
    }, [currentUser]);
    
    useEffect(() => {
        if (searchText.trim() === '') {
            setFilteredChats(chats);
        } else {
            const filtered = chats.filter(chat => 
                chat.otherUserName.toLowerCase().includes(searchText.toLowerCase())
            );
            setFilteredChats(filtered);
        }
    }, [searchText, chats]);
    
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const messageDate = new Date(timestamp);
        const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
        
        if (messageDay.getTime() === today.getTime()) {
            return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (messageDay.getTime() === yesterday.getTime()) {
            return 'Yesterday';
        } else if (now.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[messageDate.getDay()];
        } else {
            return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };
    
    const navigateToNewChat = () => {
        navigation.navigate('ContactsScreen');
    };
    
    const navigateToConstructionAssistant = () => {
        navigation.navigate('ChatBot');
    };
    
    const renderChatItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.chatItem}
            onPress={() => navigation.navigate('WorkerChatScreen', { userId: item.otherUserId })}
        >
            <View style={styles.avatarContainer}>
                {item.otherUserImage ? (
                    <Image 
                        source={{ uri: item.otherUserImage }} 
                        style={styles.avatar} 
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarPlaceholderText}>
                            {item.otherUserName.charAt(0)}
                        </Text>
                    </View>
                )}
                
                {item.otherUserStatus === 'online' && (
                    <View style={styles.onlineStatusIndicator} />
                )}
            </View>
            
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName} numberOfLines={1}>
                        {item.otherUserName}
                    </Text>
                    <Text style={styles.chatTime}>
                        {formatTimestamp(item.lastMessageTime)}
                    </Text>
                </View>
                
                <View style={styles.messagePreviewContainer}>
                    <Text 
                        style={[
                            styles.messagePreview, 
                            item.unreadCount > 0 ? styles.unreadMessage : null
                        ]} 
                        numberOfLines={1}
                    >
                        {item.lastMessage}
                    </Text>
                    
                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                                {item.unreadCount > 99 ? '99+' : item.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
    
    // Construction Assistant component
    const ConstructionAssistantItem = () => (
        <TouchableOpacity 
            style={[styles.chatItem, styles.assistantItem]}
            onPress={navigateToConstructionAssistant}
        >
            <View style={styles.avatarContainer}>
                <View style={[styles.avatarPlaceholder, styles.assistantAvatar]}>
                    <Ionicons name="construct-outline" size={28} color="#fff" />
                </View>
                <View style={[styles.onlineStatusIndicator, styles.alwaysOnline]} />
            </View>
            
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={[styles.chatName, styles.assistantName]} numberOfLines={1}>
                        Construction Assistant
                    </Text>
                    <Text style={styles.chatTime}>
                        Always available
                    </Text>
                </View>
                
                <View style={styles.messagePreviewContainer}>
                    <Text style={styles.messagePreview} numberOfLines={1}>
                        Get expert construction advice instantly
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Worker Chats</Text>
                <TouchableOpacity 
                    style={styles.newChatButton}
                    onPress={navigateToNewChat}
                >
                    <Ionicons name="create-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search conversations"
                    value={searchText}
                    onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                    <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={() => setSearchText('')}
                    >
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>
            
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0095f6" />
                </View>
            ) : (
                <FlatList
                    data={filteredChats}
                    renderItem={renderChatItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.chatsList}
                    ListHeaderComponent={
                        // Only show Construction Assistant if not searching or if search includes "construction"
                        searchText.trim() === '' || 
                        'construction assistant'.includes(searchText.toLowerCase()) ? 
                        <ConstructionAssistantItem /> : null
                    }
                    ListEmptyComponent={
                        searchText.length > 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No results found</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
                                <Text style={styles.emptyText}>No worker conversations yet</Text>
                                <TouchableOpacity 
                                    style={styles.startChatButton}
                                    onPress={navigateToNewChat}
                                >
                                    <Text style={styles.startChatButtonText}>Start a new chat</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default WorkerChatsList;