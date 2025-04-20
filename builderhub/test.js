import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { firestore, auth } from '../../firebase/firebase';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { Hotel } from '../../utils/HotelClass';
import { Calendar } from 'react-native-calendars';

const { width } = Dimensions.get('window');

const HotelDetail = ({ route, navigation }) => {
  const { hotelId } = route.params;
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedDates, setSelectedDates] = useState({});
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [bookingStep, setBookingStep] = useState(1);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchHotelDetails = async () => {
      try {
        setLoading(true);
        const hotelRef = doc(firestore, 'hotels', hotelId);
        const hotelSnap = await getDoc(hotelRef);
        
        if (hotelSnap.exists()) {
          const hotelData = { id: hotelSnap.id, ...hotelSnap.data() };
          setHotel(new Hotel(hotelData));
        } else {
          setError('Hotel not found');
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch hotel details');
        setLoading(false);
        console.error('Error fetching hotel details:', err);
      }
    };

    fetchHotelDetails();
  }, [hotelId]);

  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);
    const timeDiff = endDate.getTime() - startDate.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return nights > 0 ? nights : 0;
  };

  useEffect(() => {
    if (selectedRoomType && checkInDate && checkOutDate) {
      const nights = calculateNights();
      const roomPrice = parseFloat(selectedRoomType.price) || 0;
      setTotalPrice(roomPrice * nights);
    } else {
      setTotalPrice(0);
    }
  }, [selectedRoomType, checkInDate, checkOutDate]);

  const handleBookNow = (roomType) => {
    if (!user) {
      Alert.alert("Please Sign In", "You need to be signed in to book a room.");
      return;
    }
    setSelectedRoomType(roomType);
    setBookingModalVisible(true);
    setBookingStep(1);
    setSelectedDates({});
    setCheckInDate('');
    setCheckOutDate('');
    setGuests(1);
  };

  const handleDayPress = (day) => {
    const dateStr = day.dateString;
    
    if (!checkInDate || (checkInDate && checkOutDate)) {
      setCheckInDate(dateStr);
      setCheckOutDate('');
      setSelectedDates({
        [dateStr]: { selected: true, startingDay: true, color: '#007AFF' }
      });
    } else if (checkInDate && !checkOutDate) {
      const startDate = new Date(checkInDate);
      const endDate = new Date(dateStr);
      
      if (endDate < startDate) {
        setCheckOutDate(checkInDate);
        setCheckInDate(dateStr);
        markDateRange(dateStr, checkInDate);
      } else {
        setCheckOutDate(dateStr);
        markDateRange(checkInDate, dateStr);
      }
    }
  };

  const markDateRange = (start, end) => {
    const markedDates = {};
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (dateStr === start) {
        markedDates[dateStr] = { selected: true, startingDay: true, color: '#007AFF' };
      } else if (dateStr === end) {
        markedDates[dateStr] = { selected: true, endingDay: true, color: '#007AFF' };
      } else {
        markedDates[dateStr] = { selected: true, color: '#007AFF' };
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setSelectedDates(markedDates);
  };

  const incrementGuests = () => {
    const maxCapacity = selectedRoomType?.capacity ? parseInt(selectedRoomType.capacity) : 2;
    if (guests < maxCapacity) {
      setGuests(guests + 1);
    } else {
      Alert.alert("Maximum Capacity", `This room can only accommodate ${maxCapacity} guests.`);
    }
  };

  const decrementGuests = () => {
    if (guests > 1) {
      setGuests(guests - 1);
    }
  };

  const moveToNextStep = () => {
    if (bookingStep === 1 && (!checkInDate || !checkOutDate)) {
      Alert.alert("Date Selection Required", "Please select both check-in and check-out dates.");
      return;
    }
    
    if (bookingStep < 3) {
      setBookingStep(bookingStep + 1);
    } else {
      confirmBooking();
    }
  };

  const moveToPreviousStep = () => {
    if (bookingStep > 1) {
      setBookingStep(bookingStep - 1);
    } else {
      setBookingModalVisible(false);
    }
  };

  const confirmBooking = async () => {
    if (!user) {
      Alert.alert("Error", "Please sign in to make a booking");
      return;
    }

    try {
      const bookingData = {
        userId: user.uid,
        hotelId: hotelId,
        hotelName: hotel.name,
        roomType: selectedRoomType.name,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        guests: guests,
        nights: calculateNights(),
        pricePerNight: parseFloat(selectedRoomType.price),
        totalPrice: totalPrice * 1.1,
        bookingDate: new Date().toISOString(),
        status: 'confirmed',
      };

      const bookingRef = doc(collection(firestore, 'bookings'));
      await setDoc(bookingRef, bookingData);

      const hotelRef = doc(firestore, 'hotels', hotelId);
      const updatedRoomTypes = hotel.roomTypes.map(room => {
        if (room.name === selectedRoomType.name) {
          return { ...room, quantity: parseInt(room.quantity) - 1 };
        }
        return room;
      });
      await setDoc(hotelRef, { roomTypes: updatedRoomTypes }, { merge: true });

      Alert.alert(
        "Booking Confirmed!",
        `Your ${selectedRoomType.name} has been booked at ${hotel.name} from ${formatDate(checkInDate)} to ${formatDate(checkOutDate)} for $${(totalPrice * 1.1).toFixed(2)}.\nBooking ID: ${bookingRef.id}`,
        [
          { 
            text: "OK", 
            onPress: () => {
              setBookingModalVisible(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error saving booking:", error);
      Alert.alert("Error", "Failed to save booking. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleCall = () => {
    if (hotel?.contactNumber) {
      Linking.openURL(`tel:${hotel.contactNumber}`);
    } else {
      Alert.alert("Contact Unavailable", "Sorry, this hotel's contact number is not available.");
    }
  };

  const handleViewWebsite = () => {
    if (hotel?.website && hotel.website !== '') {
      Linking.openURL(hotel.website);
    } else {
      Alert.alert("Website Unavailable", "Sorry, this hotel doesn't have a website listed.");
    }
  };

  const handleViewOnMap = () => {
    Alert.alert("View on Map", "Map functionality would open here with the hotel location.");
  };

  const renderImageModal = () => (
    <Modal
      visible={imageModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setImageModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => setImageModalVisible(false)}
        >
          <Ionicons name="close-circle" size={30} color="#fff" />
        </TouchableOpacity>
        <View style={styles.imageIndicator}>
          <Text style={styles.imageCounter}>
            {currentImageIndex + 1}/{hotel?.imageUrls?.length || 0}
          </Text>
        </View>
        <FlatList
          horizontal
          pagingEnabled
          data={hotel?.imageUrls || []}
          keyExtractor={(_, index) => index.toString()}
          initialScrollIndex={currentImageIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.floor(
              event.nativeEvent.contentOffset.x / width
            );
            setCurrentImageIndex(newIndex);
          }}
        />
      </View>
    </Modal>
  );

  const renderBookingModal = () => (
    <Modal
      visible={bookingModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setBookingModalVisible(false)}
    >
      <SafeAreaView style={styles.bookingModalContainer}>
        <View style={styles.bookingModalContent}>
          <View style={styles.bookingModalHeader}>
            <TouchableOpacity onPress={moveToPreviousStep}>
              {bookingStep > 1 ? (
                <Ionicons name="arrow-back" size={24} color="#007AFF" />
              ) : (
                <Ionicons name="close" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
            <Text style={styles.bookingModalTitle}>
              {bookingStep === 1 ? "Select Dates" : 
               bookingStep === 2 ? "Guest Details" : "Review Booking"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.bookingModalBody}>
            {bookingStep === 1 && (
              <View>
                <View style={styles.selectedRoomSummary}>
                  <Text style={styles.selectedRoomName}>{selectedRoomType?.name}</Text>
                  <Text style={styles.selectedRoomPrice}>${selectedRoomType?.price}/night</Text>
                </View>

                <Text style={styles.calendarLabel}>Select check-in and check-out dates:</Text>
                <Calendar
                  markingType={'period'}
                  markedDates={selectedDates}
                  minDate={new Date().toISOString().split('T')[0]}
                  onDayPress={handleDayPress}
                  theme={{
                    calendarBackground: '#fff',
                    textSectionTitleColor: '#b6c1cd',
                    selectedDayBackgroundColor: '#007AFF',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#007AFF',
                    dayTextColor: '#2d4150',
                    textDisabledColor: '#d9e1e8',
                    dotColor: '#007AFF',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#007AFF',
                    monthTextColor: '#2d4150',
                    indicatorColor: '#007AFF',
                  }}
                />

                <View style={styles.selectedDatesContainer}>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateLabel}>Check-in:</Text>
                    <Text style={styles.dateValue}>{formatDate(checkInDate) || 'Select date'}</Text>
                  </View>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateLabel}>Check-out:</Text>
                    <Text style={styles.dateValue}>{formatDate(checkOutDate) || 'Select date'}</Text>
                  </View>
                </View>
                
                {checkInDate && checkOutDate && (
                  <Text style={styles.nightsCount}>
                    {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            )}

            {bookingStep === 2 && (
              <View>
                <View style={styles.bookingSummary}>
                  <Text style={styles.bookingSummaryTitle}>Your Stay</Text>
                  <View style={styles.bookingSummaryRow}>
                    <Text style={styles.bookingSummaryLabel}>Room Type:</Text>
                    <Text style={styles.bookingSummaryValue}>{selectedRoomType?.name}</Text>
                  </View>
                  <View style={styles.bookingSummaryRow}>
                    <Text style={styles.bookingSummaryLabel}>Dates:</Text>
                    <Text style={styles.bookingSummaryValue}>
                      {formatDate(checkInDate)} to {formatDate(checkOutDate)}
                    </Text>
                  </View>
                  <View style={styles.bookingSummaryRow}>
                    <Text style={styles.bookingSummaryLabel}>Duration:</Text>
                    <Text style={styles.bookingSummaryValue}>
                      {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.guestSection}>
                  <Text style={styles.guestSectionTitle}>Number of Guests</Text>
                  <View style={styles.guestCounter}>
                    <TouchableOpacity 
                      style={styles.guestButton} 
                      onPress={decrementGuests}
                      disabled={guests <= 1}
                    >
                      <Ionicons name="remove" size={20} color={guests <= 1 ? "#ccc" : "#007AFF"} />
                    </TouchableOpacity>
                    <Text style={styles.guestCount}>{guests}</Text>
                    <TouchableOpacity 
                      style={styles.guestButton}
                      onPress={incrementGuests}
                    >
                      <Ionicons name="add" size={20} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.guestCapacity}>
                    Max capacity: {selectedRoomType?.capacity || 2} guests
                  </Text>
                </View>
              </View>
            )}

            {bookingStep === 3 && (
              <View>
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Booking Summary</Text>
                  
                  <View style={styles.reviewHotelInfo}>
                    <Text style={styles.reviewHotelName}>{hotel?.name}</Text>
                    <View style={styles.reviewHotelLocation}>
                      <Ionicons name="location" size={14} color="#666" />
                      <Text style={styles.reviewLocationText}>{hotel?.location}, Sri Lanka</Text>
                    </View>
                  </View>
                  
                  <View style={styles.reviewDetail}>
                    <Text style={styles.reviewDetailLabel}>Room Type:</Text>
                    <Text style={styles.reviewDetailValue}>{selectedRoomType?.name}</Text>
                  </View>
                  
                  <View style={styles.reviewDetail}>
                    <Text style={styles.reviewDetailLabel}>Check-in:</Text>
                    <Text style={styles.reviewDetailValue}>{formatDate(checkInDate)}</Text>
                  </View>
                  
                  <View style={styles.reviewDetail}>
                    <Text style={styles.reviewDetailLabel}>Check-out:</Text>
                    <Text style={styles.reviewDetailValue}>{formatDate(checkOutDate)}</Text>
                  </View>
                  
                  <View style={styles.reviewDetail}>
                    <Text style={styles.reviewDetailLabel}>Guests:</Text>
                    <Text style={styles.reviewDetailValue}>{guests}</Text>
                  </View>
                  
                  <View style={styles.reviewDetail}>
                    <Text style={styles.reviewDetailLabel}>Duration:</Text>
                    <Text style={styles.reviewDetailValue}>
                      {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.priceBreakdown}>
                  <Text style={styles.priceBreakdownTitle}>Price Breakdown</Text>
                  
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>
                      {selectedRoomType?.name} × {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.priceValue}>${totalPrice}</Text>
                  </View>
                  
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Taxes and fees (10%)</Text>
                    <Text style={styles.priceValue}>${(totalPrice * 0.1).toFixed(2)}</Text>
                  </View>
                  
                  <View style={[styles.priceRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${(totalPrice * 1.1).toFixed(2)}</Text>
                  </View>
                </View>
                
                <View style={styles.paymentSection}>
                  <Text style={styles.paymentTitle}>Payment at the Hotel</Text>
                  <Text style={styles.paymentInfo}>
                    You'll pay during your stay. Cancellation is free up to 24 hours before check-in.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.bookingModalFooter}>
            {bookingStep === 3 ? (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmBooking}
              >
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={moveToNextStep}
              >
                <Text style={styles.nextButtonText}>
                  {bookingStep === 1 ? "Continue" : "Review Booking"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const openGallery = (index) => {
    setCurrentImageIndex(index);
    setImageModalVisible(true);
  };

  const renderRoomTypeItem = ({ item }) => (
    <View style={styles.roomTypeCard}>
      <View style={styles.roomTypeHeader}>
        <Text style={styles.roomTypeName}>{item.name}</Text>
        <View style={styles.capacityContainer}>
          <Ionicons name="people" size={16} color="#666" />
          <Text style={styles.capacityText}>
            Max: {item.capacity} {parseInt(item.capacity) > 1 ? 'people' : 'person'}
          </Text>
        </View>
      </View>
      
      <View style={styles.roomTypeDetails}>
        <View style={styles.roomTypeInfo}>
          <Text style={styles.roomTypePrice}>${item.price}<Text style={styles.perNight}>/night</Text></Text>
          <Text style={styles.availabilityText}>
            {parseInt(item.quantity) > 0 
              ? `${item.quantity} rooms available` 
              : 'No rooms available'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.bookButton,
            parseInt(item.quantity) === 0 && styles.disabledButton
          ]}
          onPress={() => handleBookNow(item)}
          disabled={parseInt(item.quantity) === 0}
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !hotel) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Failed to load hotel details'}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={hotel.imageUrls || []}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item, index }) => (
              <TouchableOpacity onPress={() => openGallery(index)}>
                <Image 
                  source={{ uri: item }} 
                  style={styles.hotelImage}
                  defaultSource={require('../../assets/placeholder-hotel.jpg')}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Image 
                source={require('../../assets/placeholder-hotel.jpg')} 
                style={styles.hotelImage}
              />
            }
          />
          {hotel.imageUrls && hotel.imageUrls.length > 0 && (
            <View style={styles.imagePaginationContainer}>
              {hotel.imageUrls.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.paginationDot,
                    index === currentImageIndex && styles.paginationDotActive
                  ]} 
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.hotelName}>{hotel.name}</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.starContainer}>
              {[...Array(parseInt(hotel.starRating) || 0)].map((_, i) => (
                <Ionicons key={i} name="star" size={16} color="#FFD700" />
              ))}
            </View>
            <Text style={styles.categoryText}>{hotel.category}</Text>
          </View>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.locationText}>{hotel.location}, Sri Lanka</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Ionicons name="call" size={22} color="#007AFF" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleViewWebsite}>
            <Ionicons name="globe" size={22} color="#007AFF" />
            <Text style={styles.actionText}>Website</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleViewOnMap}>
            <Ionicons name="map" size={22} color="#007AFF" />
            <Text style={styles.actionText}>Map</Text>
          </TouchableOpacity>
        </View>

        {hotel.description && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{hotel.description}</Text>
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          <View style={styles.operatingHoursContainer}>
            <View style={styles.operatingHourItem}>
              <Text style={styles.operatingHourLabel}>Check-in:</Text>
              <Text style={styles.operatingHourValue}>{hotel.hotelOperatingInfo?.checkIn || 'N/A'}</Text>
            </View>
            <View style={styles.operatingHourItem}>
              <Text style={styles.operatingHourLabel}>Check-out:</Text>
              <Text style={styles.operatingHourValue}>{hotel.hotelOperatingInfo?.checkOut || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesContainer}>
            {hotel.amenities && hotel.amenities.length > 0 ? (
              hotel.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityItem}>
                  <Ionicons 
                    name={getAmenityIcon(amenity)} 
                    size={18} 
                    color="#007AFF" 
                    style={styles.amenityIcon}
                  />
                  <Text style={styles.amenityText}>{formatAmenityName(amenity)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No amenities listed</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Available Rooms</Text>
          {hotel.roomTypes && hotel.roomTypes.length > 0 ? (
            <FlatList
              data={hotel.roomTypes}
              renderItem={renderRoomTypeItem}
              keyExtractor={(item, index) => `${item.name}-${index}`}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noDataText}>No room information available</Text>
          )}
        </View>
        

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Hotel Details</Text>
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Total Rooms:</Text>
              <Text style={styles.detailValue}>{hotel.totalRooms || 'N/A'}</Text>
            </View>
            {hotel.yearBuilt && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Year Built:</Text>
                <Text style={styles.detailValue}>{hotel.yearBuilt}</Text>
              </View>
            )}
            {hotel.renovationYear && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Last Renovated:</Text>
                <Text style={styles.detailValue}>{hotel.renovationYear}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {renderImageModal()}
      {renderBookingModal()}
    </SafeAreaView>
  );
};

const getAmenityIcon = (amenity) => {
  const amenityMap = {
    'wifi': 'wifi',
    'parking': 'car',
    'restaurant': 'restaurant',
    'airConditioning': 'snow',
    'conferenceRoom': 'business',
    'gym': 'fitness',
    'pool': 'water',
    'spa': 'flower',
    'bar': 'wine',
    'roomService': 'cart',
  };
  
  return amenityMap[amenity] || 'checkmark-circle';
};

const formatAmenityName = (amenity) => {
  const formatted = amenity.replace(/([A-Z])/g, ' $1').trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 80,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  hotelImage: {
    width: width,
    height: 250,
    resizeMode: 'cover',
  },
  imagePaginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  hotelName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starContainer: {
    flexDirection: 'row',
    marginRight: 10,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  actionContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: '#007AFF',
    fontSize: 12,
    marginTop: 4,
  },
  sectionContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  noDataText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  operatingHoursContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  operatingHourItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  operatingHourLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  operatingHourValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 12,
  },
  amenityIcon: {
    marginRight: 8,
  },
  amenityText: {
    fontSize: 14,
    color: '#555',
  },
  roomTypeCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
  },
  roomTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 5,
  },
  roomTypeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTypeInfo: {
    flex: 1,
  },
  roomTypePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  perNight: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
  },
  availabilityText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  bookButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  detailsContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  imageIndicator: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    zIndex: 10,
  },
  imageCounter: {
    color: 'white',
    fontSize: 14,
  },
  fullScreenImage: {
    width: width,
    height: '100%',
  },
  bookingModalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  bookingModalContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  bookingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  bookingModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  bookingModalBody: {
    flex: 1,
    padding: 16,
  },
  bookingModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedRoomSummary: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedRoomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedRoomPrice: {
    fontSize: 14,
    color: '#666',
  },
  calendarLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  selectedDatesContainer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateContainer: {
    width: '48%',
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  nightsCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'right',
  },
  bookingSummary: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  bookingSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  bookingSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bookingSummaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  bookingSummaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  guestSection: {
    marginBottom: 24,
  },
  guestSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16,
  },
  guestCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  guestButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 24,
  },
  guestCapacity: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  reviewHotelInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  reviewHotelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewHotelLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewLocationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  reviewDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  reviewDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  priceBreakdown: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  priceBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#e9f7ef',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  paymentInfo: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  }
});

export default HotelDetail;