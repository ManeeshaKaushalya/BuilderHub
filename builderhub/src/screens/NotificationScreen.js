import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

function NotificationScreen() {
  const { isDarkMode } = useTheme();
  const auth = getAuth();
  const user = auth.currentUser;
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState({});

  useEffect(() => {
    if (!user) {
      console.log('No authenticated user');
      setLoading(false);
      Toast.show({ type: 'error', text1: 'Please log in to view notifications' });
      return;
    }

    console.log('Fetching notifications for user:', user.uid);
    const notificationsRef = collection(firestore, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        if (snapshot.empty) {
          console.log('No notifications found');
        } else {
          console.log('Notifications fetched:', snapshot.size);
        }

        const notificationList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch user details
        const actorIds = [...new Set(notificationList.map((n) => n.actorId))];
        const details = {};
        for (const actorId of actorIds) {
          try {
            const userRef = doc(firestore, 'users', actorId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              details[actorId] = userSnap.data();
            } else {
              console.log('User not found:', actorId);
            }
          } catch (error) {
            console.error('Error fetching user details:', error);
          }
        }
        setUserDetails(details);
        setNotifications(notificationList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        Toast.show({ type: 'error', text1: 'Failed to load notifications' });
        setLoading(false);
      }
    }, (error) => {
      console.error('Snapshot error:', error);
      setLoading(false);
    });

    return () => {
      console.log('Unsubscribing from notifications');
      unsubscribe();
    };
  }, [user]);

  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(firestore, 'users', user.uid, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationMessage = (notification) => {
    const actorName = userDetails[notification.actorId]?.name || 'Someone';
    switch (notification.type) {
      case 'like':
        return `${actorName} liked your project post`;
      case 'comment':
        return `${actorName} commented on your project: "${notification.message || ''}"`;
      case 'order_status':
        return notification.message || `${actorName} updated your order status`;
      default:
        return `${actorName} interacted with your content`;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Just now';
    }
  };

  const renderNotification = ({ item }) => {
    const actor = userDetails[item.actorId] || {};
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isDarkMode ? styles.darkNotificationItem : styles.lightNotificationItem,
          item.read && styles.readNotification,
        ]}
        onPress={() => {
          if (!item.read) markAsRead(item.id);
          if (item.postId) {
            navigation.navigate('PostCards', { postId: item.postId });
          } else if (item.orderId) {
            navigation.navigate('OrderDetailsScreen', { orderId: item.orderId });
          }
        }}
      >
        <Image
          source={{ uri: actor.profileImage || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <View style={styles.notificationContent}>
          <Text
            style={[styles.notificationText, isDarkMode ? styles.darkText : styles.lightText]}
            numberOfLines={2}
          >
            {getNotificationMessage(item)}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        {item.type === 'like' && (
          <MaterialIcons
            name="favorite"
            size={20}
            color={isDarkMode ? '#ff6b6b' : '#e41e3f'}
            style={styles.icon}
          />
        )}
        {item.type === 'comment' && (
          <MaterialIcons
            name="comment"
            size={20}
            color={isDarkMode ? '#4fc3f7' : '#1877f2'}
            style={styles.icon}
          />
        )}
        {item.type === 'order_status' && (
          <MaterialIcons
            name="shopping-cart"
            size={20}
            color={isDarkMode ? '#81c784' : '#28a745'}
            style={styles.icon}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#4fc3f7' : '#1877f2'} />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.header, isDarkMode ? styles.darkText : styles.lightText]}>
        Notifications
      </Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListEmptyComponent={
          <Text style={[styles.emptyText, isDarkMode ? styles.darkText : styles.lightText]}>
            No notifications yet
          </Text>
        }
        contentContainerStyle={styles.listContainer}
      />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  lightContainer: {
    backgroundColor: '#f7f9fc',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  lightNotificationItem: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkNotificationItem: {
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
    borderWidth: 1,
  },
  readNotification: {
    opacity: 0.7,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  icon: {
    marginLeft: 8,
  },
  lightText: {
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});

export default NotificationScreen;