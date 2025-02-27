import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import ImageUpload from './ImageUpload';
import Post from './Posts';

function UsersPostsScreen() {
    const auth = getAuth();
    const user = auth.currentUser;
    const { isDarkMode } = useTheme();
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        if (!user) {
            console.log("No authenticated user in UsersPostsScreen!");
            setLoading(false);
            return;
        }
        console.log("Authenticated user UID in UsersPostsScreen:", user.uid);

        const postsRef = collection(firestore, 'posts');
        console.log("Setting up posts listener...");
        const unsubscribe = onSnapshot(postsRef, async (snapshot) => {
            console.log("Posts snapshot received, size:", snapshot.size);
            if (snapshot.empty) {
                console.log("No posts found in collection.");
                setPosts([]);
                setLoading(false);
                return;
            }

            const postList = await Promise.all(
                snapshot.docs.map(async (docSnapshot) => {
                    const postData = { id: docSnapshot.id, ...docSnapshot.data() };
                    console.log("Processing post in UsersPostsScreen:", postData.id, postData);

                    let ownerData = { name: 'Unknown User', profileImage: null };
                    if (postData.uid) {
                        try {
                            const userDocRef = doc(firestore, 'users', postData.uid);
                            const userDocSnap = await getDoc(userDocRef);
                            if (userDocSnap.exists()) {
                                ownerData = {
                                    name: userDocSnap.data().name || 'Unknown User',
                                    profileImage: userDocSnap.data().profileImage || null,
                                };
                            } else {
                                console.log("User not found for UID:", postData.uid);
                            }
                        } catch (error) {
                            console.error('Error fetching user for post', postData.id, ':', error);
                        }
                    }

                    return {
                        ...postData,
                        ownerName: ownerData.name,
                        userImage: ownerData.profileImage,
                    };
                })
            );

            console.log("Posts processed, total:", postList.length);
            setPosts(postList);
            setLoading(false);
        }, (error) => {
            console.error("Posts snapshot error in UsersPostsScreen:", error);
            setLoading(false);
        });

        return () => {
            console.log("Unsubscribing from posts listener in UsersPostsScreen");
            unsubscribe();
        };
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const fetchUsers = async () => {
            try {
                console.log("Fetching users...");
                const usersCollection = collection(firestore, 'users');
                const userSnapshot = await getDocs(usersCollection);
                const userList = userSnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name || "Unknown User",
                }));
                console.log("Users fetched:", userList.length);
                setUsers(userList);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        fetchUsers();
    }, [user]);

    useEffect(() => {
        if (search.trim() === '') {
            setFilteredUsers([]);
        } else {
            const filtered = users.filter(user =>
                user.name.toLowerCase().includes(search.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [search, users]);

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
            console.log("Rendering post:", item.post.id);
            return (
                <Post
                    postId={item.post.id}
                    username={item.post.ownerName}
                    caption={item.post.caption}
                    imageList={item.post.imageUrls}
                    ownerId={item.post.uid}
                    userImage={item.post.userImage}
                    uploadDate={item.post.timestamp}
                    initialLikes={item.post.likes || 0}
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
                <TextInput
                    style={[styles.searchInput, isDarkMode ? styles.darkInput : styles.lightInput]}
                    placeholder="Search users..."
                    placeholderTextColor={isDarkMode ? "#bbb" : "#666"}
                    value={search}
                    onChangeText={setSearch}
                />
            }
            ListEmptyComponent={
                loading ? (
                    <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
                ) : (
                    <Text style={[styles.noResults, isDarkMode ? styles.darkText : styles.lightText]}>
                        No posts or users found
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
    noResults: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
});

export default UsersPostsScreen;