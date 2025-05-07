const PayPalCheckoutScreen = ({ route, navigation }) => {
    const { orderID, onSuccess, onCancel } = route.params;
  
    return (
      <PayPalWebView
        orderID={orderID}
        onSuccess={() => {
          onSuccess();
          navigation.goBack();
        }}
        onCancel={() => {
          onCancel();
          navigation.goBack();
        }}
      />
    );
  };