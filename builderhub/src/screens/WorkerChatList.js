import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Image,
    StyleSheet,
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#0095f6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    newChatButton: {
        padding: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 12,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 16,
    },
    clearButton: {
        padding: 8,
    },
    chatsList: {
        paddingTop: 8,
    },
    chatItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    assistantItem: {
        backgroundColor: '#f9f9f9',
        borderLeftWidth: 4,
        borderLeftColor: '#FF6600',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#0095f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    assistantAvatar: {
        backgroundColor: '#FF6600',
    },
    avatarPlaceholderText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    onlineStatusIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#fff',
    },
    alwaysOnline: {
        backgroundColor: '#FF6600',
    },
    chatInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatName: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 8,
    },
    assistantName: {
        color: '#333',
    },
    chatTime: {
        fontSize: 12,
        color: '#999',
    },
    messagePreviewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    messagePreview: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        marginRight: 8,
    },
    unreadMessage: {
        fontWeight: 'bold',
        color: '#333',
    },
    unreadBadge: {
        backgroundColor: '#0095f6',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#999',
        marginTop: 16,
        marginBottom: 24,
    },
    startChatButton: {
        backgroundColor: '#0095f6',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    startChatButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default WorkerChatsList;