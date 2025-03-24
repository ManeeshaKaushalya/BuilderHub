// src/screens/JobRequestForm.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../../firebase/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

function JobRequestForm() {
  const navigation = useNavigation();
  const route = useRoute();
  const { professionalId, professionalName } = route.params;
  const { isDarkMode } = useTheme();
  const auth = getAuth();
  const user = auth.currentUser;

  // Form state
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobCategory, setJobCategory] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [urgency, setUrgency] = useState('Flexible');
  const [jobLocation, setJobLocation] = useState('');
  const [landmark, setLandmark] = useState('');
  const [contactMethod, setContactMethod] = useState('In-App Chat');
  const [budgetEstimate, setBudgetEstimate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Online Payment');
  const [materialsNeeded, setMaterialsNeeded] = useState('Client Provides');
  const [workDuration, setWorkDuration] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const categories = ['Plumbing', 'Electrical', 'Masonry', 'Painting', 'Carpentry', 'Other'];

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit a job request.');
      return;
    }
    if (!jobTitle || !jobDescription || !jobCategory || !agreeTerms) {
      Alert.alert('Error', 'Please fill all required fields and agree to terms.');
      return;
    }

    setLoading(true);
    try {
      const jobRequest = {
        clientId: user.uid,
        professionalId,
        professionalName,
        jobTitle,
        jobDescription,
        jobCategory,
        preferredDate,
        urgency,
        jobLocation,
        landmark,
        contactMethod,
        budgetEstimate,
        paymentMethod,
        materialsNeeded,
        workDuration,
        specialInstructions,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(firestore, 'jobRequests'), jobRequest);
      Alert.alert('Success', 'Job request submitted successfully!');
      
      // Navigate to chat or confirmation screen
      navigation.navigate('ChatScreen', { professionalId, jobTitle });
    } catch (error) {
      console.error('Error submitting job request:', error);
      Alert.alert('Error', 'Failed to submit job request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.header, isDarkMode ? styles.darkText : styles.lightText]}>
        Job Request for {professionalName}
      </Text>

      {/* 1. Basic Job Details */}
      <Text style={styles.sectionTitle}>Basic Job Details</Text>
      <TextInput
        style={styles.input}
        placeholder="Job Title (e.g., Fix a leaking pipe)"
        value={jobTitle}
        onChangeText={setJobTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Detailed Job Description"
        value={jobDescription}
        onChangeText={setJobDescription}
        multiline
      />
      <Picker
        selectedValue={jobCategory}
        onValueChange={(itemValue) => setJobCategory(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Select Job Category" value="" />
        {categories.map((cat) => (
          <Picker.Item key={cat} label={cat} value={cat} />
        ))}
      </Picker>
      {/* TODO: Add photo/file upload component here */}

      {/* 2. Scheduling & Availability */}
      <Text style={styles.sectionTitle}>Scheduling & Availability</Text>
      <TextInput
        style={styles.input}
        placeholder="Preferred Date & Time (e.g., 2025-03-25 10:00 AM)"
        value={preferredDate}
        onChangeText={setPreferredDate}
      />
      <Picker
        selectedValue={urgency}
        onValueChange={(itemValue) => setUrgency(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Flexible" value="Flexible" />
        <Picker.Item label="Urgent (within 24 hours)" value="Urgent" />
        <Picker.Item label="Emergency (immediate)" value="Emergency" />
      </Picker>

      {/* 3. Location & Contact Details */}
      <Text style={styles.sectionTitle}>Location & Contact Details</Text>
      <TextInput
        style={styles.input}
        placeholder="Job Location (Address)"
        value={jobLocation}
        onChangeText={setJobLocation}
      />
      <TextInput
        style={styles.input}
        placeholder="Landmark / Additional Details"
        value={landmark}
        onChangeText={setLandmark}
      />
      <Picker
        selectedValue={contactMethod}
        onValueChange={(itemValue) => setContactMethod(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Phone Call" value="Phone Call" />
        <Picker.Item label="In-App Chat" value="In-App Chat" />
        <Picker.Item label="Video Call" value="Video Call" />
      </Picker>

      {/* 4. Pricing & Payment */}
      <Text style={styles.sectionTitle}>Pricing & Payment</Text>
      <TextInput
        style={styles.input}
        placeholder="Budget Estimate (Optional)"
        value={budgetEstimate}
        onChangeText={setBudgetEstimate}
        keyboardType="numeric"
      />
      <Picker
        selectedValue={paymentMethod}
        onValueChange={(itemValue) => setPaymentMethod(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Online Payment" value="Online Payment" />
        <Picker.Item label="Cash on Delivery" value="Cash on Delivery" />
        <Picker.Item label="Partial Payment" value="Partial Payment" />
      </Picker>

      {/* 5. Additional Preferences */}
      <Text style={styles.sectionTitle}>Additional Preferences</Text>
      <Picker
        selectedValue={materialsNeeded}
        onValueChange={(itemValue) => setMaterialsNeeded(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Client Provides" value="Client Provides" />
        <Picker.Item label="Worker Provides" value="Worker Provides" />
      </Picker>
      <TextInput
        style={styles.input}
        placeholder="Expected Work Duration (e.g., 2 hours)"
        value={workDuration}
        onChangeText={setWorkDuration}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Special Instructions"
        value={specialInstructions}
        onChangeText={setSpecialInstructions}
        multiline
      />

      {/* 6. Job Confirmation & Agreement */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setAgreeTerms(!agreeTerms)}
      >
        <Ionicons
          name={agreeTerms ? 'checkbox' : 'checkbox-outline'}
          size={24}
          color={isDarkMode ? '#fff' : '#000'}
        />
        <Text style={[styles.checkboxText, isDarkMode ? styles.darkText : styles.lightText]}>
          I Agree to the Terms & Conditions
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Submitting...' : 'Submit Job Request'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  darkContainer: { backgroundColor: '#1e1e1e' },
  lightContainer: { backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 15, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  picker: { height: 50, marginBottom: 15 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkboxText: { fontSize: 16, marginLeft: 10 },
  submitButton: {
    backgroundColor: '#e41e3f',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: { backgroundColor: '#999' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  darkText: { color: '#fff' },
  lightText: { color: '#000' },
});

export default JobRequestForm;