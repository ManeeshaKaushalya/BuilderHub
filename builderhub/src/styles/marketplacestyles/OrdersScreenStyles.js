import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#F4B018',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    backButtonIcon: {
        padding: 5,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    headerPlaceholder: {
        width: 24,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        marginHorizontal: 5,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#F4B018',
    },
    inactiveTab: {
        backgroundColor: '#e0e0e0',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
    },
    inactiveTabText: {
        color: '#333',
    },
    scrollView: {
        flex: 1,
    },
    ordersContainer: {
        margin: 16,
        padding: 16,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        width: '48%',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    orderItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    orderStatus: {
        fontSize: 12,
        fontWeight: '500',
        color: '#007AFF',
    },
    orderDetail: {
        fontSize: 12,
        color: '#666',
        marginBottom: 3,
    },
    statusButtons: {
        flexDirection: 'row',
        marginTop: 6,
        gap: 6,
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    statusButton: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    shipButton: {
        backgroundColor: '#1976D2',
    },
    deliverButton: {
        backgroundColor: '#2E7D32',
    },
    cancelButton: {
        backgroundColor: '#D32F2F',
    },
    statusButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },
    centerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        width: '100%',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#F4B018',
        fontWeight: '500',
    },
    errorText: {
        fontSize: 16,
        color: '#ff3b30',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});

export default styles;