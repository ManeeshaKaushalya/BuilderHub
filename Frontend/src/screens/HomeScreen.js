import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Animated, Image, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Constants
const GOOGLE_API_KEY = 'AIzaSyBDEAmbHkQokLum169Nr4aY_FpIf80TuCE';
const DEFAULT_PROFILE_IMAGE = require('../../assets/default-profile.png');

// Component
const HomeScreen = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
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
  const [selectedAccountType, setSelectedAccountType] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('distance');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [expandedSection, setExpandedSection] = useState(null); // For accordion

  const professions = ['All', 'Constructor', 'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Mason'];
  const accountTypes = ['All', 'Person', 'Company', 'Shop'];

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
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getRandomAvailability = () => {
    const statuses = ['Available Now', 'Busy', 'Offline'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  const fetchUserLocations = () => {
    return onSnapshot(collection(firestore, 'users'), (snapshot) => {
      const locations = snapshot.docs
        .map(doc => {
          const data = doc.data();
          const locationObj = data.location ? parseLocation(data.location) : null;
          
          if (!locationObj) return null;
          
          let distance = null;
          if (currentLocation) {
            distance = calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              locationObj.latitude,
              locationObj.longitude
            );
          }
          
          const availability = getRandomAvailability();
          
          return {
            id: doc.id,
            ...locationObj,
            name: data.name || 'Anonymous',
            profession: data.profession || 'Unknown',
            accountType: data.accountType || 'Person',
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

  const applyFilters = (locations = userLocations) => {
    if (!currentLocation) return;
    
    let filtered = [...locations];
    
    if (searchText) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        user.profession.toLowerCase().includes(searchText.toLowerCase()) ||
        user.skills.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    filtered = filtered.filter(user => 
      user.distance !== null && user.distance <= searchRadius
    );
    
    if (selectedProfession !== 'All') {
      filtered = filtered.filter(user => 
        user.profession === selectedProfession
      );
    }
    
    if (selectedAccountType !== 'All') {
      filtered = filtered.filter(user => 
        user.accountType === selectedAccountType
      );
    }
    
    filtered = filtered.filter(user => user.averageRating >= minRating);
    
    if (availabilityFilter !== 'all') {
      const status = availabilityFilter === 'available' ? 'Available Now' : 'Busy';
      filtered = filtered.filter(user => user.availability === status);
    }
    
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

  const handleMarkerPress = (user) => {
    console.log('Clicked user ID:', user.id);
    Alert.alert(
      'Visit Profile',
      `Would you want to visit ${user.name}'s profile?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => navigation.navigate('UploaderProfile', { userId: user.id })
        }
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    let mounted = true;
    const unsubscribeFirestore = fetchUserLocations();
    setupDeviceLocation();

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

  useEffect(() => {
    applyFilters();
  }, [searchText, searchRadius, selectedProfession, selectedAccountType, minRating, sortBy, availabilityFilter, currentLocation]);

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

  const radius1 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1000, 3000] });
  const radius2 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 500] });
  const opacity1 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const opacity2 = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  const getAvailabilityColor = (status) => {
    switch(status) {
      case 'Available Now': return '#4CAF50';
      case 'Busy': return '#FFC107';
      case 'Offline': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getAccountTypeIcon = (type) => {
    switch(type) {
      case 'Person': return 'person';
      case 'Company': return 'business';
      case 'Shop': return 'storefront';
      default: return 'account-circle';
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

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

      {showFilters && (
        <ScrollView style={styles.filtersContainer}>
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

          {/* Profession Accordion */}
          <TouchableOpacity onPress={() => toggleSection('profession')} style={styles.accordionHeader}>
            <Text style={styles.accordionTitle}>Profession</Text>
            <MaterialIcons name={expandedSection === 'profession' ? 'expand-less' : 'expand-more'} size={24} color="#007BFF" />
          </TouchableOpacity>
          {expandedSection === 'profession' && (
            <View style={styles.accordionContent}>
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
          )}

          {/* Account Type Accordion */}
          <TouchableOpacity onPress={() => toggleSection('accountType')} style={styles.accordionHeader}>
            <Text style={styles.accordionTitle}>Account Type</Text>
            <MaterialIcons name={expandedSection === 'accountType' ? 'expand-less' : 'expand-more'} size={24} color="#007BFF" />
          </TouchableOpacity>
          {expandedSection === 'accountType' && (
            <View style={styles.accordionContent}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {accountTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.accountTypeChip,
                      selectedAccountType === type && styles.selectedAccountTypeChip
                    ]}
                    onPress={() => setSelectedAccountType(type)}
                  >
                    <MaterialIcons 
                      name={getAccountTypeIcon(type)} 
                      size={16} 
                      color={selectedAccountType === type ? "#fff" : "#007BFF"} 
                      style={styles.accountTypeIcon}
                    />
                    <Text style={[
                      styles.accountTypeChipText,
                      selectedAccountType === type && styles.selectedAccountTypeChipText
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Minimum Rating Accordion */}
          <TouchableOpacity onPress={() => toggleSection('rating')} style={styles.accordionHeader}>
            <Text style={styles.accordionTitle}>Minimum Rating</Text>
            <MaterialIcons name={expandedSection === 'rating' ? 'expand-less' : 'expand-more'} size={24} color="#007BFF" />
          </TouchableOpacity>
          {expandedSection === 'rating' && (
            <View style={styles.accordionContent}>
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
          )}

          {/* Sort By */}
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

          {/* Availability */}
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
      )}

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
      >
        <Marker
          coordinate={currentLocation}
          title="My Location"
          description="You are here"
          pinColor="#007BFF"
        />
        
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

        <Circle
          center={currentLocation}
          radius={searchRadius * 1000}
          strokeWidth={1}
          strokeColor="rgba(0, 123, 255, 0.5)"
          fillColor="rgba(0, 123, 255, 0.1)"
        />
        
        {filteredLocations.map((user) => (
          <Marker
            key={user.id}
            coordinate={{ latitude: user.latitude, longitude: user.longitude }}
            title={user.name}
            onPress={() => handleMarkerPress(user)}
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
                <View style={styles.accountTypeRow}>
                  <MaterialIcons name={getAccountTypeIcon(user.accountType)} size={14} color="#666" />
                  <Text style={styles.accountTypeText}>{user.accountType}</Text>
                </View>
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

      <TouchableOpacity 
        style={styles.locationInputButton}
        onPress={handleManualLocationInput}
      >
        <MaterialIcons name="edit-location" size={24} color="white" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.emergencyButton}
        onPress={() => setShowEmergencyModal(true)}
      >
        <MaterialIcons name="error" size={24} color="white" />
        <Text style={styles.emergencyButtonText}>Emergency</Text>
      </TouchableOpacity>

      <View style={styles.resultCountContainer}>
        <Text style={styles.resultCountText}>
          Found {filteredLocations.length} professionals within {searchRadius} km
        </Text>
      </View>

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
    backgroundColor: '#F5F6FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#374151',
  },
  filterButton: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 300, // Limit height to avoid overwhelming the screen
  },
  filterItem: {
    marginHorizontal: 10,
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2A44',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderTrack: {
    height: 6,
    width: 120,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginHorizontal: 10,
  },
  sliderFill: {
    height: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 5,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2A44',
  },
  accordionContent: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 15,
  },
  professionChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedProfessionChip: {
    backgroundColor: '#3B82F6',
  },
  professionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedProfessionChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  accountTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedAccountTypeChip: {
    backgroundColor: '#3B82F6',
  },
  accountTypeIcon: {
    marginRight: 6,
  },
  accountTypeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedAccountTypeChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sortButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedSortButton: {
    backgroundColor: '#3B82F6',
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedSortButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  availabilityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  availabilityButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedAvailabilityButton: {
    backgroundColor: '#3B82F6',
  },
  availabilityButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
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
    backgroundColor: '#F3F4F6',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  calloutContainer: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  calloutImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  calloutName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2A44',
    marginBottom: 4,
  },
  calloutProfession: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 6,
  },
  accountTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  accountTypeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starIcon: {
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  calloutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  calloutDetailText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  availabilityBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  availabilityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    elevation: 2,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  locationInputButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#3B82F6',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  emergencyButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  resultCountContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  resultCountText: {
    backgroundColor: 'rgba(31, 41, 68, 0.8)',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2A44',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  emergencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  emergencyOptionText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 16,
    color: '#1F2A44',
  },
  closeButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  closeButtonText: {
    color: '#1F2A44',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default HomeScreen;