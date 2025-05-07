const express = require('express');
const app = express();
const paypalRoutes = require('./routes/paypal'); // adjust path if needed

app.use(express.json());
app.use('/paypal', paypalRoutes); // All routes will be prefixed with /paypal

// Start your server
const PORT = process.env.PORT || 5000;
app.listen(5000, '0.0.0.0', () => console.log("Server running on port 5000"));

