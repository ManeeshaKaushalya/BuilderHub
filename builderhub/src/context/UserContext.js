// src/context/UserContext.js
import { createContext, useState, useContext } from 'react';

// Create a context for the user data
const UserContext = createContext();

// Create a custom hook to use the UserContext
export const useUser = () => useContext(UserContext);

// UserContext provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); // State to store user data

  // Function to set user data
  const loginUser = (userData) => {
    setUser(userData);
  };

  // Function to log out the user
  const logoutUser = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loginUser, logoutUser }}>
      {children}
    </UserContext.Provider>
  );
};
