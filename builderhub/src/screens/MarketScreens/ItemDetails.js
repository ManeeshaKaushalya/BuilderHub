import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Share, FlatList, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import { styles, width } from '../../styles/marketplacestyles/ItemDetailsStyles'; // Import styles and width

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
        <View style={styles.stockStatusRow}>
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

export default ItemDetails;