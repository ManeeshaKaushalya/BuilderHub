import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import '../css/LoginScreen.css'; // Adjust the path as necessary

const COLORS = {
  LIGHT_BG: '#fff',
  DARK_BG: '#1a1a1a',
  LIGHT_TEXT: '#333',
  DARK_TEXT: '#ddd',
  PRIMARY: '#007BFF',
  ERROR: '#ff4444',
  BORDER: '#ccc',
};

const LoginScreen = () => {
  const { isDarkMode, toggleDarkMode } = useTheme(); // Added toggleDarkMode
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const db = getFirestore();
  const { loginUser } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('LoginScreen rendered, isLoading:', isLoading);
  }, [isLoading]);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      alert('Please enter both email and password.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        loginUser(userData);
        if (process.env.NODE_ENV === 'development') {
          console.log('User data:', userData);
        }
      } else {
        throw new Error('User data not found in Firestore.');
      }

      alert('Logged in successfully!');
      navigate('/tabs');
    } catch (error) {
      let errorMessage = 'An error occurred during login.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message;
      }
      alert(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, db, loginUser, navigate]);

  return (
    <div className={`container ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="inner-container">
        <img
          src="/logo.png"
          alt="BuilderHub Logo"
          className="logo"
        />

        <h1 className="title">Login</h1>

        {/* Add Theme Toggle Button */}
        <button
          className="toggle-theme-button"
          onClick={toggleDarkMode}
          aria-label="Toggle theme"
        >
          Switch to {isDarkMode ? 'Light' : 'Dark'} Mode
        </button>

        <div className="input-container">
          <FontAwesomeIcon icon={faEnvelope} className="icon" />
          <input
            className="input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="Email input"
          />
        </div>

        <div className="input-container">
          <FontAwesomeIcon icon={faLock} className="icon" />
          <input
            className="input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            aria-label="Password input"
          />
        </div>

        <button
          className={`login-button ${isLoading ? 'disabled' : ''}`}
          onClick={handleLogin}
          disabled={isLoading}
          aria-label="Login button"
        >
          {isLoading ? (
            <span>Loading...</span>
          ) : (
            <span>Login</span>
          )}
        </button>

        <button
          className="link"
          onClick={() => navigate('/forgetpassword')}
        >
          Forgot Password? <span className="link-bold">Reset here</span>
        </button>

        <button
          className="link"
          onClick={() => navigate('/register')}
        >
          Don’t have an account? <span className="link-bold">Register here</span>
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;