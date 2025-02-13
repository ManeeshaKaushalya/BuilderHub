import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/ThemeContext'; 
import { useNavigation } from '@react-navigation/native'; 

const SidebarRow = ({ imageLink, title, isUser, onPress }) => {
  const { isDarkMode } = useTheme(); 

  return (
    <TouchableOpacity 
      style={[
        styles.row, 
        isUser && styles.userRow, 
        isDarkMode ? styles.darkRow : styles.lightRow
      ]}
      onPress={onPress} // Use dynamic onPress instead of fixed navigation
    >
      {imageLink ? (
        <Image source={{ uri: imageLink }} style={isUser ? styles.avatar : styles.icon} />
      ) : (
        <View style={styles.placeholderIcon} /> 
      )}
      <Text 
        style={[
          styles.title, 
          isUser && styles.userName, 
          isDarkMode ? styles.darkText : styles.lightText
        ]}
      >
        {title || "Unknown"}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 5,
  },
  lightRow: {
    backgroundColor: '#fff',
  },
  darkRow: {
    backgroundColor: '#333',
  },
  icon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  userRow: {
    backgroundColor: '#f0f2f5',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholderIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#ccc',
    borderRadius: 15,
    marginRight: 10,
  },
  lightText: {
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
});

export default SidebarRow;
