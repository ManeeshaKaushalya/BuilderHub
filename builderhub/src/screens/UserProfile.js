import React, { useEffect, useState } from "react";
import { 
    View, Text, ActivityIndicator, Image, 
    TouchableOpacity, StyleSheet, FlatList,
    SafeAreaView, StatusBar, Dimensions
} from "react-native";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { firestore } from "../../firebase/firebaseConfig";
import { ArrowLeft } from "lucide-react-native";
import Post from "./posts/Posts";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const UserProfile = ({ navigation }) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const userId = user?.uid;

    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });

    useEffect(() => {
        const fetchUserData = async () => {
            if (!userId) return;
            try {
                const userRef = doc(firestore, "users", userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setUserData(userSnap.data());
                    // Simulated stats - replace with actual data
                    setStats({
                        posts: userPosts.length,
                        followers: userSnap.data().followers?.length || 0,
                        following: userSnap.data().following?.length || 0
                    });
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };
        fetchUserData();
    }, [userId, userPosts.length]);

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


    const StatBox = ({ label, value }) => (
        <View style={styles.statBox}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    const renderProfileHeader = () => (
        <View style={styles.headerContainer}>
            <LinearGradient
                colors={['#4A90E2', '#63B3ED']}
                style={styles.banner}
            >
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft color="#FFFFFF" size={24} />
                </TouchableOpacity>
            </LinearGradient>

            <View style={styles.profileSection}>
                <View style={styles.profileImageContainer}>
                    <Image
                        source={{ uri: userData?.profileImage || "https://via.placeholder.com/150" }}
                        style={styles.profileImage}
                    />
                </View>

                <View style={styles.userInfoContainer}>
                    <Text style={styles.userName}>{userData?.name || "Unknown User"}</Text>
                    <Text style={styles.userEmail}>{userData?.email || "No email provided"}</Text>
                </View>
                
                <View style={styles.statsContainer}>
                    <StatBox label="Posts" value={stats.posts} />
                    <StatBox label="Followers" value={stats.followers} />
                    <StatBox label="Following" value={stats.following} />
                </View>

                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity 
                        style={styles.editButton} 
                        onPress={() => navigation.navigate("EditProfile")}
                    >
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.settingsButton}
                        onPress={() => navigation.navigate("Settings")}
                    >
                        <Text style={styles.settingsButtonText}>Settings</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Recent Posts</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <FlatList
                data={userPosts}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderProfileHeader}
                renderItem={({ item }) => (
                    <Post
                        postId={item.id}
                        username={userData?.name || "Unknown"}
                        caption={item.caption}
                        imageList={item.imageUrls}
                        userImage={userData?.profileImage}
                        uploadDate={item.timestamp}
                        initialLikes={item.likes || 0}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No posts yet</Text>
                        <Text style={styles.emptySubtext}>Share your first moment</Text>
                    </View>
                }
                contentContainerStyle={styles.contentContainer}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    contentContainer: {
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },
    headerContainer: {
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
    },
    banner: {
        height: 140,
        justifyContent: "flex-start",
        paddingTop: 20,
        paddingHorizontal: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
    },
    profileSection: {
        alignItems: "center",
        marginTop: -70,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 80,
    },
    profileImageContainer: {
        position: 'absolute',
        top: -60,
        padding: 3,
        backgroundColor: '#FFFFFF',
        borderRadius: 75,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    userInfoContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    userName: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1A202C",
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 15,
        color: "#718096",
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    statBox: {
        alignItems: 'center',
        minWidth: 80,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#2D3748",
    },
    statLabel: {
        fontSize: 14,
        color: "#718096",
        marginTop: 4,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: 12,
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    editButton: {
        backgroundColor: "#4A90E2",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        flex: 1,
        maxWidth: 160,
        alignItems: 'center',
    },
    editButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    settingsButton: {
        backgroundColor: "#EDF2F7",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        flex: 1,
        maxWidth: 160,
        alignItems: 'center',
    },
    settingsButtonText: {
        color: "#4A5568",
        fontSize: 16,
        fontWeight: "600",
    },
    divider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 24,
        marginHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#2D3748",
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        borderRadius: 12,
        marginTop: 12,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#2D3748",
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 15,
        color: "#718096",
    },
});

export default UserProfile;