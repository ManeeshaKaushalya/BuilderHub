import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // ✅ Import storage

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app); // ✅ Initialize Firebase Storage

export { auth, firestore, storage }; // ✅ Export storage


