import { StyleSheet, Platform } from 'react-native';

const COLORS = {
  LIGHT_BG: '#fff',
  LIGHT_TEXT: '#333',
  PRIMARY: '#007BFF',
  BORDER: '#aaa',
  LIGHT_GRAY: '#eee',
  ACCENT: '#F4B018',
  GRAY: '#666',
  DARK_GRAY: '#333',
  SUCCESS: '#4CAF50',
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: 'rgba(156, 134, 134, 0.4)',
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
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 30,
  },
  pickerContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.LIGHT_GRAY,
    elevation: 2,
  },
  picker: {
    height: 60,
    width: '100%',
    color: COLORS.LIGHT_TEXT,
    ...(Platform.OS === 'android' && { paddingVertical: 10 }),
  },
  pickerItem: {
    fontSize: 16,
    color: COLORS.LIGHT_TEXT,
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.LIGHT_TEXT,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});

export default styles;