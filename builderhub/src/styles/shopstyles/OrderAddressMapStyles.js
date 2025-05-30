import { StyleSheet, Platform } from 'react-native';

export const COLORS = {
  LIGHT_BG: '#fff',
  DARK_BG: '#1a1a1a',
  LIGHT_TEXT: '#333',
  DARK_TEXT: '#ddd',
  PRIMARY: '#007BFF',
  GRAY: '#666',
  LIGHT_GRAY: '#f9f9f9',
  DARK_GRAY: '#333',
};

export const styles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
    },
    searchContainer: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      width: '90%',
      alignSelf: 'center',
      zIndex: 9999,
    },
    searchInput: {
      backgroundColor: isDarkMode ? COLORS.DARK_GRAY : COLORS.LIGHT_BG,
      height: 50,
      borderRadius: 10,
      paddingLeft: 15,
      fontSize: 16,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
      borderWidth: 1,
      borderColor: isDarkMode ? '#444' : COLORS.GRAY,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    addressContainer: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 120 : 100,
      width: '90%',
      alignSelf: 'center',
      zIndex: 9998,
    },
    addressInput: {
      backgroundColor: isDarkMode ? COLORS.DARK_GRAY : COLORS.LIGHT_BG,
      height: 50,
      borderRadius: 10,
      paddingLeft: 15,
      fontSize: 16,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
      borderWidth: 1,
      borderColor: isDarkMode ? '#444' : COLORS.GRAY,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    map: {
      flex: 1,
      zIndex: 0,
    },
    button: {
      position: 'absolute',
      bottom: 20,
      alignSelf: 'center',
      backgroundColor: COLORS.PRIMARY,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 10,
      width: '90%',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 0,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
    },
  });