import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#F4B018',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    backButton: {
        padding: 4,
    },
    headerUserInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    headerUserImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#fff',
    },
    headerUserImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerUserImagePlaceholderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerTextContainer: {
        justifyContent: 'center',
    },
    headerUsername: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerStatus: {
        fontSize: 12,
        color: '#e0f7fa',
    },
    headerActions: {
        flexDirection: 'row',
        marginLeft: 'auto',
    },
    headerActionButton: {
        padding: 8,
        marginLeft: 8,
    },
    messagesContainer: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
        flexGrow: 1,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '80%',
    },
    leftMessage: {
        alignSelf: 'flex-start',
    },
    rightMessage: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    messageSenderImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
        alignSelf: 'flex-end',
    },
    messageBubble: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 8,
        maxWidth: '100%',
    },
    currentUserBubble: {
        backgroundColor: '#0095f6',
    },
    otherUserBubble: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    messageText: {
        fontSize: 15,
    },
    currentUserMessageText: {
        color: '#fff',
    },
    otherUserMessageText: {
        color: '#333',
    },
    timeText: {
        fontSize: 10,
        color: '#f0f0f0',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    attachButton: {
        padding: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 16,
        maxHeight: 100,
        marginHorizontal: 8,
    },
    sendButton: {
        backgroundColor: '#0095f6',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#b0cfe0',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#999',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
        marginTop: 8,
    },
});

export default styles;