const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.path}`);
  // Skip invalid paths
  if (req.path.includes('://') || req.path.includes('git.new')) {
    console.log(`Skipping invalid path: ${req.path}`);
    return res.status(400).json({ msg: 'Invalid request path' });
  }
  next();
});

// Serve static files first in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  console.log('Serving static files from client/build');
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
console.log('Registering routes...');
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/users', require('./server/routes/users'));
app.use('/api/packages', require('./server/routes/packages'));
app.use('/api/bookings', require('./server/routes/bookings'));
app.use('/api/instant-services', require('./server/routes/instantServices'));
app.use('/api/expenses-advances', require('./server/routes/expensesAdvances'));
app.use('/api/reports', require('./server/routes/reports'));
app.use('/api/dashboard', require('./server/routes/dashboard'));
app.use('/api/today-work', require('./server/routes/todayWork'));
console.log('Routes registered successfully');

// Serve React app for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    console.log(`Serving index.html for path: ${req.path}`);
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`Error occurred: ${err.message}`);
  console.error(`Stack trace: ${err.stack}`);
  res.status(500).json({ msg: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
