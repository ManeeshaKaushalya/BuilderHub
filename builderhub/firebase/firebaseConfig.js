import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyAB5gQL6OPenhrtn_u3rQPE6jbYQmomZM8",
    authDomain: "react-crud-cfd5d.firebaseapp.com",
    databaseURL: "https://react-crud-cfd5d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "react-crud-cfd5d",
    storageBucket: "react-crud-cfd5d.firebasestorage.app",
    messagingSenderId: "352274356701",
    appId: "1:352274356701:web:c82a8427ac5e0c02013e34",
    measurementId: "G-04ZWC9W2MG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize other Firebase services
const firestore = getFirestore(app);
const storage = getStorage(app);

export { auth, firestore, storage };