import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { firestore } from "../../firebase/firebaseConfig"; 
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";

const PlaceForm = () => {
  const [placeName, setPlaceName] = useState("");
  const [placeLocation, setPlaceLocation] = useState("");
  const [placeDescription, setPlaceDescription] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const storage = getStorage();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageToFirebase = async (uri) => {
    if (!uri) return null;

    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `places/${Date.now()}.jpg`;

    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    if (!placeName || !placeLocation || !placeDescription || !image) {
      Alert.alert("Error", "Please fill all fields and select an image.");
      return;
    }

    setLoading(true);

    try {
      const imageUrl = await uploadImageToFirebase(image);

      await addDoc(collection(firestore, "places"), {
        name: placeName,
        location: placeLocation,
        description: placeDescription,
        imageUrl: imageUrl,
        createdAt: new Date(),
      });

      Alert.alert("Success", "Place added successfully!");
      setPlaceName("");
      setPlaceLocation("");
      setPlaceDescription("");
      setImage(null);
    } catch (error) {
      console.error("Error adding place: ", error);
      Alert.alert("Error", "Something went wrong. Try again!");
    }

    setLoading(false);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>Add a Place</Text>

      <TextInput
        placeholder="Place Name"
        value={placeName}
        onChangeText={setPlaceName}
        style={{ borderBottomWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <TextInput
        placeholder="Place Location"
        value={placeLocation}
        onChangeText={setPlaceLocation}
        style={{ borderBottomWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <TextInput
        placeholder="Place Description"
        value={placeDescription}
        onChangeText={setPlaceDescription}
        multiline
        style={{ borderBottomWidth: 1, marginBottom: 10, padding: 8, height: 80 }}
      />

      {image && <Image source={{ uri: image }} style={{ width: 100, height: 100, marginBottom: 10 }} />}

      <TouchableOpacity onPress={pickImage} style={{ backgroundColor: "#3498db", padding: 10, borderRadius: 5, marginBottom: 10 }}>
        <Text style={{ color: "white", textAlign: "center" }}>Pick an Image</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSubmit} disabled={loading} style={{ backgroundColor: "#2ecc71", padding: 10, borderRadius: 5 }}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", textAlign: "center" }}>Add Place</Text>}
      </TouchableOpacity>
    </View>
  );
};

export default PlaceForm;
