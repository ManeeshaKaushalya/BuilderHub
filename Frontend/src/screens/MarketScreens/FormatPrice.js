import React from "react";
import { Text } from "react-native";

const FormatPrice = ({ price }) => {
  const formattedPrice = Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(price / 100);

  return <Text>{formattedPrice}</Text>;
};

export default FormatPrice;
