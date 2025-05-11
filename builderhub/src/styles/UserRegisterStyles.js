import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  LIGHT_BG: '#fff',
  LIGHT_TEXT: '#333',
  ACCENT: '#f7b731',
  PRIMARY: '#007BFF',
  GRAY: '#666',
  LIGHT_GRAY: '#f9f9f9',
  SUCCESS: '#4CAF50',
  TRANSPARENT_BG: 'rgba(156, 134, 134, 0.4)',
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.TRANSPARENT_BG,
    // Removed paddingBottom to prevent extra scroll space
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    color: COLORS.LIGHT_TEXT,
    textAlign: 'center',
  },
  imageUploadContainer: {
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: width * 0.15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'center', // Center horizontally in parent
  },
  profileImage: {
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: width * 0.125,
  },
  uploadText: {
    marginBottom: 20,
    fontSize: 16,
    color: COLORS.GRAY,
    textAlign: 'center', // Center the text
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
    accessible: true,
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
    accessible: true,
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
    textAlign: 'center', // Center the link text
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
  mapContainer: {
    flex: 1,
    backgroundColor: COLORS.LIGHT_BG,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    width: '90%',
    alignSelf: 'center',
    zIndex: 9999,
  },
  searchInput: {
    backgroundColor: COLORS.LIGHT_BG,
    height: 50,
    borderRadius: 10,
    paddingLeft: 15,
    fontSize: 16,
    color: COLORS.LIGHT_TEXT,
    borderWidth: 1,
    borderColor: COLORS.GRAY,
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
  mapButton: {
    position: 'absolute',
    bottom: height * 0.15,
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
  cancelButton: {
    bottom: height * 0.05,
    backgroundColor: COLORS.GRAY,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.LIGHT_BG,
  },
  mapLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.LIGHT_TEXT,
  },
});

export default styles;