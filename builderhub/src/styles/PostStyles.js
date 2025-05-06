import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const COLORS = {
  LIGHT_BG: '#fff',
  LIGHT_TEXT: '#000',
  GRAY: '#666',
  LIGHT_GRAY: '#f2f2f2',
  BORDER: '#eee',
  ACCENT: '#4a87d5',
  SUCCESS: '#5c946e',
  PRIMARY: '#007bff',
  ERROR: '#e41e3f',
  VERIFIED: '#1DA1F2',
};

const styles = StyleSheet.create({
  postContainer: { 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 20, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: COLORS.LIGHT_BG,
  },
  userInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    padding: 5,
  },
  userInfoText: {
    flex: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    marginRight: 10,
  },
  username: { 
    fontWeight: 'bold', 
    fontSize: 16,
    color: COLORS.LIGHT_TEXT,
  },
  verifiedIcon: { 
    marginLeft: 4,
  },
  uploadDate: { 
    fontSize: 12, 
    color: COLORS.GRAY,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryTag: {
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.ACCENT,
  },
  caption: { 
    marginTop: 5, 
    fontSize: 15, 
    lineHeight: 22,
    color: COLORS.LIGHT_TEXT,
  },
  captionTruncated: {
    maxHeight: 80,
    overflow: 'hidden',
  },
  readMore: {
    color: COLORS.ACCENT,
    marginTop: 4,
    fontSize: 14,
  },
  projectInfoContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
  },
  projectInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  projectInfoText: {
    fontSize: 13,
    marginLeft: 4,
    color: COLORS.LIGHT_TEXT,
  },
  imageContainer: { 
    marginTop: 10,
  },
  postImage: { 
    height: 240, 
    borderRadius: 8, 
    marginRight: 10,
    marginTop: 5,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  videoContainer: {
    height: 240,
    borderRadius: 8,
    marginTop: 10,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  beforeAfterContainer: {
    position: 'relative',
    height: 240,
    marginTop: 10,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#000',
  },
  beforeAfterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  afterImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  sliderContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  sliderText: {
    color: '#fff',
    fontSize: 12,
  },
  beforeAfterGallery: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  beforeAfterGalleryImage: {
    width: width * 0.38,
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  beforeAfterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ACCENT,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginTop: 10,
  },
  beforeAfterButtonText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  documentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginTop: 10,
  },
  documentsButtonText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  statsText: { 
    marginTop: 15, 
    paddingVertical: 10, 
    fontSize: 14,
    color: COLORS.GRAY,
  },
  actionButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: 10,
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 8,
    flex: 1,
    justifyContent: 'center',
  },
  actionText: { 
    marginLeft: 8, 
    fontSize: 12,
    color: COLORS.LIGHT_TEXT,
  },
  likedIcon: {
    color: COLORS.ERROR, // Red color for liked heart
  },
  unlikedIcon: {
    color: COLORS.LIGHT_TEXT, // Default color for unliked heart
  },
  likedText: {
    color: COLORS.ERROR, // Red color for "Like" text when liked
  },
  pinnedCommentContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  pinnedCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  pinnedCommentLabel: {
    fontSize: 12,
    color: COLORS.GRAY,
    marginLeft: 4,
  },
  pinnedCommentText: {
    fontSize: 14,
    color: COLORS.LIGHT_TEXT,
  },
  pinnedCommentUser: {
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    borderRadius: 12,
    padding: 20,
    maxHeight: '70%',
    backgroundColor: COLORS.LIGHT_BG,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: COLORS.LIGHT_TEXT,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  documentName: {
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.LIGHT_TEXT,
  },
  closeButton: {
    backgroundColor: COLORS.PRIMARY,
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loader: { 
    marginVertical: 20,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,0,0,0.3)',
  },
});

export default styles;