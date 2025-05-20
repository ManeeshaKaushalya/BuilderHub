import { StyleSheet } from 'react-native';

export const COLORS = {
  LIGHT_BG: '#fff',
  DARK_BG: '#1a1a1a',
  LIGHT_TEXT: '#333',
  DARK_TEXT: '#ddd',
  ACCENT: '#F4B018',
  ERROR: '#ff4444',
  BORDER: '#aaa',
  INPUT_BG: '#eee',
};

export const styles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? COLORS.DARK_BG : COLORS.LIGHT_BG,
    },
    headerSection: {
      width: '120%',
      alignSelf: 'center',
      paddingTop: 10,
      paddingBottom: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomLeftRadius: 70,
      borderBottomRightRadius: 70,
      elevation: 5,
      backgroundColor: COLORS.ACCENT,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    logo: {
      width: 100,
      height: 100,
      resizeMode: 'contain',
      marginBottom: 5,
    },
    headerTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '600',
    },
    headerSubtitle: {
      color: '#fff',
      fontSize: 28,
      fontWeight: 'bold',
      marginTop: 5,
    },
    formContainer: {
      flex: 1,
      width: '100%',
      paddingHorizontal: 24,
      marginTop: 30,
      alignItems: 'center',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: 2,
    },
    backButtonText: {
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
      fontSize: 16,
      marginLeft: 30,
    },
    subtitle: {
      fontSize: 16,
      color: isDarkMode ? '#aaa' : '#666',
      textAlign: 'center',
      marginBottom: 20,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: 15,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: COLORS.INPUT_BG,
    },
    icon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      height: 48,
      color: isDarkMode ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
      fontSize: 16,
    },
    resetButton: {
      width: '100%',
      backgroundColor: COLORS.ACCENT,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    resetButtonDisabled: {
      opacity: 0.7,
    },
    resetButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });