import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  commentContainer: {
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  inputProfileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#F0F2F5',
    borderRadius: 18,
    padding: 12,
  },
  commentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontWeight: '600',
    fontSize: 13,
    color: '#050505',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 15,
    color: '#050505',
    lineHeight: 20,
  },
  replyingTo: {
    fontSize: 13,
    color: '#65676B',
    marginBottom: 4,
  },
  replyName: {
    fontWeight: '600',
    color: '#050505',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 8,
  },
  actionButton: {
    marginRight: 16,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#65676B',
    fontWeight: '500',
  },
  likedText: {
    color: '#1877F2',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 13,
    color: '#65676B',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    color: '#050505',
  },
  commentButton: {
    marginLeft: 8,
    backgroundColor: '#1877F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#E4E6EB',
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#65676B',
    fontSize: 15,
    marginTop: 24,
  },
  replyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F0F2F5',
    borderTopWidth: 1,
    borderTopColor: '#E4E6EB',
  },
  replyingText: {
    fontSize: 13,
    color: '#65676B',
  },
  cancelReply: {
    fontSize: 13,
    color: '#1877F2',
    fontWeight: '500',
  },
  selectedComment: {
    backgroundColor: '#E4E6EB',
  },
  deleteMenu: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 16,
  },
  deleteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  deleteText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
});

export default styles;