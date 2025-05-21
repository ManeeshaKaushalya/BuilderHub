import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    SafeAreaView,
    Alert,
    Modal
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
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { firestore } from '../../firebase/firebaseConfig';
import styles from '../styles/WorkerChatScreenStyles'; 

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
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    
    const flatListRef = useRef(null);
    const storage = getStorage();

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
                        [`unreadCount.${currentUser.uid}`]: 0
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

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Please allow access to photos to send images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets[0].uri) {
            await uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri) => {
        if (!chatId || !currentUser || !firestore || !storage) return;
        
        try {
            setIsSending(true);
            const response = await fetch(uri);
            const blob = await response.blob();
            const imageRef = ref(storage, `chatImages/${chatId}/${Date.now()}_${currentUser.uid}`);
            await uploadBytes(imageRef, blob);
            const imageUrl = await getDownloadURL(imageRef);

            await addDoc(collection(firestore, `workerChats/${chatId}/messages`), {
                type: 'image',
                imageUrl,
                senderId: currentUser.uid,
                timestamp: serverTimestamp(),
                read: false
            });

            const chatRef = doc(firestore, 'workerChats', chatId);
            await updateDoc(chatRef, {
                lastMessage: 'Image',
                lastMessageTime: serverTimestamp(),
                [`unreadCount.${userId}`]: increment(1),
                [`unreadCount.${currentUser.uid}`]: 0
            });
            console.log(`Sent image, incremented unreadCount for ${userId}, reset for ${currentUser.uid}`);
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Error', 'Failed to send image. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const sendMessage = async () => {
        if (!messageText.trim() || !chatId || !currentUser || !firestore) return;
        
        try {
            setIsSending(true);
            
            await addDoc(collection(firestore, `workerChats/${chatId}/messages`), {
                type: 'text',
                text: messageText.trim(),
                senderId: currentUser.uid,
                timestamp: serverTimestamp(),
                read: false
            });
            
            const chatRef = doc(firestore, 'workerChats', chatId);
            await updateDoc(chatRef, {
                lastMessage: messageText.trim(),
                lastMessageTime: serverTimestamp(),
                [`unreadCount.${userId}`]: increment(1),
                [`unreadCount.${currentUser.uid}`]: 0
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

    const openImageModal = (imageUrl) => {
        setSelectedImage(imageUrl);
        setImageModalVisible(true);
    };

    const closeImageModal = () => {
        setImageModalVisible(false);
        setSelectedImage(null);
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
                <View style={item.type === 'text' ? [
                    styles.messageBubble,
                    isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
                ] : styles.imageContainer}>
                    {item.type === 'image' ? (
                        <TouchableOpacity onPress={() => openImageModal(item.imageUrl)}>
                            <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.messageImage}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    ) : (
                        <Text style={[
                            styles.messageText,
                            isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText
                        ]}>
                            {item.text}
                        </Text>
                    )}
                    <View style={styles.messageFooter}>
                        <Text style={styles.timeText}>
                            {formatTimestamp(item.timestamp)}
                        </Text>
                        {isCurrentUser && (
                            <Ionicons 
                                name={item.read ? "checkmark-done" : "checkmark"} 
                                size={14} 
                                color={item.read ? "#34B7F1" : "#8F8F8F"} 
                                style={{ marginLeft: 4 }} 
                            />
                        )}
                    </View>
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
                    </View>
                </View>
                
                <View style={styles.headerActions}>
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
                            Send a message or image to start the conversation
                        </Text>
                    </View>
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={styles.inputContainer}
            >
                <TouchableOpacity 
                    style={[styles.attachButton, isSending && styles.attachButtonDisabled]} 
                    onPress={pickImage}
                    disabled={isSending}
                    accessible={true}
                    accessibilityLabel="Attach image"
                >
                    <Ionicons 
                        name="image-outline" 
                        size={24} 
                        color={isSending ? "#b0cfe0" : "#0095f6"} 
                    />
                </TouchableOpacity>
                
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline={true}
                    maxLength={500}
                    editable={!isSending}
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

            <Modal
                visible={imageModalVisible}
                transparent={false}
                animationType="fade"
                onRequestClose={closeImageModal}
            >
                <SafeAreaView style={styles.imageModalContainer}>
                    <TouchableOpacity 
                        style={styles.imageModalBackButton} 
                        onPress={closeImageModal}
                        accessible={true}
                        accessibilityLabel="Close image"
                    >
                        <Ionicons name="arrow-back" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: selectedImage }}
                        style={styles.fullScreenImage}
                        resizeMode="contain"
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

export default WorkerChatScreen;