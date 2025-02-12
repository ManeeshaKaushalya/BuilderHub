import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../context/UserContext'; // Import User Context
import { useTheme } from '../hooks/ThemeContext'; // Import useTheme hook
import SidebarRow from './SidebarRow';

const Sidebar = () => {
  const navigation = useNavigation();
  const { user } = useUser(); // Get user data from context
  const { isDarkMode } = useTheme(); // Get dark mode state


  // Navigate to DarkModeScreen
  const handleDarkModePress = () => {
    navigation.navigate('darkmodescreen');
  };


  return (
    <View style={[styles.sidebar, isDarkMode ? styles.darkSidebar : styles.lightSidebar]}>
      {/* User Profile Section */}
      {user && (
        <SidebarRow 
          imageLink={user.profileImage} 
          title={user.name} 
          isUser 
        />
      )}

      {/* Sidebar Rows */}
      <SidebarRow
        imageLink="https://cdn-icons-png.flaticon.com/512/2854/2854088.png"
        title="Dark mode"
        onPress={handleDarkModePress}  // Pass the navigation function to SidebarRow
      />
      <SidebarRow imageLink="https://e7.pngegg.com/pngimages/886/28/png-clipart-customer-computer-icons-request-for-proposal-find-my-friends-text-service-thumbnail.png" title="Find Friends" />
      <SidebarRow imageLink="https://static.xx.fbcdn.net/rsrc.php/v3/yj/r/Im_0d7HFH4n.png" title="Groups" />
      <SidebarRow imageLink="https://static.xx.fbcdn.net/rsrc.php/v3/y4/r/MN44Sm-CTHN.png" title="Marketplace" />
      <SidebarRow imageLink="https://static.xx.fbcdn.net/rsrc.php/v3/y-/r/FhOLTyUFKwf.png" title="Videos" />
      <SidebarRow imageLink="https://static.xx.fbcdn.net/rsrc.php/v3/yx/r/N7UOh8REweU.png" title="Events" />
      <SidebarRow imageLink="https://static.xx.fbcdn.net/rsrc.php/v3/y-/r/Uy-TOlM5VXG.png" title="Memories" />
      <SidebarRow imageLink="https://static.xx.fbcdn.net/rsrc.php/v3/yA/r/KlDlsO3UxDM.png" title="Saved" />
      <SidebarRow dropdown title="See more" />

      {/* Footer Section */}
      <View style={styles.policies}>
        <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>Privacy</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>Terms</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>Advertising</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>Ad choices</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>Cookies</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>More</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={[styles.text, isDarkMode ? styles.darkText : styles.lightText]}>BuilderHub © 2025</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    padding: 20,
    flex: 1,
  },
  lightSidebar: { backgroundColor: '#f0f2f5' },
  darkSidebar: { backgroundColor: '#181818' },
  policies: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dot: {
    marginHorizontal: 5,
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  lightText: { color: '#000' },
  darkText: { color: '#fff' },
});

export default Sidebar;
