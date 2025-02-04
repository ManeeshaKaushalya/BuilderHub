import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../../hooks/ThemeContext';
import LocationScreen from '../LocationScreen';

const CompanyRegister = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [companyName, setCompanyName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [errors, setErrors] = useState({
    companyName: '',
    businessEmail: '',
    businessLicense: ''
  });

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      companyName: '',
      businessEmail: '',
      businessLicense: ''
    };

    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required';
      isValid = false;
    }

    if (!businessEmail.trim()) {
      newErrors.businessEmail = 'Business email is required';
      isValid = false;
    } else if (!validateEmail(businessEmail)) {
      newErrors.businessEmail = 'Please enter a valid email address';
      isValid = false;
    }

    if (!businessLicense.trim()) {
      newErrors.businessLicense = 'Business license number is required';
      isValid = false;
    } else if (businessLicense.length < 5) {
      newErrors.businessLicense = 'License number must be at least 5 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleCompanyRegister = () => {
    if (validateForm()) {
      try {
        // Here you would typically make an API call to register the company
        console.log('Company Registered:', { 
          companyName, 
          businessEmail, 
          businessLicense 
        });
        
        Alert.alert(
          'Success',
          'Company registered successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } catch (error) {
        Alert.alert(
          'Error',
          'Failed to register company. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      ...styles.container,
      backgroundColor: isDarkMode ? '#1a1a1a' : '#fff'
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: isDarkMode ? '#fff' : '#000'
    },
    input: {
      ...styles.input,
      backgroundColor: isDarkMode ? '#333' : '#f9f9f9',
      borderColor: isDarkMode ? '#444' : '#ccc',
      color: isDarkMode ? '#fff' : '#000'
    },
    inputContainer: {
      width: '100%',
      marginBottom: 15
    },
    errorText: {
      color: '#ff4444',
      fontSize: 12,
      marginTop: 2,
      marginLeft: 2
    }
  });

  const renderInput = (placeholder, value, setValue, errorKey, iconName, keyboardType = 'default', autoCapitalize = 'sentences') => (
    <View style={dynamicStyles.inputContainer}>
      <View style={styles.inputWrapper}>
        <Icon 
          name={iconName} 
          size={20} 
          style={[styles.icon, { color: isDarkMode ? '#ddd' : '#666' }]} 
        />
        <TextInput
          style={dynamicStyles.input}
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={value}
          onChangeText={(text) => {
            setValue(text);
            if (errors[errorKey]) {
              setErrors(prev => ({ ...prev, [errorKey]: '' }));
            }
          }}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
      {errors[errorKey] ? <Text style={dynamicStyles.errorText}>{errors[errorKey]}</Text> : null}
    </View>
  );

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.sectionTitle}>Company Registration</Text>

      {renderInput('Company Name', companyName, setCompanyName, 'companyName', 'building')}
      {renderInput(
        'Business Email', 
        businessEmail, 
        setBusinessEmail, 
        'businessEmail', 
        'envelope', 
        'email-address', 
        'none'
      )}
      {renderInput(
        'Business License Number', 
        businessLicense, 
        setBusinessLicense, 
        'businessLicense', 
        'id-card'
      )}

      <LocationScreen />

      <TouchableOpacity 
        style={[
          styles.button,
          { opacity: !companyName || !businessEmail || !businessLicense ? 0.7 : 1 }
        ]} 
        onPress={handleCompanyRegister}
        disabled={!companyName || !businessEmail || !businessLicense}
      >
        <Text style={styles.buttonText}>Register Company</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    overflow: 'hidden'
  },
  icon: {
    padding: 10,
    width: 40,
    textAlign: 'center'
  },
  input: {
    flex: 1,
    padding: 12,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default CompanyRegister;