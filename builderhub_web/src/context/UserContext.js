import { createContext, useState, useContext } from 'react';
import { auth } from '../firebase/firebaseConfig'; // Import Firebase auth
import { signOut } from 'firebase/auth';

// Create a context for the user data
const UserContext = createContext();

// Create a custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// UserContext provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); // State to store user data

  // Function to set user data
  const loginUser = (userData) => {
    setUser(userData);
  };

  // Function to log out the user
  const logoutUser = async () => {
    try {
      await signOut(auth); // Sign out from Firebase
      setUser(null); // Clear user state
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, loginUser, logoutUser }}>
      {children}
    </UserContext.Provider>
  );
};