import { StyleSheet } from 'react-native';

const COLORS = {
  LIGHT_BG: '#fff',
  LIGHT_TEXT: '#333',
  ACCENT: '#f7b731',
  PRIMARY: '#007BFF',
  GRAY: '#666',
  LIGHT_GRAY: '#f9f9f9',
  DARK_GRAY: '#333',
  SUCCESS: '#4CAF50',
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(156, 134, 134, 0.4)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.LIGHT_TEXT,
  },
  imageUploadContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  uploadText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.GRAY,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    height: 50,
    backgroundColor: COLORS.LIGHT_GRAY,
    borderColor: '#ccc',
  },
  icon: {
    padding: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    height: 50,
    fontSize: 16,
    color: COLORS.LIGHT_TEXT,
  },
  eyeIcon: {
    padding: 10,
  },
  button: {
    backgroundColor: COLORS.ACCENT,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    fontWeight: '500',
    color: COLORS.PRIMARY,
  },
  linkBold: {
    fontWeight: 'bold',
  },
  locationButton: {
    backgroundColor: COLORS.PRIMARY,
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.LIGHT_BG,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: COLORS.LIGHT_TEXT,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.GRAY,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});

export default styles;