import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import ImageUpload from './ImageUpload';

function UsersPostsScreen() {
    const { isDarkMode } = useTheme();
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch users from Firestore (runs once)
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const usersCollection = collection(firestore, 'users'); // Change if needed
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

    return (
        <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
            
            {/* Search Bar */}
            <TextInput
                style={[styles.searchInput, isDarkMode ? styles.darkInput : styles.lightInput]}
                placeholder="Search users..."
                placeholderTextColor={isDarkMode ? "#bbb" : "#666"}
                value={search}
                onChangeText={setSearch}
            />

            {/* Show users only when searching */}
            {search.trim() !== '' && (
                loading ? (
                    <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
                ) : (
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={[styles.userCard, isDarkMode ? styles.darkCard : styles.lightCard]}>
                                <Text style={[styles.userName, isDarkMode ? styles.darkText : styles.lightText]}>
                                    {item.name}
                                </Text>
                            </View>
                        )}
                    />
                )
            )}
            <ImageUpload/>
        </View>
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
});

export default UsersPostsScreen;
