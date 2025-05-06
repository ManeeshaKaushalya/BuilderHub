import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Share, Dimensions, FlatList, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

const ItemDetails = ({ route, navigation }) => {
  const { item: initialItem } = route.params;
  const [item, setItem] = useState(initialItem);
  const [sellerData, setSellerData] = useState(null);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [averageSellerRating, setAverageSellerRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingSellerReviews, setLoadingSellerReviews] = useState(true);
  const [showReviews, setShowReviews] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const flatListRef = useRef(null);
  const { user } = useUser();

  const isOwner = user?.uid === item.itemOwnerId;

  const handleBuyNow = () => {
    navigation.navigate('BuyItem', { item });
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(firestore, 'items', item.id));
              Alert.alert('Success', 'Item deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item. Please try again.');
            }
          },
        },
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
      <Image source={{ uri: imageUrl }} style={styles.slideImage} resizeMode="cover" />
    </View>
  );

  const renderImagePagination = () => {
    if (!item.images || item.images.length <= 1) return null;
    return (
      <View style={styles.paginationContainer}>
        {item.images.map((_, index) => (
          <View
            key={index}
            style={[styles.paginationDot, index === activeImageIndex && styles.paginationDotActive]}
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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return 'Just now';
      const now = new Date();
      const diff = now - date;
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Just now';
    }
  };

  const renderSellerReview = ({ item }) => (
    <View style={styles.reviewContainer}>
      <View style={styles.reviewHeader}>
        {item.reviewerProfileImage ? (
          <Image source={{ uri: item.reviewerProfileImage }} style={styles.reviewerImage} />
        ) : (
          <View style={styles.reviewerImagePlaceholder}>
            <Icon name="account-circle" size={40} color="#78909C" />
          </View>
        )}
        <View style={styles.reviewHeaderText}>
          <Text style={styles.reviewerName}>{item.reviewerName || 'Anonymous'}</Text>
          <View style={styles.ratingContainer}>
            {[...Array(5)].map((_, index) => (
              <Icon
                key={index}
                name={index < item.rating ? 'star' : 'star-border'}
                size={16}
                color="#F4B400"
              />
            ))}
            <Text style={styles.reviewTimestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>
        </View>
      </View>
      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}
    </View>
  );

  useEffect(() => {
    const itemRef = doc(firestore, 'items', item.id);
    const unsubscribeItem = onSnapshot(
      itemRef,
      (doc) => {
        if (doc.exists()) {
          setItem({ id: doc.id, ...doc.data() });
        }
      },
      (error) => {
        console.error('Error listening to item updates:', error);
      }
    );

    const setupSellerListener = () => {
      if (!item.itemOwnerId) return null;
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('uid', '==', item.itemOwnerId));
      return onSnapshot(
        q,
        (querySnapshot) => {
          setLoading(false);
          if (!querySnapshot.empty) {
            const sellerDoc = querySnapshot.docs[0];
            setSellerData(sellerDoc.data());
          } else {
            console.log('No seller found with ID:', item.itemOwnerId);
            setSellerData(null);
          }
        },
        (error) => {
          console.error('Error listening to seller updates:', error);
          setLoading(false);
        }
      );
    };

    const setupSellerReviewsListener = () => {
      if (!item.itemOwnerId) return null;
      const reviewsRef = collection(firestore, 'users', item.itemOwnerId, 'reviews');
      const reviewsQuery = query(reviewsRef, orderBy('timestamp', 'desc'));
      return onSnapshot(
        reviewsQuery,
        (snapshot) => {
          const reviewList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setSellerReviews(reviewList);
          const totalRating = reviewList.reduce((sum, review) => sum + (review.rating || 0), 0);
          const avgRating = reviewList.length > 0 ? (totalRating / reviewList.length).toFixed(1) : 0;
          setAverageSellerRating(avgRating);
          setLoadingSellerReviews(false);
        },
        (error) => {
          console.error('Error fetching seller reviews:', error);
          setLoadingSellerReviews(false);
        }
      );
    };

    const unsubscribeSeller = setupSellerListener();
    const unsubscribeSellerReviews = setupSellerReviewsListener();

    return () => {
      unsubscribeItem();
      if (unsubscribeSeller) unsubscribeSeller();
      if (unsubscribeSellerReviews) unsubscribeSellerReviews();
    };
  }, [item.itemOwnerId, item.id]);

  const renderStockStatus = () => {
    if (item.Stock == 0) {
      return (
        <View style={styles.outOfStockContainer}>
          <View style={styles.outOfStockBadge}>
            <Icon name="remove-shopping-cart" size={20} color="#D32F2F" />
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.stockInfoContainer}>
        <View style site={styles.stockStatusRow}>
          <View style={styles.inStockBadge}>
            <Icon name="check-circle" size={20} color="#2E7D32" />
            <Text style={styles.inStockText}>In Stock</Text>
          </View>
          <View style={styles.stockCountBadge}>
            <Icon name="inventory-2" size={20} color="#616161" />
            <Text style={styles.stockCount}>
              {item.Stock} {item.Stock === 1 ? 'unit' : 'units'} available
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={20} color="#212121" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Icon name="share" size={20} color="#212121" />
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity
                style={[styles.headerButton, styles.deleteButton]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Icon name="delete" size={20} color="#D32F2F" />
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
            <Icon name="image-not-supported" size={48} color="#78909C" />
            <Text style={styles.noImageText}>No Image Available</Text>
          </View>
        )}

        {/* Item Details Section */}
        <View style={styles.detailsContainer}>
          <Text style={styles.itemName}>{item.itemName}</Text>

          {/* Price Section */}
          <View style={styles.priceContainer}>
            <Icon name="money" size={24} color="#2E7D32" />
            <Text style={styles.price}>Rs. {Number(item.price).toLocaleString()}</Text>
          </View>

          {/* Stock Status Section */}
          {renderStockStatus()}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Item Status and Availability */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Icon name="verified" size={20} color="#1976D2" />
              <Text style={styles.statusText}>Verified Item</Text>
            </View>
            <View style={styles.statusItem}>
              <Icon name="local-shipping" size={20} color="#2E7D32" />
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
                  <Icon name="account-circle" size={40} color="#78909C" />
                </View>
              ) : sellerData ? (
                sellerData.profileImage ? (
                  <Image source={{ uri: sellerData.profileImage }} style={styles.sellerImage} />
                ) : (
                  <View style={styles.sellerImagePlaceholder}>
                    <Icon name="account-circle" size={40} color="#78909C" />
                  </View>
                )
              ) : (
                <View style={styles.sellerImagePlaceholder}>
                  <Icon name="account-circle" size={40} color="#78909C" />
                </View>
              )}
              <View style={styles.sellerDetails}>
                {loading ? (
                  <Text style={styles.sellerName}>Loading seller details...</Text>
                ) : sellerData ? (
                  <>
                    <Text style={styles.sellerName}>{sellerData.name}</Text>
                    {loadingSellerReviews ? (
                      <Text style={styles.sellerRating}>Loading reviews...</Text>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setShowReviews(!showReviews)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.sellerRating}>
                          <Icon name="star" size={16} color="#F4B400" /> {averageSellerRating}{' '}
                          ({sellerReviews.length}{' '}
                          {sellerReviews.length === 1 ? 'review' : 'reviews'})
                          <Icon
                            name={showReviews ? 'expand-less' : 'expand-more'}
                            size={16}
                            color="#78909C"
                          />
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <Text style={styles.sellerName}>Seller not found</Text>
                )}
              </View>
            </View>
            {showReviews && !loadingSellerReviews && (
              <View style={styles.sellerReviewsContainer}>
                {sellerReviews.length === 0 ? (
                  <Text style={styles.noReviewsText}>No reviews yet</Text>
                ) : (
                  <FlatList
                    data={sellerReviews}
                    renderItem={renderSellerReview}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    style={styles.reviewsList}
                  />
                )}
              </View>
            )}
          </View>
        </View>

        {/* Owner Actions */}
        {isOwner && (
          <View style={styles.ownerActionsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('EditItem', { item })}
              activeOpacity={0.7}
            >
              <Icon name="edit" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit Item</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        {!isOwner ? (
          <View style={styles.buyActionsContainer}>
            <TouchableOpacity
              style={[
                styles.contactButton,
                { flex: 1, marginRight: 8 },
                item.Stock === 0 && styles.disabledButton,
              ]}
              disabled={item.Stock === 0}
              onPress={() => navigation.navigate('ChatScreen', { item, sellerData })}
              activeOpacity={0.7}
            >
              <Icon name="chat" size={24} color="#fff" />
              <Text style={styles.contactButtonText}>
                {item.Stock === 0 ? 'Out of Stock' : 'Contact Seller'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buyButton, { flex: 1 }, item.Stock === 0 && styles.disabledButton]}
              onPress={handleBuyNow}
              disabled={item.Stock === 0}
              activeOpacity={0.7}
            >
              <Icon name="shopping-cart" size={24} color="#fff" />
              <Text style={styles.buyButtonText}>
                {item.Stock === 0 ? 'Out of Stock' : 'Buy Now'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ownerBottomContainer}>
            <Text style={styles.ownerItemText}>You are the owner of this item</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F4B018',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    padding: 12,
    borderRadius: 24,
    backgroundColor: '#F4B018',
  },
  deleteButton: {
    marginLeft: 12,
    backgroundColor: '#F4B018',
  },
  imageSliderContainer: {
    height: 300,
    width: width,
    backgroundColor: '#ECEFF1',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  noImageContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECEFF1',
  },
  noImageText: {
    fontSize: 16,
    color: '#78909C',
    marginTop: 8,
    fontWeight: '500',
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    elevation: 2,
  },
  itemName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    color: '#212121',
    lineHeight: 36,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 24,
    color: '#2E7D32',
    fontWeight: '700',
    marginLeft: 8,
    lineHeight: 32,
  },
  stockInfoContainer: {
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
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
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  inStockText: {
    color: '#2E7D32',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  stockCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  stockCount: {
    marginLeft: 8,
    color: '#616161',
    fontSize: 14,
    fontWeight: '500',
  },
  outOfStockContainer: {
    marginBottom: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCDD2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  outOfStockText: {
    color: '#D32F2F',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    color: '#424242',
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#212121',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#424242',
    fontWeight: '400',
  },
  sellerContainer: {
    marginBottom: 16,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  sellerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sellerImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sellerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  sellerRating: {
    fontSize: 14,
    color: '#616161',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerActionsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    padding: 12,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
  },
  buyActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
    elevation: 2,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    padding: 12,
    borderRadius: 8,
    elevation: 2,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#78909C',
    opacity: 0.7,
  },
  ownerBottomContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderRadius: 8,
  },
  ownerItemText: {
    fontSize: 16,
    color: '#616161',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  sellerReviewsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  noReviewsText: {
    fontSize: 16,
    color: '#78909C',
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: '500',
  },
  reviewsList: {
    marginTop: 8,
  },
  reviewContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reviewerImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewTimestamp: {
    fontSize: 12,
    color: '#78909C',
    marginLeft: 8,
    fontWeight: '400',
  },
  reviewComment: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    fontWeight: '400',
  },
});

export default ItemDetails;