import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from "react-native";
import { Button, Menu } from "react-native-paper";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Slider from "@react-native-community/slider";
import FormatPrice from "./FormatPrice";

const categories = ["All", "Paints", "Machines", "Tools", "Furniture"];
const companies = ["All", "Sakithma", "Gayara", "Jesi"];
const colors = ["red", "blue", "green", "black", "all"];

const FilterSection = ({ navigation }) => {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [price, setPrice] = useState(1000);
  const [menuVisible, setMenuVisible] = useState(false);

  const resetFilters = () => {
    setSearchText("");
    setSelectedCategory(null);
    setSelectedCompany(null);
    setSelectedColor(null);
    setPrice(1000);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Search Input */}
      <TextInput
        placeholder="Search products..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.input}
      />

      {/* Category Selection */}
      <Text style={styles.label}>Category</Text>
      <FlatList
        horizontal
        data={categories}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedCategory(item)}
            style={[
              styles.categoryButton,
              selectedCategory === item && styles.selectedCategoryButton,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === item && styles.selectedCategoryText,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
      />

      {/* Company Selection (Dropdown) */}
      <Text style={styles.label}>Shop</Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.dropdown}
          >
            <Text>{selectedCompany || "Select Shop"}</Text>
          </TouchableOpacity>
        }
      >
        {companies.map((company) => (
          <Menu.Item
            key={company}
            onPress={() => {
              setSelectedCompany(company);
              setMenuVisible(false);
            }}
            title={company}
          />
        ))}
      </Menu>

      {/* Color Selection */}
      <Text style={styles.label}>Colors</Text>
      <FlatList
        horizontal
        data={colors}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedColor(item)}
            style={[
              styles.colorCircle,
              { backgroundColor: item === "all" ? "#ddd" : item },
            ]}
          >
            {selectedColor === item && (
              <FontAwesome name="check" size={12} color="white" />
            )}
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
      />

      {/* Price Slider */}
      <Text style={styles.label}>Price</Text>
      <Slider
        style={styles.slider}
        minimumValue={100}
        maximumValue={5000}
        step={100}
        value={price}
        onValueChange={setPrice}
      />
      <Text style={styles.priceText}>
        <FormatPrice price={price} />
      </Text>

      {/* Clear Filters Button */}
      <Button mode="contained" onPress={resetFilters} style={styles.clearButton}>
        Clear Filters
      </Button>

      {/* Add Items Button */}
      <Button
        mode="contained"
        onPress={() => navigation.navigate("AddItem")} 
        style={styles.addButton}
      >
        Add Items
      </Button>
    </ScrollView>
  );
};

const styles = {
  container: {
    padding: 20,
    backgroundColor: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  categoryButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginRight: 10,
  },
  selectedCategoryButton: {
    backgroundColor: "#007bff",
  },
  categoryText: {
    color: "#000",
    fontSize: 14,
  },
  selectedCategoryText: {
    color: "#fff",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  priceText: {
    textAlign: "center",
    marginTop: 5,
    fontSize: 16,
    fontWeight: "bold",
  },
  clearButton: {
    marginTop: 20,
    backgroundColor: "red",
  },
  addButton: {
    marginTop: 10,
    backgroundColor: "#28a745",
  },
};

export default FilterSection;
