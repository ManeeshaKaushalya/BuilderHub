import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import ImageUpload from './ImageUpload';
import Post from './Posts';

function UsersPostsScreen() {
    const { isDarkMode } = useTheme();
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [posts, setPosts] = useState([]);

    // Listen for changes in the Firestore 'posts' collection
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(firestore, 'posts'),
            (snapshot) => {
                const postList = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setPosts(postList);
                setLoading(false); // Set loading to false after data is fetched
            },
            (error) => {
                console.error("Error fetching posts:", error);
                setLoading(false);
            }
        );

        // Clean up listener on unmount
        return () => unsubscribe();
    }, []);

    // Fetch users from Firestore (runs once)
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const usersCollection = collection(firestore, 'users');
                const userSnapshot = await getDocs(usersCollection);
                const userList = userSnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name || "Unknown User", // Default value
                }));
                setUsers(userList);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching users:", error);
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Filter users when search input changes
    useEffect(() => {
        if (search.trim() === '') {
            setFilteredUsers([]); // Hide list when search is empty
        } else {
            const filtered = users.filter(user =>
                user.name.toLowerCase().includes(search.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [search, users]);

    // Combined list to display both users and posts
    const combinedData = [
        { type: 'imageUpload', id: 'imageUpload' },
        ...filteredUsers.map(user => ({ type: 'user', id: user.id, user })),
        ...posts.map(post => ({ type: 'post', id: post.id, post })),
    ];

    const renderItem = ({ item }) => {
        if (item.type === 'imageUpload') {
            return <ImageUpload />;
        } else if (item.type === 'user') {
            return (
                <View style={[styles.userCard, isDarkMode ? styles.darkCard : styles.lightCard]}>
                    <Text style={[styles.userName, isDarkMode ? styles.darkText : styles.lightText]}>
                        {item.user.name}
                    </Text>
                </View>
            );
        } else if (item.type === 'post') {
            return (
                <Post
                    postId={item.post.id}
                    username={item.post.username}
                    caption={item.post.caption}
                    image={item.post.image}
                    imageList={item.post.imageUrls} // List of images if available
                />
            );
        }
    };

    return (
        <FlatList
            data={combinedData}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListHeaderComponent={
                <>
                    {/* Search Bar */}
                    <TextInput
                        style={[styles.searchInput, isDarkMode ? styles.darkInput : styles.lightInput]}
                        placeholder="Search users..."
                        placeholderTextColor={isDarkMode ? "#bbb" : "#666"}
                        value={search}
                        onChangeText={setSearch}
                    />
                </>
            }
            ListEmptyComponent={
                loading ? (
                    <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
                ) : (
                    <Text style={[styles.noResults, isDarkMode ? styles.darkText : styles.lightText]}>
                        No users found
                    </Text>
                )
            }
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    lightContainer: { backgroundColor: '#fff' },
    darkContainer: { backgroundColor: '#121212' },

    searchInput: {
        width: '100%',
        height: 40,
        borderRadius: 8,
        paddingHorizontal: 10,
        fontSize: 16,
        marginBottom: 15,
    },
    lightInput: { backgroundColor: '#f0f0f0', color: '#000' },
    darkInput: { backgroundColor: '#1e1e1e', color: '#fff' },

    userCard: {
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    lightCard: { backgroundColor: '#f9f9f9' },
    darkCard: { backgroundColor: '#1e1e1e' },

    userName: { fontSize: 18 },
    lightText: { color: '#000' },
    darkText: { color: '#fff' },

    loader: { marginTop: 20 },

    // No results text style
    noResults: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
});

export default UsersPostsScreen;
