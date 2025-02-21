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
} from "react-native";
import { Button } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons"; // Import Ionicons for trash icon
import { collection, addDoc } from "firebase/firestore"; // Firestore functions for adding data
import { firestore } from "../../../firebase/firebaseConfig";
import { useUser } from "../../context/UserContext";

const categories = ["Paints", "Machines", "Tools", "Furniture"];
const companies = ["Sakithma", "Gayara", "Jesi"];
const colors = ["Red", "Blue", "Green", "Black"];

const AddItem = ({ navigation }) => {
  const [images, setImages] = useState([]);
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [company, setCompany] = useState("");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false); // State for loading indicator

  const { user } = useUser();
  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) {
      setImages([...images, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const removeImage = (uri) => {
    setImages(images.filter((imageUri) => imageUri !== uri));
  };

  // Function to handle form submission and store data in Firestore
  const handleSubmit = async () => {
    setLoading(true); // Set loading state to true when the form is submitted
    try {
      const newItem = {
        itemOwnerId: user.uid,
        itemName,
        category,
        company,
        color,
        description,
        price,
        images,
      };

      // Add the item to Firestore "items" collection
      const docRef = await addDoc(collection(firestore, "items"), newItem);
      console.log("Document written with ID: ", docRef.id);

      // Show success message and reset loading
      setLoading(false);
      Alert.alert("Item Added", "Your item has been successfully added for sale.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      // Show error message and reset loading
      setLoading(false);
      console.error("Error adding document: ", e);
      Alert.alert("Error", "There was an error adding the item. Please try again.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Item Images</Text>
      <View style={styles.imageContainer}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => removeImage(uri)}
            >
              <Ionicons name="trash" size={24} color="#ff0000" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addImage} onPress={pickImages}>
          <FontAwesome name="plus" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Item Name"
        value={itemName}
        onChangeText={setItemName}
        style={styles.input}
      />

      <TextInput
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
        style={styles.input}
      />

      <TextInput
        placeholder="Company"
        value={company}
        onChangeText={setCompany}
        style={styles.input}
      />

      <TextInput
        placeholder="Color"
        value={color}
        onChangeText={setColor}
        style={styles.input}
      />

      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={[styles.input, styles.textarea]}
        multiline
      />

      <TextInput
        placeholder="Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={styles.input}
      />

      {/* Show loading spinner if data is being saved */}
      {loading ? (
        <ActivityIndicator size="large" color="#28a745" style={styles.loader} />
      ) : (
        <Button mode="contained" onPress={handleSubmit} style={styles.submitButton}>
          Add Item
        </Button>
      )}
    </ScrollView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  imageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  imageWrapper: {
    position: "relative",
    marginRight: 10,
    marginBottom: 10,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 15,
    padding: 5,
  },
  addImage: {
    width: 80,
    height: 80,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  textarea: {
    height: 80,
  },
  submitButton: {
    marginTop: 10,
    backgroundColor: "#28a745",
  },
  loader: {
    marginTop: 20,
  },
};

export default AddItem;
