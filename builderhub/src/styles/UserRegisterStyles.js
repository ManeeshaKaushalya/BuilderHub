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
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(156, 134, 134, 0.4)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
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
    marginBottom: 10,
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
    fontSize: 16,
    color: COLORS.GRAY,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.GRAY,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  icon: {
    padding: 10,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 10,
    color: COLORS.LIGHT_TEXT,
    fontSize: 16,
  },
  button: {
    backgroundColor: COLORS.ACCENT,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 15,
    color: COLORS.GRAY,
    fontSize: 14,
  },
  linkBold: {
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
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
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 15,
    color: COLORS.LIGHT_TEXT,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.GRAY,
    marginVertical: 10,
  },
  locationInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default styles;