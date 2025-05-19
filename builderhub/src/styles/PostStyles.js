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
  DARK_OVERLAY: 'rgba(0,0,0,0.3)',
  WHITE: '#ffffff',
  BLACK: '#000000',
};

const styles = StyleSheet.create({
  // Main Container
  postContainer: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: COLORS.LIGHT_BG,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // User Info Section
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
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    color: COLORS.LIGHT_TEXT,
  },
  verifiedIcon: {
    marginLeft: 4,
    color: COLORS.VERIFIED,
  },
  uploadDate: {
    fontSize: 12,
    color: COLORS.GRAY,
  },

  // Categories
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  categoryTag: {
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.ACCENT,
    fontWeight: '500',
  },

  // Caption
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
    fontWeight: '500',
  },

  // Project Info
  projectInfoContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  projectInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  projectInfoText: {
    fontSize: 13,
    marginLeft: 4,
    color: COLORS.LIGHT_TEXT,
  },

  // Media Styles
  imageContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.WHITE,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  imageScrollContent: {
    paddingHorizontal: 5,
  },
  postImage: {
    width: width * 0.8,
    height: width * 0.8,
    resizeMode: 'cover',
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },

  // Video
  videoContainer: {
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.WHITE,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  video: {
    width: '100%',
    height: width * 0.9,
    backgroundColor: COLORS.LIGHT_GRAY,
  },

  // Before/After
beforeAfterContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  beforeAfterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: COLORS.LIGHT_GRAY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  beforeAfterLabel: {
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  beforeAfterContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 5,
  },
  beforeAfterImageWrapper: {
    width: '48%', // Give some space between images
    aspectRatio: 1, // Maintain square ratio
  },
  beforeAfterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 8,
  },
  // Slider Controls
  sliderContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: COLORS.DARK_OVERLAY,
  },
  sliderButton: {
    backgroundColor: COLORS.WHITE,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sliderText: {
    color: COLORS.LIGHT_TEXT,
    fontSize: 14,
    fontWeight: '500',
  },

  // Pagination
  paginationContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 5,
    backgroundColor: COLORS.DARK_OVERLAY,
    borderRadius: 20,
    marginHorizontal: '30%',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: COLORS.WHITE,
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Action Buttons
  beforeAfterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ACCENT,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 10,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  beforeAfterButtonText: {
    color: COLORS.WHITE,
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  documentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 10,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  documentsButtonText: {
    color: COLORS.WHITE,
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },

  // Stats
  statsText: {
    marginTop: 15,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.GRAY,
    fontWeight: '500',
  },

  // Post Actions
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
    fontSize: 13,
    color: COLORS.LIGHT_TEXT,
    fontWeight: '500',
  },
  likedIcon: {
    color: COLORS.ERROR,
  },
  unlikedIcon: {
    color: COLORS.LIGHT_TEXT,
  },
  likedText: {
    color: COLORS.ERROR,
  },

  // Pinned Comment
  pinnedCommentContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
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
    fontWeight: '500',
  },
  pinnedCommentText: {
    fontSize: 14,
    color: COLORS.LIGHT_TEXT,
    lineHeight: 20,
  },
  pinnedCommentUser: {
    fontWeight: 'bold',
  },

  // Documents Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: Math.min(width * 0.9, 400),
    borderRadius: 12,
    padding: 20,
    maxHeight: '70%',
    backgroundColor: COLORS.LIGHT_BG,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    flex: 1,
  },
  closeButton: {
    backgroundColor: COLORS.PRIMARY,
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  closeButtonText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Utility
  errorText: {
    color: COLORS.WHITE,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,0,0,0.3)',
  },
  loader: {
    marginVertical: 20,
  },
});

export default styles;