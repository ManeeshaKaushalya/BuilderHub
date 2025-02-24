import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Share, Dimensions, FlatList, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

const ItemDetails = ({ route, navigation }) => {
  const { item: initialItem } = route.params;
  const [item, setItem] = useState(initialItem);
  const [sellerData, setSellerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const flatListRef = useRef(null);
  const { user } = useUser(); // Get current user from context
  
  const isOwner = user?.uid === item.itemOwnerId;

  const handleDelete = async () => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete the item document
              await deleteDoc(doc(firestore, 'items', item.id));
              Alert.alert("Success", "Item deleted successfully");
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert("Error", "Failed to delete item. Please try again.");
            }
          }
        }
      ]
    );
  };
  
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${item.itemName} - Rs. ${Number(item.price).toLocaleString()}`,
        title: item.itemName,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderImageItem = ({ item: imageUrl, index }) => (
    <View style={styles.imageSlide}>
      <Image 
        source={{ uri: imageUrl }} 
        style={styles.slideImage}
        resizeMode="cover"
      />
    </View>
  );

  const renderImagePagination = () => {
    if (!item.images || item.images.length <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        {item.images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === activeImageIndex && styles.paginationDotActive
            ]}
          />
        ))}
      </View>
    );
  };

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    setActiveImageIndex(index);
  };

  useEffect(() => {
    // Listen for real-time updates to the item
    const itemRef = doc(firestore, 'items', item.id); // Assuming you have an id field
    const unsubscribeItem = onSnapshot(itemRef, (doc) => {
      if (doc.exists()) {
        setItem({ id: doc.id, ...doc.data() });
      }
    }, (error) => {
      console.error('Error listening to item updates:', error);
    });

    // Listen for real-time updates to seller data
    const setupSellerListener = () => {
      if (!item.itemOwnerId) return null;
      
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('uid', '==', item.itemOwnerId));
      
      return onSnapshot(q, (querySnapshot) => {
        setLoading(false);
        if (!querySnapshot.empty) {
          const sellerDoc = querySnapshot.docs[0];
          setSellerData(sellerDoc.data());
        } else {
          console.log('No seller found with ID:', item.itemOwnerId);
          setSellerData(null);
        }
      }, (error) => {
        console.error('Error listening to seller updates:', error);
        setLoading(false);
      });
    };

    const unsubscribeSeller = setupSellerListener();

    // Cleanup listeners when component unmounts
    return () => {
      unsubscribeItem();
      if (unsubscribeSeller) unsubscribeSeller();
    };
  }, [item.itemOwnerId]); // Only re-run if itemOwnerId changes

  const renderStockStatus = () => {
    if (item.Stock == 0) {
      return (
        <View style={styles.outOfStockContainer}>
          <View style={styles.outOfStockBadge}>
            <Icon name="remove-shopping-cart" size={20} color="#dc3545" />
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.stockInfoContainer}>
        <View style={styles.stockStatusRow}>
          <View style={styles.inStockBadge}>
            <Icon name="check-circle" size={20} color="#28a745" />
            <Text style={styles.inStockText}>In Stock</Text>
          </View>
          <View style={styles.stockCountBadge}>
            <Icon name="inventory-2" size={20} color="#666" />
            <Text style={styles.stockCount}>
              {item.Stock} {item.Stock === 1 ? 'unit' : 'units'} available
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Rest of the component remains the same...
  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <Icon name="share" size={24} color="#333" />
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity 
                onPress={handleDelete} 
                style={[styles.headerButton, styles.deleteButton]}
              >
                <Icon name="delete" size={24} color="#dc3545" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        
        {/* Image Slider Section */}
        {item.images && item.images.length > 0 ? (
          <View style={styles.imageSliderContainer}>
            <FlatList
              ref={flatListRef}
              data={item.images}
              renderItem={renderImageItem}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyExtractor={(_, index) => index.toString()}
            />
            {renderImagePagination()}
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Icon name="image-not-supported" size={48} color="#6c757d" />
            <Text style={styles.noImageText}>No Image Available</Text>
          </View>
        )}
        {/* Item Details Section */}
        <View style={styles.detailsContainer}>
          <Text style={styles.itemName}>{item.itemName}</Text>
          
          {/* Price Section */}
          <View style={styles.priceContainer}>
            <Icon name="attach-money" size={24} color="#28a745" />
            <Text style={styles.price}>
              Rs. {Number(item.price).toLocaleString()}
            </Text>
          </View>

          {/* Stock Status Section */}
          {renderStockStatus()}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Item Status and Availability */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Icon name="verified" size={20} color="#007bff" />
              <Text style={styles.statusText}>Verified Item</Text>
            </View>
            <View style={styles.statusItem}>
              <Icon name="local-shipping" size={20} color="#28a745" />
              <Text style={styles.statusText}>Free Delivery</Text>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>

          {/* Seller Information */}
          <View style={styles.sellerContainer}>
            <Text style={styles.sectionTitle}>Seller Information</Text>
            <View style={styles.sellerInfo}>
              {loading ? (
                <View style={styles.sellerImagePlaceholder}>
                  <Icon name="account-circle" size={40} color="#6c757d" />
                </View>
              ) : sellerData ? (
                sellerData.profileImage ? (
                  <Image 
                    source={{ uri: sellerData.profileImage }} 
                    style={styles.sellerImage}
                  />
                ) : (
                  <View style={styles.sellerImagePlaceholder}>
                    <Icon name="account-circle" size={40} color="#6c757d" />
                  </View>
                )
              ) : (
                <View style={styles.sellerImagePlaceholder}>
                  <Icon name="account-circle" size={40} color="#6c757d" />
                </View>
              )}
              <View style={styles.sellerDetails}>
                {loading ? (
                  <Text style={styles.sellerName}>Loading seller details...</Text>
                ) : sellerData ? (
                  <>
                    <Text style={styles.sellerName}>{sellerData.name}</Text>
                    <Text style={styles.sellerRating}>
                      <Icon name="star" size={16} color="#ffc107" /> 4.5 (120 reviews)
                    </Text>
                  </>
                ) : (
                  <Text style={styles.sellerName}>Seller not found</Text>
                )}
              </View>
            </View>
          </View>
        </View>
     
       {/* Add Edit Button for Owner in Item Details Section */}
       {isOwner && (
          <View style={styles.ownerActionsContainer}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('EditItem', { item })}
            >
              <Icon name="edit" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit Item</Text>
            </TouchableOpacity>
          </View>
        )}

      {/* Modify Bottom Action Button */}
      <View style={styles.bottomContainer}>
          {!isOwner ? (
            <TouchableOpacity 
              style={[
                styles.contactButton,
                item.Stock === 0 && styles.disabledButton
              ]}
              disabled={item.Stock === 0}
            >
              <Icon name="chat" size={24} color="#fff" />
              <Text style={styles.contactButtonText}>
                {item.Stock === 0 ? 'Out of Stock' : 'Contact Seller'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.ownerBottomContainer}>
              <Text style={styles.ownerItemText}>You are the owner of this item</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
    padding: 8,
  },
  deleteButton: {
    marginLeft: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 300,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 20,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
  },
  noImageContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  noImageText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
  },
  detailsContainer: {
    padding: 16,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  priceStockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 22,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 4,
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 16,
  },
  outOfStockText: {
    color: '#dc3545',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e9ecef',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    color: '#495057',
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#212529',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#495057',
  },
  sellerContainer: {
    marginBottom: 16,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  sellerDetails: {
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  sellerRating: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  bottomContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e9ecef',
  },
  contactButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sellerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sellerImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 22,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 4,
  },
  stockInfoContainer: {
    marginBottom: 16,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  stockText: {
    color: '#28a745',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  stockCountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  outOfStockText: {
    color: '#dc3545',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginBottom: 16,
  },
  
  stockInfoContainer: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  stockStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  inStockText: {
    color: '#28a745',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  stockCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  stockCount: {
    marginLeft: 6,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  outOfStockContainer: {
    marginBottom: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  outOfStockText: {
    color: '#dc3545',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  imageSliderContainer: {
    height: 300,
    width: width,
    backgroundColor: '#f8f9fa',
  },
  imageSlide: {
    width: width,
    height: 300,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  ownerActionsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  ownerBottomContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  ownerItemText: {
    fontSize: 16,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});

export default ItemDetails;