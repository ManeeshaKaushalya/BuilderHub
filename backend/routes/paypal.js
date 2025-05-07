// routes/paypal.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const CLIENT_ID = 'ASs-txlZjhUnv5GEvuIRbkRMUJg6QV9fv-fSa1T7up-PRaIPLnxQT-2AFxMGTktLD_z8SBgzJlFCgdqc';
const SECRET = 'EA0TjwaU0PW40ro99fiDbmH3cjhURLlFchAJ-oPqrme03BRgPDaJv4-dYBTstmBqzIE99IXUjGGNmgOK';
const BASE_URL = 'https://api-m.sandbox.paypal.com'; // Use sandbox for testing

// Get access token
const getAccessToken = async () => {
  const response = await axios({
    url: `${BASE_URL}/v1/oauth2/token`,
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en_US',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    auth: {
      username: CLIENT_ID,
      password: SECRET,
    },
    data: 'grant_type=client_credentials',
  });
  return response.data.access_token;
};

// Create PayPal order
router.post('/create-order', async (req, res) => {
  const { amount } = req.body;
  const accessToken = await getAccessToken();

  const response = await axios.post(
    `${BASE_URL}/v2/checkout/orders`,
    {
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: 'USD', value: amount } }],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  res.json(response.data);
});

// Capture order
router.post('/capture-order/:orderId', async (req, res) => {
  const accessToken = await getAccessToken();

  const response = await axios.post(
    `${BASE_URL}/v2/checkout/orders/${req.params.orderId}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  res.json(response.data);
});

module.exports = router;
