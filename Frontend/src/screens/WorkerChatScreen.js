import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    SafeAreaView,
    Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    doc, 
    getDoc, 
    addDoc, 
    serverTimestamp,
    updateDoc,
    getDocs,
    increment
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firestore } from '../../firebase/firebaseConfig';

const WorkerChatScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { userId } = route.params || {};
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [recipient, setRecipient] = useState(null);
    const [chatId, setChatId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    
    const flatListRef = useRef(null);

    useEffect(() => {
        const setupChat = async () => {
            if (!currentUser || !userId) {
                console.log('Missing currentUser or userId');
                setLoading(false);
                return;
            }

            if (!firestore) {
                console.error('Firestore not initialized');
                Alert.alert('Error', 'Database not available. Please try again later.');
                setLoading(false);
                return;
            }
            
            try {
                const userDocRef = doc(firestore, 'users', userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setRecipient(userDoc.data());
                } else {
                    console.log('Recipient user not found:', userId);
                }
                
                const chatQuery1 = query(
                    collection(firestore, 'workerChats'),
                    where('participants', '==', [currentUser.uid, userId])
                );
                
                const chatQuery2 = query(
                    collection(firestore, 'workerChats'),
                    where('participants', '==', [userId, currentUser.uid])
                );
                
                const [snapshot1, snapshot2] = await Promise.all([
                    getDocs(chatQuery1),
                    getDocs(chatQuery2)
                ]);
                
                let existingChatId = null;
                
                if (!snapshot1.empty) {
                    existingChatId = snapshot1.docs[0].id;
                } else if (!snapshot2.empty) {
                    existingChatId = snapshot2.docs[0].id;
                } else {
                    const chatRef = await addDoc(collection(firestore, 'workerChats'), {
                        participants: [currentUser.uid, userId],
                        createdAt: serverTimestamp(),
                        lastMessage: null,
                        lastMessageTime: serverTimestamp(),
                        unreadCount: {
                            [currentUser.uid]: 0,
                            [userId]: 0
                        }
                    });
                    existingChatId = chatRef.id;
                }
                
                setChatId(existingChatId);
            } catch (error) {
                console.error('Error setting up chat:', error);
                Alert.alert('Error', 'Failed to set up chat. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        
        setupChat();
    }, [currentUser, userId]);

    useEffect(() => {
        if (!chatId || !firestore || !currentUser) return;

        const messagesQuery = query(
            collection(firestore, `workerChats/${chatId}/messages`),
            orderBy('timestamp', 'asc')
        );

        const markMessagesAsRead = async (unreadMessages) => {
            try {
                const updatePromises = unreadMessages.map((messageDoc) =>
                    updateDoc(doc(firestore, `workerChats/${chatId}/messages`, messageDoc.id), {
                        read: true
                    })
                );
                await Promise.all(updatePromises);

                if (unreadMessages.length > 0) {
                    const chatRef = doc(firestore, 'workerChats', chatId);
                    await updateDoc(chatRef, {
                        [`unreadCount.${currentUser.uid}`]: 0 // Reset current user's unread count
                    });
                    console.log(`Reset unreadCount for ${currentUser.uid} to 0`);
                }
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        };

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const messageList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setMessages(messageList);
            
            const unreadMessages = snapshot.docs.filter(doc => {
                const data = doc.data();
                return !data.read && data.senderId !== currentUser.uid;
            });

            if (unreadMessages.length > 0) {
                markMessagesAsRead(unreadMessages);
            }
        }, (error) => {
            console.error('Error in messages listener:', error);
        });
        
        return () => unsubscribe();
    }, [chatId, currentUser]);

    const sendMessage = async () => {
        if (!messageText.trim() || !chatId || !currentUser || !firestore) return;
        
        try {
            setIsSending(true);
            
            await addDoc(collection(firestore, `workerChats/${chatId}/messages`), {
                text: messageText.trim(),
                senderId: currentUser.uid,
                timestamp: serverTimestamp(),
                read: false // New message is unread for the recipient
            });
            
            const chatRef = doc(firestore, 'workerChats', chatId);
            await updateDoc(chatRef, {
                lastMessage: messageText.trim(),
                lastMessageTime: serverTimestamp(),
                [`unreadCount.${userId}`]: increment(1), // Increment only recipient's unread count
                [`unreadCount.${currentUser.uid}`]: 0 // Ensure sender's count stays 0
            });
            console.log(`Sent message, incremented unreadCount for ${userId}, reset for ${currentUser.uid}`);
            
            setMessageText('');
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp || !timestamp.seconds) return '';
        
        const date = new Date(timestamp.seconds * 1000);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    };

    const renderMessageItem = ({ item }) => {
        const isCurrentUser = item.senderId === currentUser?.uid;
        
        return (
            <View style={[
                styles.messageContainer,
                isCurrentUser ? styles.rightMessage : styles.leftMessage
            ]}>
                {!isCurrentUser && recipient?.profileImage && (
                    <Image 
                        source={{ uri: recipient.profileImage }} 
                        style={styles.messageSenderImage} 
                    />
                )}
                <View style={[
                    styles.messageBubble,
                    isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
                ]}>
                    <Text style={[
                        styles.messageText,
                        isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText
                    ]}>
                        {item.text}
                    </Text>
                    <Text style={styles.timeText}>
                        {formatTimestamp(item.timestamp)}
                        {isCurrentUser && (
                            <Ionicons 
                                name={item.read ? "checkmark-done" : "checkmark"} 
                                size={14} 
                                color={item.read ? "#34B7F1" : "#8F8F8F"} 
                                style={{ marginLeft: 4 }} 
                            />
                        )}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0095f6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                
                <View style={styles.headerUserInfo}>
                    {recipient?.profileImage ? (
                        <Image 
                            source={{ uri: recipient.profileImage }} 
                            style={styles.headerUserImage} 
                        />
                    ) : (
                        <View style={styles.headerUserImagePlaceholder}>
                            <Text style={styles.headerUserImagePlaceholderText}>
                                {recipient?.name?.charAt(0) || '?'}
                            </Text>
                        </View>
                    )}
                    
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerUsername}>{recipient?.name || 'User'}</Text>
                        <Text style={styles.headerStatus}>Online</Text>
                    </View>
                </View>
                
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerActionButton}>
                        <Ionicons name="call-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerActionButton}>
                        <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessageItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesContainer}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles" size={50} color="#ccc" />
                        <Text style={styles.emptyText}>No messages yet</Text>
                        <Text style={styles.emptySubtext}>
                            Send a message to start the conversation
                        </Text>
                    </View>
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={styles.inputContainer}
            >
                <TouchableOpacity style={styles.attachButton}>
                    <Ionicons name="add-circle-outline" size={24} color="#0095f6" />
                </TouchableOpacity>
                
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline={true}
                    maxLength={500}
                />
                
                <TouchableOpacity 
                    style={[
                        styles.sendButton,
                        (!messageText.trim() || isSending) ? styles.sendButtonDisabled : {}
                    ]} 
                    onPress={sendMessage}
                    disabled={!messageText.trim() || isSending}
                >
                    {isSending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name="send" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#0095f6',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    backButton: {
        padding: 4,
    },
    headerUserInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    headerUserImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#fff',
    },
    headerUserImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerUserImagePlaceholderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerTextContainer: {
        justifyContent: 'center',
    },
    headerUsername: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerStatus: {
        fontSize: 12,
        color: '#e0f7fa',
    },
    headerActions: {
        flexDirection: 'row',
        marginLeft: 'auto',
    },
    headerActionButton: {
        padding: 8,
        marginLeft: 8,
    },
    messagesContainer: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
        flexGrow: 1,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '80%',
    },
    leftMessage: {
        alignSelf: 'flex-start',
    },
    rightMessage: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    messageSenderImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
        alignSelf: 'flex-end',
    },
    messageBubble: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 8,
        maxWidth: '100%',
    },
    currentUserBubble: {
        backgroundColor: '#0095f6',
    },
    otherUserBubble: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    messageText: {
        fontSize: 15,
    },
    currentUserMessageText: {
        color: '#fff',
    },
    otherUserMessageText: {
        color: '#333',
    },
    timeText: {
        fontSize: 10,
        color: '#f0f0f0',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    attachButton: {
        padding: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 16,
        maxHeight: 100,
        marginHorizontal: 8,
    },
    sendButton: {
        backgroundColor: '#0095f6',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#b0cfe0',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#999',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        marginTop: 8,
    },
});

export default WorkerChatScreen;