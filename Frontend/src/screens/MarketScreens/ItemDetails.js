import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../../../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const ItemDetails = ({ route, navigation }) => {
  const { item } = route.params;
  const [sellerData, setSellerData] = useState(null);
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        setLoading(true);
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('uid', '==', item.itemOwnerId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Get the first document since uid should be unique
          const sellerDoc = querySnapshot.docs[0];
          setSellerData(sellerDoc.data());
        } else {
          console.log('No seller found with ID:', item.itemOwnerId);
        }
      } catch (error) {
        console.error('Error fetching seller data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (item.itemOwnerId) {
      fetchSellerData();
    }
  }, [item.itemOwnerId]);



  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare}>
            <Icon name="share" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Image Section */}
        {item.images && item.images.length > 0 ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.image} 
              resizeMode="cover" 
            />
            {item.images.length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  +{item.images.length - 1} more
                </Text>
              </View>
            )}
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
          <View style={styles.priceContainer}>
            <Icon name="attach-money" size={24} color="#28a745" />
            <Text style={styles.price}>
              Rs. {Number(item.price).toLocaleString()}
            </Text>
          </View>

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
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.contactButton}>
          <Icon name="chat" size={24} color="#fff" />
          <Text style={styles.contactButtonText}>Contact Seller</Text>
        </TouchableOpacity>
      </View>
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
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 22,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 4,
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
});

export default ItemDetails;
