import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { firestore } from "../../../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { useUser } from "../../context/UserContext";

const { width } = Dimensions.get("window");
const PAYPAL_CONFIG = {
  clientId:
    "AYYwyYcjs6gszCnj84YXx00dvtVbGYuZdvUhTfQIRCIy7-ufb3zBaRpmtkIWS7iRyrL0uqt7WqMGdz14",
  environment: "sandbox", // Just use 'sandbox' or 'production'
};

const BuyItem = ({ route, navigation }) => {
  const { item } = route.params;
  const { user } = useUser();
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [totalPrice, setTotalPrice] = useState(item.price);
  const [buyerData, setBuyerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [loadingPurchase, setLoadingPurchase] = useState(false);

  // Format current date
  const formatDate = (date) => {
    const options = { day: "2-digit", month: "long", year: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };
  const today = formatDate(new Date());

  // Fetch buyer data
  useEffect(() => {
    const fetchBuyerData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setBuyerData(userData);
            if (userData.phone) setContactNumber(userData.phone);
            if (userData.address) setAddress(userData.address);
          } else {
            console.log("User document does not exist");
          }
        } catch (error) {
          console.error("Error fetching buyer data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        console.log("No user UID available");
        setLoading(false);
      }
    };
    fetchBuyerData();
  }, [user]);

  // Update total price
  useEffect(() => {
    setTotalPrice(item.price * quantity);
  }, [quantity, item.price]);

  const handleQuantityChange = (value) => {
    const newQuantity = Math.max(1, Math.min(value, item.Stock));
    setQuantity(newQuantity);
  };

  const handleIncrement = () => {
    if (quantity < item.Stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Save the order to Firestore and return the order ID
  const saveOrderToFirestore = async () => {
    try {
      const orderData = {
        itemId: item.id,
        itemName: item.itemName,
        itemOwnerId: item.itemOwnerId,
        buyerId: user.uid,
        quantity: quantity,
        totalPrice: totalPrice,
        paymentMethod: paymentMethod,
        orderDate: new Date().toISOString(),
        status: "pending",
        deliveryAddress: address,
        contactNumber: contactNumber,
      };

      const orderRef = await addDoc(
        collection(firestore, "item_orders"),
        orderData
      );
      console.log("Order saved successfully with ID:", orderRef.id);
      return orderRef.id;
    } catch (error) {
      console.error("Error saving order to Firestore:", error);
      Alert.alert(
        "Error",
        "Failed to save order details. Please contact support."
      );
      return null;
    }
  };

  // Send notification to the item owner
  const sendNotificationToOwner = async (orderId) => {
    try {
      const notificationData = {
        type: "order_status",
        actorId: user.uid,
        orderId: orderId,
        message: `${buyerData?.name || "A buyer"} purchased your item "${
          item.itemName
        }" (Quantity: ${quantity})`,
        timestamp: serverTimestamp(),
        read: false,
      };

      await addDoc(
        collection(firestore, "users", item.itemOwnerId, "notifications"),
        notificationData
      );
      console.log("Notification sent to item owner:", item.itemOwnerId);
    } catch (error) {
      console.error("Error sending notification to item owner:", error);
    }
  };

  const handlePayPalPayment = async () => {
    setLoadingPurchase(true);
    try {
      // Create PayPal payment URL
      const amount = (totalPrice / 100).toFixed(2);
      const description = `Payment for ${item.itemName} (${quantity} units)`;

      // Create PayPal payment URL with sandbox environment and business email
      const paypalUrl = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick&business=sb-pgpad41451709@business.example.com&item_name=${encodeURIComponent(
        description
      )}&amount=${amount}&currency_code=USD&return=${encodeURIComponent(
        "builderhub://payment/success"
      )}&cancel_return=${encodeURIComponent("builderhub://payment/cancel")}`;

      // Open PayPal in browser
      const supported = await Linking.canOpenURL(paypalUrl);

      if (supported) {
        await Linking.openURL(paypalUrl);

        // Note: In a real app, you would need to implement deep linking to handle the return URL
        // For now, we'll simulate a successful payment
        setTimeout(async () => {
          try {
            // Update stock
            const newStock = item.Stock - quantity;
            await updateDoc(doc(firestore, "items", item.id), {
              Stock: newStock,
            });

            // Save order
            const orderId = await saveOrderToFirestore();
            if (orderId) {
              await sendNotificationToOwner(orderId);
            }

            setLoadingPurchase(false);
            Alert.alert(
              "Payment Successful!",
              "Your order has been placed successfully via PayPal.",
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          } catch (error) {
            console.error("Error updating order:", error);
            setLoadingPurchase(false);
            Alert.alert(
              "Error",
              "There was an error processing your order. Please contact support.",
              [{ text: "OK" }]
            );
          }
        }, 2000); // Simulate payment processing time
      } else {
        setLoadingPurchase(false);
        Alert.alert(
          "Error",
          "Cannot open PayPal. Please make sure you have a browser installed.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("PayPal payment error:", error);
      setLoadingPurchase(false);
      Alert.alert(
        "Payment Error",
        "There was an error processing your payment. Please try again.",
        [
          { text: "Try Again", onPress: handlePayPalPayment },
          {
            text: "Use Cash on Delivery",
            onPress: () => setPaymentMethod("Cash on Delivery"),
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const handlePurchase = async () => {
    // Validation
    if (!address.trim()) {
      Alert.alert("Error", "Please enter your delivery address");
      return;
    }
    if (!contactNumber.trim()) {
      Alert.alert("Error", "Please enter your contact number");
      return;
    }
    if (!/^\d{10}$/.test(contactNumber.replace(/[^0-9]/g, ""))) {
      Alert.alert("Error", "Please enter a valid 10-digit contact number");
      return;
    }

    if (paymentMethod === "PayPal") {
      await handlePayPalPayment();
      return;
    }

    setLoadingPurchase(true);
    try {
      // Process Cash on Delivery
      const newStock = item.Stock - quantity;
      await updateDoc(doc(firestore, "items", item.id), {
        Stock: newStock,
      });

      // Save the order and get order ID
      const orderId = await saveOrderToFirestore();
      if (orderId) {
        // Send notification to owner
        await sendNotificationToOwner(orderId);
      }

      setLoadingPurchase(false);
      Alert.alert(
        "Purchase Successful!",
        "Your order has been placed successfully via Cash on Delivery.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error processing purchase:", error);
      setLoadingPurchase(false);
      Alert.alert(
        "Error",
        "Failed to process your purchase. Please try again."
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : null}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={styles.placeholderRight} />
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome, {loading ? "Loading..." : buyerData?.name || "Guest"}
          </Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>

        {/* Item Preview */}
        <View style={styles.itemPreviewContainer}>
          <View style={styles.itemImageContainer}>
            {item.images && item.images.length > 0 ? (
              <Image
                source={{ uri: item.images[0] }}
                style={styles.itemImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <Icon name="image-not-supported" size={36} color="#6c757d" />
              </View>
            )}
          </View>
          <View style={styles.itemPreviewDetails}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.itemName}
            </Text>
            <Text style={styles.itemPrice}>
              Rs. {Number(item.price).toLocaleString()} per unit
            </Text>
            <Text style={styles.stockInfo}>
              {item.Stock} {item.Stock === 1 ? "unit" : "units"} available
            </Text>
          </View>
        </View>

        {/* Quantity Selector */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Select Quantity</Text>
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              onPress={handleDecrement}
              style={[
                styles.quantityButton,
                quantity <= 1 && styles.disabledButton,
              ]}
              disabled={quantity <= 1}
            >
              <Icon
                name="remove"
                size={24}
                color={quantity <= 1 ? "#ccc" : "#333"}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.quantityInput}
              value={String(quantity)}
              onChangeText={(text) => {
                const value = parseInt(text) || 0;
                handleQuantityChange(value);
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
            <TouchableOpacity
              onPress={handleIncrement}
              style={[
                styles.quantityButton,
                quantity >= item.Stock && styles.disabledButton,
              ]}
              disabled={quantity >= item.Stock}
            >
              <Icon
                name="add"
                size={24}
                color={quantity >= item.Stock ? "#ccc" : "#333"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your complete delivery address"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Contact Number */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Contact Number</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your contact number"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Item Price:</Text>
            <Text style={styles.summaryValue}>
              Rs. {Number(item.price).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Quantity:</Text>
            <Text style={styles.summaryValue}>{quantity}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee:</Text>
            <Text style={styles.freeDelivery}>FREE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>
              Rs. {Number(totalPrice).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptionsContainer}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === "Cash on Delivery" && styles.selectedPayment,
              ]}
              onPress={() => setPaymentMethod("Cash on Delivery")}
            >
              <Icon
                name="payments"
                size={24}
                color={
                  paymentMethod === "Cash on Delivery" ? "#007bff" : "#666"
                }
              />
              <Text style={styles.paymentOptionText}>Cash on Delivery</Text>
              {paymentMethod === "Cash on Delivery" && (
                <Icon name="check-circle" size={20} color="#007bff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === "PayPal" && styles.selectedPayment,
              ]}
              onPress={() => setPaymentMethod("PayPal")}
            >
              <Icon
                name="account-balance-wallet"
                size={24}
                color={paymentMethod === "PayPal" ? "#007bff" : "#666"}
              />
              <Text style={styles.paymentOptionText}>PayPal</Text>
              {paymentMethod === "PayPal" && (
                <Icon name="check-circle" size={20} color="#007bff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.bottomTotalContainer}>
          <Text style={styles.bottomTotalLabel}>Total:</Text>
          <Text style={styles.bottomTotalAmount}>
            Rs. {Number(totalPrice).toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            loadingPurchase && styles.disabledPurchaseButton,
          ]}
          onPress={handlePurchase}
          disabled={loadingPurchase}
        >
          {loadingPurchase ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.purchaseButtonText}>Confirm Purchase</Text>
              <Icon name="shopping-bag" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e4e8",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    backgroundColor: "#F4B018",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  placeholderRight: {
    width: 40,
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e4e8",
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  itemPreviewContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e4e8",
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f1f3f5",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  noImageContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f3f5",
  },
  itemPreviewDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "500",
    color: "#28a745",
    marginBottom: 4,
  },
  stockInfo: {
    fontSize: 14,
    color: "#666",
  },
  sectionContainer: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e4e8",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
    alignSelf: "center",
  },
  quantityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f8f9fa",
  },
  disabledButton: {
    backgroundColor: "#f1f3f5",
  },
  quantityInput: {
    textAlign: "center",
    width: 60,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f8f9fa",
  },
  summaryContainer: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e4e8",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#555",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  freeDelivery: {
    fontSize: 15,
    fontWeight: "500",
    color: "#28a745",
  },
  divider: {
    height: 1,
    backgroundColor: "#e1e4e8",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007bff",
  },
  paymentOptionsContainer: {
    marginTop: 8,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedPayment: {
    borderColor: "#007bff",
    backgroundColor: "rgba(0, 123, 255, 0.05)",
  },
  paymentOptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  spacer: {
    height: 100,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e4e8",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bottomTotalContainer: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 14,
    color: "#666",
  },
  bottomTotalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  purchaseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginLeft: 16,
  },
  disabledPurchaseButton: {
    backgroundColor: "#6c757d",
  },
  purchaseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
});

export default BuyItem;
