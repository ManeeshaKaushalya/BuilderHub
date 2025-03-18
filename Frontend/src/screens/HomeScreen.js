import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Animated, Image, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../hooks/ThemeContext';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';

// Constants
const GOOGLE_API_KEY = 'AIzaSyBDEAmbHkQokLum169Nr4aY_FpIf80TuCE';
const DEFAULT_PROFILE_IMAGE = require('../../assets/default-profile.png');

// Component
const HomeScreen = () => {
  const { isDarkMode } = useTheme();
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userLocations, setUserLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [watchSubscription, setWatchSubscription] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(0));
  const [searchText, setSearchText] = useState('');
  const [searchRadius, setSearchRadius] = useState(10); // km
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('distance'); // distance, rating, experience
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // all, available, busy
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');

  // List of professions for filter
  const professions = ['All', 'Constructor', 'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Mason'];
  
  // Utility Functions
  const parseLocation = (locationString) => {
    try {
      const [latitude, longitude] = locationString.split(',').map(coord => parseFloat(coord.trim()));
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error(`Invalid location format: ${locationString}`);
      }
      return { latitude, longitude };
    } catch (error) {
      console.warn(`Invalid location format: ${locationString}`);
      return null;
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Generate random availability status for demo purposes
  const getRandomAvailability = () => {
    const statuses = ['Available Now', 'Busy', 'Offline'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  // Fetch user locations from Firestore
  const fetchUserLocations = () => {
    return onSnapshot(collection(firestore, 'users'), (snapshot) => {
      const locations = snapshot.docs
        .map(doc => {
          const data = doc.data();
          const locationObj = data.location ? parseLocation(data.location) : null;
          
          if (!locationObj) return null;
          
          // Calculate distance if we have current location
          let distance = null;
          if (currentLocation) {
            distance = calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              locationObj.latitude,
              locationObj.longitude
            );
          }
          
          // Include availability status (random for demo)
          const availability = getRandomAvailability();
          
          return {
            id: doc.id,
            ...locationObj,
            name: data.name || 'Anonymous',
            profession: data.profession || 'Unknown',
            profileImage: data.profileImage || null,
            averageRating: data.averageRating || 0,
            experience: data.experience || '0',
            skills: data.skills || '',
            distance: distance,
            availability: availability
          };
        })
        .filter(location => location !== null);
      
      setUserLocations(locations);
      applyFilters(locations);
    }, (error) => {
      console.error('Firestore fetch error:', error);
      Alert.alert('Error', 'Failed to fetch user locations.');
    });
  };

  // Apply filters to the user locations
  const applyFilters = (locations = userLocations) => {
    if (!currentLocation) return;
    
    let filtered = [...locations];
    
    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        user.profession.toLowerCase().includes(searchText.toLowerCase()) ||
        user.skills.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // Filter by distance
    filtered = filtered.filter(user => 
      user.distance !== null && user.distance <= searchRadius
    );
    
    // Filter by profession
    if (selectedProfession !== 'All') {
      filtered = filtered.filter(user => 
        user.profession === selectedProfession
      );
    }
    
    // Filter by rating
    filtered = filtered.filter(user => user.averageRating >= minRating);
    
    // Filter by availability
    if (availabilityFilter !== 'all') {
      const status = availabilityFilter === 'available' ? 'Available Now' : 'Busy';
      filtered = filtered.filter(user => user.availability === status);
    }
    
    // Sort results
    switch (sortBy) {
      case 'distance':
        filtered.sort((a, b) => a.distance - b.distance);
        break;
      case 'rating':
        filtered.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case 'experience':
        filtered.sort((a, b) => parseInt(b.experience) - parseInt(a.experience));
        break;
    }
    
    setFilteredLocations(filtered);
  };

  // Request and watch device location
  const setupDeviceLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to show your location on the map.');
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const locationObj = { 
        latitude: location.coords.latitude, 
        longitude: location.coords.longitude 
      };
      setCurrentLocation(locationObj);

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 10 },
        (newLocation) => {
          const newLocationObj = { 
            latitude: newLocation.coords.latitude, 
            longitude: newLocation.coords.longitude 
          };
          setCurrentLocation(newLocationObj);
        }
      );
      setWatchSubscription(subscription);
    } catch (error) {
      console.error('Location setup error:', error);
      Alert.alert('Error', 'Failed to access location services.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyRequest = (type) => {
    setEmergencyType(type);
    // In a real app, you would send this emergency request to your backend
    Alert.alert(
      'Emergency Request Sent',
      `We're notifying nearby ${type} professionals. Someone will contact you shortly.`,
      [{ text: 'OK', onPress: () => setShowEmergencyModal(false) }]
    );
  };

  const handleManualLocationInput = () => {
    Alert.alert(
      'Enter Location',
      'Please enter your location coordinates (latitude, longitude):',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'OK',
          onPress: (locationText) => {
            try {
              const location = parseLocation(locationText);
              if (location) {
                setCurrentLocation(location);
                mapRef.current.animateToRegion({
                  ...location,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05
                });
              } else {
                Alert.alert('Invalid Input', 'Please enter valid coordinates.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to parse location.');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  // Setup effect
  useEffect(() => {
    let mounted = true;
    const unsubscribeFirestore = fetchUserLocations();
    setupDeviceLocation();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start();

    return () => {
      mounted = false;
      if (watchSubscription) watchSubscription.remove();
      unsubscribeFirestore();
    };
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [searchText, searchRadius, selectedProfession, minRating, sortBy, availabilityFilter, currentLocation]);

  // Recalculate distances when current location changes
  useEffect(() => {
    if (!currentLocation) return;
    
    const updatedLocations = userLocations.map(user => ({
      ...user,
      distance: calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        user.latitude,
        user.longitude
      )
    }));
    
    setUserLocations(updatedLocations);
    applyFilters(updatedLocations);
  }, [currentLocation]);

  // Map animations
  const radius1 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1000, 3000] });
  const radius2 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 500] });
  const opacity1 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const opacity2 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] });

  // Animated components
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  // Get color for availability status
  const getAvailabilityColor = (status) => {
    switch(status) {
      case 'Available Now': return '#4CAF50';
      case 'Busy': return '#FFC107';
      case 'Offline': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  // Loading state
  if (isLoading || !currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, profession, or skills"
          value={searchText}
          onChangeText={setSearchText}
        />
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialIcons name="filter-list" size={24} color="#007BFF" />
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Radius Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Radius: {searchRadius} km</Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity onPress={() => setSearchRadius(Math.max(1, searchRadius - 1))}>
                  <MaterialIcons name="remove" size={18} color="#007BFF" />
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${(searchRadius / 50) * 100}%` }]} />
                </View>
                <TouchableOpacity onPress={() => setSearchRadius(Math.min(50, searchRadius + 1))}>
                  <MaterialIcons name="add" size={18} color="#007BFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Profession Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Profession</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {professions.map((profession) => (
                  <TouchableOpacity
                    key={profession}
                    style={[
                      styles.professionChip,
                      selectedProfession === profession && styles.selectedProfessionChip
                    ]}
                    onPress={() => setSelectedProfession(profession)}
                  >
                    <Text style={[
                      styles.professionChipText,
                      selectedProfession === profession && styles.selectedProfessionChipText
                    ]}>
                      {profession}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Rating Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Min Rating</Text>
              <View style={styles.ratingContainer}>
                {[0, 1, 2, 3, 4].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    onPress={() => setMinRating(rating)}
                  >
                    <FontAwesome
                      name={rating < minRating ? "star" : "star-o"}
                      size={20}
                      color="#FFC107"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort By Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.sortButtonsContainer}>
                <TouchableOpacity
                  style={[styles.sortButton, sortBy === 'distance' && styles.selectedSortButton]}
                  onPress={() => setSortBy('distance')}
                >
                  <Text style={[styles.sortButtonText, sortBy === 'distance' && styles.selectedSortButtonText]}>
                    Distance
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortButton, sortBy === 'rating' && styles.selectedSortButton]}
                  onPress={() => setSortBy('rating')}
                >
                  <Text style={[styles.sortButtonText, sortBy === 'rating' && styles.selectedSortButtonText]}>
                    Rating
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortButton, sortBy === 'experience' && styles.selectedSortButton]}
                  onPress={() => setSortBy('experience')}
                >
                  <Text style={[styles.sortButtonText, sortBy === 'experience' && styles.selectedSortButtonText]}>
                    Experience
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Availability Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Availability</Text>
              <View style={styles.availabilityContainer}>
                <TouchableOpacity
                  style={[styles.availabilityButton, availabilityFilter === 'all' && styles.selectedAvailabilityButton]}
                  onPress={() => setAvailabilityFilter('all')}
                >
                  <Text style={styles.availabilityButtonText}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.availabilityButton, availabilityFilter === 'available' && styles.selectedAvailabilityButton]}
                  onPress={() => setAvailabilityFilter('available')}
                >
                  <Text style={styles.availabilityButtonText}>Available</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.availabilityButton, availabilityFilter === 'busy' && styles.selectedAvailabilityButton]}
                  onPress={() => setAvailabilityFilter('busy')}
                >
                  <Text style={styles.availabilityButtonText}>Busy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          ...currentLocation,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        rotateEnabled
        accessibilityLabel="Interactive map showing your location and nearby workers"
      >
        {/* User's current location */}
        <Marker
          coordinate={currentLocation}
          title="My Location"
          description="You are here"
          pinColor="#007BFF"
        />
        
        {/* Animated circles around user location */}
        <AnimatedCircle
          center={currentLocation}
          radius={radius1}
          strokeWidth={2}
          strokeColor={`rgba(65, 105, 225, ${opacity1})`}
          fillColor={`rgba(65, 105, 225, ${opacity2})`}
        />
        <AnimatedCircle
          center={currentLocation}
          radius={radius2}
          strokeWidth={2}
          strokeColor={`rgba(65, 105, 225, ${opacity1})`}
          fillColor={`rgba(65, 105, 225, ${opacity2})`}
        />

        {/* Search radius circle */}
        <Circle
          center={currentLocation}
          radius={searchRadius * 1000} // Convert km to meters
          strokeWidth={1}
          strokeColor="rgba(0, 123, 255, 0.5)"
          fillColor="rgba(0, 123, 255, 0.1)"
        />
        
        {/* Other users */}
        {filteredLocations.map((user) => (
          <Marker
            key={user.id}
            coordinate={{ latitude: user.latitude, longitude: user.longitude }}
            title={user.name}
          >
            <View style={styles.markerContainer}>
              <Image
                source={user.profileImage ? { uri: user.profileImage } : DEFAULT_PROFILE_IMAGE}
                style={styles.profileMarker}
              />
              <View 
                style={[
                  styles.statusIndicator, 
                  { backgroundColor: getAvailabilityColor(user.availability) }
                ]}
              />
            </View>
            <Callout tooltip>
              <View style={styles.calloutContainer}>
                <Image
                  source={user.profileImage ? { uri: user.profileImage } : DEFAULT_PROFILE_IMAGE}
                  style={styles.calloutImage}
                />
                <Text style={styles.calloutName}>{user.name}</Text>
                <Text style={styles.calloutProfession}>{user.profession}</Text>
                <View style={styles.ratingRow}>
                  {Array(5).fill(0).map((_, i) => (
                    <FontAwesome
                      key={i}
                      name={i < Math.floor(user.averageRating) ? "star" : (i < user.averageRating ? "star-half-o" : "star-o")}
                      size={16}
                      color="#FFC107"
                      style={styles.starIcon}
                    />
                  ))}
                  <Text style={styles.ratingText}>({user.averageRating})</Text>
                </View>
                <View style={styles.calloutDetail}>
                  <MaterialIcons name="work" size={14} color="#666" />
                  <Text style={styles.calloutDetailText}>{user.experience} years exp.</Text>
                </View>
                <View style={styles.calloutDetail}>
                  <MaterialIcons name="location-on" size={14} color="#666" />
                  <Text style={styles.calloutDetailText}>{user.distance.toFixed(1)} km away</Text>
                </View>
                <View style={styles.calloutDetail}>
                  <MaterialIcons name="build" size={14} color="#666" />
                  <Text style={styles.calloutDetailText}>{user.skills}</Text>
                </View>
                <View style={[
                  styles.availabilityBadge, 
                  { backgroundColor: getAvailabilityColor(user.availability) }
                ]}>
                  <Text style={styles.availabilityText}>{user.availability}</Text>
                </View>
                <TouchableOpacity style={styles.contactButton}>
                  <Text style={styles.contactButtonText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Location Input Button */}
      <TouchableOpacity 
        style={styles.locationInputButton}
        onPress={handleManualLocationInput}
      >
        <MaterialIcons name="edit-location" size={24} color="white" />
      </TouchableOpacity>

      {/* Emergency Button */}
      <TouchableOpacity 
        style={styles.emergencyButton}
        onPress={() => setShowEmergencyModal(true)}
      >
        <MaterialIcons name="error" size={24} color="white" />
        <Text style={styles.emergencyButtonText}>Emergency</Text>
      </TouchableOpacity>

      {/* Results Count */}
      <View style={styles.resultCountContainer}>
        <Text style={styles.resultCountText}>
          Found {filteredLocations.length} professionals within {searchRadius} km
        </Text>
      </View>

      {/* Emergency Modal */}
      <Modal
        visible={showEmergencyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmergencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Emergency Services</Text>
            <Text style={styles.modalSubtitle}>What type of emergency?</Text>
            
            <TouchableOpacity 
              style={styles.emergencyOption}
              onPress={() => handleEmergencyRequest('Plumbing')}
            >
              <MaterialIcons name="plumbing" size={32} color="#007BFF" />
              <Text style={styles.emergencyOptionText}>Plumbing Emergency</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.emergencyOption}
              onPress={() => handleEmergencyRequest('Electrical')}
            >
              <MaterialIcons name="electrical-services" size={32} color="#007BFF" />
              <Text style={styles.emergencyOptionText}>Electrical Emergency</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.emergencyOption}
              onPress={() => handleEmergencyRequest('Construction')}
            >
              <MaterialIcons name="engineering" size={32} color="#007BFF" />
              <Text style={styles.emergencyOptionText}>Structural Emergency</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowEmergencyModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333333',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filtersContainer: {
    position: 'absolute',
    top: 70,
    left: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1,
    maxHeight: 200,
  },
  filterItem: {
    marginRight: 20,
    minWidth: 150,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 10,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#007BFF',
    borderRadius: 2,
  },
  professionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginRight: 8,
    marginTop: 5,
  },
  selectedProfessionChip: {
    backgroundColor: '#007BFF',
  },
  professionChipText: {
    fontSize: 14,
    color: '#333333',
  },
  selectedProfessionChipText: {
    color: '#FFFFFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  sortButtonsContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginRight: 8,
  },
  selectedSortButton: {
    backgroundColor: '#007BFF',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#333333',
  },
  selectedSortButtonText: {
    color: '#FFFFFF',
  },
  availabilityContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  availabilityButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginRight: 8,
  },
  selectedAvailabilityButton: {
    backgroundColor: '#007BFF',
  },
  availabilityButtonText: {
    fontSize: 12,
    color: '#333333',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  calloutContainer: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  calloutImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  calloutName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  calloutProfession: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starIcon: {
    marginHorizontal: 1,
  },
  ratingText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  calloutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  calloutDetailText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 6,
    flex: 1,
  },
  availabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 8,
  },
  availabilityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  contactButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  locationInputButton: {
    position: 'absolute',
    right: 10,
    bottom: 120,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007BFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  emergencyButton: {
    position: 'absolute',
    left: 10,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF3B30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  emergencyButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultCountContainer: {
    position: 'absolute',
    bottom: 80,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  resultCountText: {
    fontSize: 14,
    color: '#333333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  emergencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    width: '100%',
  },
  emergencyOptionText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 15,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 10,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333333',
  }
});

export default HomeScreen;