import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgetPasswordScreen from './screens/ForgetPasswordScreen';
import TabsScreen from './screens/TabsScreen';
import { UserProvider } from './context/UserContext';

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
    <Router>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/forgetpassword" element={<ForgetPasswordScreen />} />
        <Route path="/tabs" element={<TabsScreen />} />
      </Routes>
    </Router>
    </UserProvider>
    </ThemeProvider>
  );
}

export default App;