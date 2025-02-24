import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { Button } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from "../../../firebase/firebaseConfig";
import { useUser } from "../../context/UserContext";

const categories = ["Paints", "Machines", "Tools", "Furniture"];
const companies = ["Sakithma", "Gayara", "Jesi"];
const colors = ["Red", "Blue", "Green", "Black"];

const AddItem = ({ navigation }) => {
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    company: "",
    color: "",
    description: "",
    price: "",
    Stock: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = "Item name is required";
    }

    if (!formData.category.trim()) {
      newErrors.category = "Category is required";
    } else if (!categories.includes(formData.category)) {
      newErrors.category = "Please select a valid category";
    }

    if (!formData.company.trim()) {
      newErrors.company = "Company is required";
    } else if (!companies.includes(formData.company)) {
      newErrors.company = "Please select a valid company";
    }

    if (!formData.color.trim()) {
      newErrors.color = "Color is required";
    } else if (!colors.includes(formData.color)) {
      newErrors.color = "Please select a valid color";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.price.trim()) {
      newErrors.price = "Price is required";
    } else if (isNaN(formData.price) || Number(formData.price) <= 0) {
      newErrors.price = "Please enter a valid price";
    }

    if (!formData.Stock.trim()) {
      newErrors.Stock = "Stock is required";
    } else if (isNaN(formData.Stock) || Number(formData.Stock) < 0) {
      newErrors.Stock = "Please enter a valid stock quantity";
    }

    if (images.length === 0) {
      newErrors.images = "At least one image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to add images.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset) => asset.uri);
        if (images.length + newImages.length > 5) {
          Alert.alert('Maximum 5 images allowed');
          return;
        }
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (uri) => {
    setImages(images.filter((imageUri) => imageUri !== uri));
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
  
      if (!blob) {
        throw new Error("Failed to create blob from image URI");
      }
  
      const filename = `items/${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const storageRef = ref(storage, filename);
  
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
  
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };
  
  

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Upload all images to Firebase Storage
      const imageUrls = await Promise.all(images.map(uploadImage));

      const newItem = {
        itemOwnerId: user.uid,
        ...formData,
        price: parseFloat(formData.price),
        Stock: parseInt(formData.Stock),
        images: imageUrls,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(firestore, "items"), newItem);
      
      Alert.alert(
        "Success",
        "Item added successfully",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error adding item:", error);
      Alert.alert(
        "Error",
        "Failed to add item. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const renderDropdown = (field, options, placeholder) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{placeholder}</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.optionsContainer}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.option,
              formData[field] === option && styles.selectedOption
            ]}
            onPress={() => updateFormData(field, option)}
          >
            <Text style={[
              styles.optionText,
              formData[field] === option && styles.selectedOptionText
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Item</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <View style={styles.imageSection}>
          <Text style={styles.label}>Item Images</Text>
          <View style={styles.imageContainer}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(uri)}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity 
                style={styles.addImageButton} 
                onPress={pickImages}
              >
                <FontAwesome name="plus" size={24} color="#666" />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            )}
          </View>
          {errors.images && (
            <Text style={styles.errorText}>{errors.images}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput
            placeholder="Enter item name"
            value={formData.itemName}
            onChangeText={(text) => updateFormData('itemName', text)}
            style={[styles.input, errors.itemName && styles.inputError]}
          />
          {errors.itemName && (
            <Text style={styles.errorText}>{errors.itemName}</Text>
          )}
        </View>

        {renderDropdown('category', categories, 'Category')}
        {renderDropdown('company', companies, 'Company')}
        {renderDropdown('color', colors, 'Color')}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            placeholder="Enter item description"
            value={formData.description}
            onChangeText={(text) => updateFormData('description', text)}
            style={[styles.textArea, errors.description && styles.inputError]}
            multiline
            numberOfLines={4}
          />
          {errors.description && (
            <Text style={styles.errorText}>{errors.description}</Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Price (Rs.)</Text>
            <TextInput
              placeholder="0.00"
              value={formData.price}
              onChangeText={(text) => updateFormData('price', text)}
              keyboardType="numeric"
              style={[styles.input, errors.price && styles.inputError]}
            />
            {errors.price && (
              <Text style={styles.errorText}>{errors.price}</Text>
            )}
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Stock</Text>
            <TextInput
              placeholder="0"
              value={formData.Stock}
              onChangeText={(text) => updateFormData('Stock', text)}
              keyboardType="numeric"
              style={[styles.input, errors.Stock && styles.inputError]}
            />
            {errors.Stock && (
              <Text style={styles.errorText}>{errors.Stock}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            "Add Item"
          )}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 24,
  },
  content: {
    padding: 16,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  selectedOption: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    color: '#333',
  },
  selectedOptionText: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  bottomContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  submitButton: {
    backgroundColor: '#28a745',
    height: 50,
    justifyContent: 'center',
  },
});

export default AddItem;