import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase/firebaseConfig';
import Post from './Posts';

const UserProfile = () => {
    const auth = getAuth();
    const user = auth.currentUser;
    const userId = user?.uid;

    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserPosts = async () => {
            if (!userId) return;

            try {
                const postsRef = collection(firestore, "posts");
                const q = query(postsRef, where("uid", "==", userId));
                const querySnapshot = await getDocs(q);

                const posts = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setUserPosts(posts);
            } catch (error) {
                console.error("Error fetching user posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserPosts();
    }, [userId]);

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return (
        <View style={{ flex: 1, padding: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>My Posts</Text>
            
            {userPosts.length === 0 ? (
                <Text>No posts yet</Text>
            ) : (
                <FlatList
                    data={userPosts}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <Post
                            postId={item.id}
                            username={user.name || "Unknown"} // ✅ Corrected field
                            caption={item.caption}
                            imageList={item.imageUrls}
                            userImage={user.photoURL} // ✅ Corrected field
                            uploadDate={item.timestamp}
                            initialLikes={item.likes || 0}
                        />
                    )}
                />
            )}
        </View>
    );
};

export default UserProfile;
