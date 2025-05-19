import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Alert, Animated, Image, TextInput, TouchableOpacity, ScrollView, Modal, Linking } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import styles from '../styles/HomeScreenStyles';

// Constants
const GOOGLE_API_KEY = 'AIzaSyBDEAmbHkQokLum169Nr4aY_FpIf80TuCE';
const DEFAULT_PROFILE_IMAGE = require('../../assets/default-profile.png');

const HomeScreen = () => {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userLocations, setUserLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [watchSubscription, setWatchSubscription] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(0));
  const [searchText, setSearchText] = useState('');
  const [searchRadius, setSearchRadius] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showEmergencyResultsModal, setShowEmergencyResultsModal] = useState(false);
  const [emergencyProfessionals, setEmergencyProfessionals] = useState([]);
  const [emergencyType, setEmergencyType] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);

  const professions = ['All', 'Constructor', 'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Mason'];

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

  const fetchUserLocations = () => {
    return onSnapshot(collection(firestore, 'users'), (snapshot) => {
      const locations = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          return doc.id !== user?.uid &&  data.accountType !== 'Client';
        })
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
          
          return {
            id: doc.id,
            ...locationObj,
            name: data.clientName || data.name || 'Anonymous',
            profession: data.profession || 'Unknown',
            profileImage: data.profileImage || null,
            averageRating: data.averageRating || 0,
            experience: data.experience || '0',
            skills: data.skills || '',
            distance: distance,
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
      filtered = filtered.filter(user => {
        const skillsString = Array.isArray(user.skills)
          ? user.skills.join(' ').toLowerCase()
          : typeof user.skills === 'string'
          ? user.skills.toLowerCase()
          : '';
        
        return (
          user.name.toLowerCase().includes(searchText.toLowerCase()) ||
          user.profession.toLowerCase().includes(searchText.toLowerCase()) ||
          skillsString.includes(searchText.toLowerCase())
        );
      });
    }
    
    filtered = filtered.filter(user => 
      user.distance !== null && user.distance <= searchRadius
    );
    
    if (selectedProfession !== 'All') {
      filtered = filtered.filter(user => 
        user.profession === selectedProfession
      );
    }
    
    filtered = filtered.filter(user => user.averageRating >= minRating);
    
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
    let profession;
    switch (type) {
      case 'Plumbing':
        profession = 'Plumber';
        break;
      case 'Electrical':
        profession = 'Electrician';
        break;
      case 'Construction':
        profession = 'Constructor';
        break;
      default:
        profession = 'All';
    }

    const filteredProfessionals = userLocations
      .filter(user => user.profession === profession)
      .slice(0, 5);

    if (filteredProfessionals.length === 0) {
      Alert.alert(
        'No Professionals Found',
        `No ${profession}s found nearby. Try increasing the search radius or checking other professions.`,
        [{ text: 'OK', onPress: () => setShowEmergencyModal(false) }]
      );
      return;
    }

    setEmergencyProfessionals(filteredProfessionals);
    setShowEmergencyModal(false);
    setShowEmergencyResultsModal(true);
  };

  const handleMarkerPress = (user) => {
    console.log('Clicked user ID:', user.id);
    Alert.alert(
      `${user.name}'s Options`,
      `Choose an action for ${user.name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Profile',
          onPress: () => navigation.navigate('UploaderProfile', { userId: user.id })
        },
        {
          text: 'Get Directions',
          onPress: () => {
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1` +
              `&origin=${currentLocation.latitude},${currentLocation.longitude}` +
              `&destination=${user.latitude},${user.longitude}` +
              `&travelmode=driving`;
            
            Linking.openURL(googleMapsUrl).catch(err => {
              console.error('Error opening Google Maps:', err);
              Alert.alert('Error', 'Unable to open Google Maps');
            });
          }
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
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [searchText, searchRadius, selectedProfession, minRating, currentLocation]);

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
                    onPress={() => setMinRating(rating + 1 === minRating ? 0 : rating + 1)}
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
                <TouchableOpacity style={styles.contactButton}>
                  <Text style={styles.contactButtonText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

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

      {/* Emergency Selection Modal */}
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

      {/* Emergency Results Modal */}
      <Modal
        visible={showEmergencyResultsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmergencyResultsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%' }]}>
            <Text style={styles.modalTitle}>
              Nearest {emergencyType} Professionals
            </Text>
            <Text style={styles.modalSubtitle}>
              Found {emergencyProfessionals.length} nearby professionals
            </Text>

            <ScrollView style={styles.resultsContainer}>
              {emergencyProfessionals.map((professional) => (
                <View key={professional.id} style={styles.professionalItem}>
                  <Image
                    source={professional.profileImage ? { uri: professional.profileImage } : DEFAULT_PROFILE_IMAGE}
                    style={styles.professionalImage}
                  />
                  <View style={styles.professionalDetails}>
                    <Text style={styles.professionalName}>{professional.name}</Text>
                    <Text style={styles.professionalInfo}>
                      {professional.distance.toFixed(1)} km away
                    </Text>
                    <View style={styles.ratingRow}>
                      {Array(5).fill(0).map((_, i) => (
                        <FontAwesome
                          key={i}
                          name={i < Math.floor(professional.averageRating) ? "star" : (i < professional.averageRating ? "star-half-o" : "star-o")}
                          size={14}
                          color="#FFC107"
                          style={styles.starIcon}
                        />
                      ))}
                      <Text style={styles.ratingText}>({professional.averageRating})</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => {
                      setShowEmergencyResultsModal(false);
                      navigation.navigate('UploaderProfile', { userId: professional.id });
                    }}
                  >
                    <Text style={styles.contactButtonText}>Contact</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEmergencyResultsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HomeScreen;