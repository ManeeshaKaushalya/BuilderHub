import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from '../../../firebase/firebaseConfig';
import styles from '../../styles/EditProfileStyles'; 

const EditProfile = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { userId, location } = route.params || {};

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        description: '',
        companyDescription: '',
        profession: '',
        website: '',
        location: '',
        skills: '',
        yearsOfExperience: '',
        accountType: 'Person',
        profileImage: null
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (!userId) {
                    Alert.alert('Error', 'No user ID provided');
                    navigation.goBack();
                    return;
                }

                console.log('Fetching profile for userId:', userId);
                const userDocRef = doc(firestore, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const accountType = userData.accountType || 'Person';
                    setFormData({
                        name: userData.name || '',
                        bio: accountType === 'Person' ? userData.bio || '' : '',
                        description: accountType === 'Shop' ? userData.description || '' : '',
                        companyDescription: accountType === 'Company' ? userData.companyDescription || '' : '',
                        profession: accountType === 'Person' ? userData.profession || '' : '',
                        website: accountType === 'Person' ? userData.website || '' : '',
                        location: location || userData.location || '',
                        skills: accountType === 'Person' && userData.skills ? userData.skills.toString() : '',
                        yearsOfExperience: accountType === 'Person' && userData.experience ? userData.experience.toString() : '',
                        accountType: accountType,
                        profileImage: userData.profileImage || null
                    });
                } else {
                    Alert.alert('Error', 'User profile not found');
                    navigation.goBack();
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                Alert.alert('Error', 'Failed to load profile. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userId, location, navigation]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImagePick = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Error', 'Permission to access gallery is required!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setFormData(prev => ({ ...prev, profileImage: result.assets[0].uri }));
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const handleSelectLocation = () => {
        navigation.navigate('MapScreen', {
            registrationType: 'user',
            onLocationSelected: (locationString) => {
                navigation.setParams({ location: locationString });
            }
        });
    };

    const handleSave = async () => {
        if (saving) return;

        setSaving(true);
        try {
            const userRef = doc(firestore, 'users', userId);
            let profileImageUrl = formData.profileImage;

            if (formData.profileImage && formData.profileImage.startsWith('file://')) {
                const imageRef = ref(storage, `profileImages/${userId}`);
                const response = await fetch(formData.profileImage);
                const blob = await response.blob();
                await uploadBytes(imageRef, blob);
                profileImageUrl = await getDownloadURL(imageRef);
            }

            const updatedData = {
                name: formData.name.trim(),
                location: formData.location.trim(),
                profileImage: profileImageUrl,
                ...(formData.accountType === 'Shop' && { updatedAt: new Date().toISOString() })
            };

            if (formData.accountType === 'Person') {
                updatedData.bio = formData.bio.trim();
                updatedData.profession = formData.profession.trim();
                updatedData.website = formData.website.trim();
                updatedData.skills = formData.skills ? formData.skills.split(',').map(skill => skill.trim()).filter(skill => skill) : [];
                updatedData.yearsOfExperience = formData.yearsOfExperience ? parseInt(formData.yearsOfExperience, 10) : 0;
                updatedData.accountType = formData.accountType;
            } else if (formData.accountType === 'Shop') {
                updatedData.description = formData.description.trim();
            } else if (formData.accountType === 'Company') {
                updatedData.companyDescription = formData.companyDescription.trim();
            }

            if (!updatedData.name) {
                Alert.alert('Error', 'Name is required');
                setSaving(false);
                return;
            }

            if (updatedData.yearsOfExperience && (isNaN(updatedData.yearsOfExperience) || updatedData.yearsOfExperience < 0)) {
                Alert.alert('Error', 'Years of experience must be a valid number');
                setSaving(false);
                return;
            }

            if (updatedData.location) {
                const [lat, lng] = updatedData.location.split(',').map(coord => parseFloat(coord.trim()));
                if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    Alert.alert('Error', 'Invalid location format. Use latitude,longitude (e.g., 40.7128,-74.0060)');
                    setSaving(false);
                    return;
                }
            }

            await updateDoc(userRef, updatedData);
            setSaving(false);
            Alert.alert('Success', 'Profile updated successfully');
            navigation.navigate('UploaderProfile', { userId });
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0095f6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: formData.profileImage || '../../assets/default-user.png' }}
                        style={styles.profileImage}
                        resizeMode="cover"
                    />
                    <TouchableOpacity
                        style={styles.changeImageButton}
                        onPress={handleImagePick}
                    >
                        <Ionicons name="camera" size={20} color="#fff" />
                        <Text style={styles.changeImageText}>Change Photo</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.name}
                        onChangeText={value => handleInputChange('name', value)}
                        placeholder="Enter your name"
                        autoCapitalize="words"
                    />
                </View>

                {formData.accountType === 'Person' && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            value={formData.bio}
                            onChangeText={value => handleInputChange('bio', value)}
                            placeholder="Tell us about yourself"
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                )}

                {formData.accountType === 'Shop' && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            value={formData.description}
                            onChangeText={value => handleInputChange('description', value)}
                            placeholder="Describe your shop"
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                )}

                {formData.accountType === 'Company' && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Company Description</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            value={formData.companyDescription}
                            onChangeText={value => handleInputChange('companyDescription', value)}
                            placeholder="Describe your company"
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                )}

                {formData.accountType === 'Person' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Profession</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.profession}
                                onChangeText={value => handleInputChange('profession', value)}
                                placeholder="Enter your profession"
                                autoCapitalize="words"
                            />
                        </View>

                    </>
                )}

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Location</Text>
                    <View style={styles.locationContainer}>
                        <TextInput
                            style={[styles.input, styles.locationInput]}
                            value={formData.location}
                            onChangeText={value => handleInputChange('location', value)}
                            placeholder="e.g., 40.7128,-74.0060"
                            editable={true}
                        />
                        <TouchableOpacity
                            style={styles.mapButton}
                            onPress={handleSelectLocation}
                        >
                            <Ionicons name="map-outline" size={20} color="#fff" />
                            <Text style={styles.mapButtonText}>Select on Map</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {formData.accountType === 'Person' && (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Skills (comma-separated)</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.skills}
                                onChangeText={value => handleInputChange('skills', value)}
                                placeholder="e.g., JavaScript, Python, Design"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Years of Experience</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.yearsOfExperience}
                                onChangeText={value => handleInputChange('yearsOfExperience', value)}
                                placeholder="Enter years of experience"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Account Type</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={formData.accountType}
                                    onValueChange={value => handleInputChange('accountType', value)}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Person" value="Person" />
                                    <Picker.Item label="Shop" value="Shop" />
                                </Picker>
                            </View>
                        </View>
                    </>
                )}

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Text style={styles.buttonText}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancel}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default EditProfile;