import { StyleSheet } from 'react-native';

const COLORS = {
  DARK: '#1A1A1A',
  LIGHT: '#fff',
  ACCENT: '#f7b731',
  TEXT_DARK: '#333',
  TEXT_LIGHT: '#ddd',
  ERROR: '#e74c3c',
  BORDER: '#aaa',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    // Removed paddingHorizontal to allow full width header
  },
  headerSection: {
    width: '100%',
    backgroundColor: '#F4B018',
    paddingTop: 100,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // Ensure the header extends fully
    marginLeft: 0,
    marginRight: 0,
  },
  logo: {
    width: 150,
    height: 120,
    resizeMode: 'contain',
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
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
    marginTop: 30,
    paddingHorizontal: 24, // Added padding only to the form container
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.TEXT_DARK,
  },
  eyeIcon: {
    paddingHorizontal: 8,
  },
  loginButton: {
    backgroundColor: COLORS.ACCENT,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    textAlign: 'center',
    marginTop: 15,
    color: COLORS.DARK,
  },
  boldLink: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
});

export default styles;