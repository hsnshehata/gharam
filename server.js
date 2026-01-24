const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { startSalaryResetScheduler } = require('./server/services/salaryResetService');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    startSalaryResetScheduler();
  })
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
app.use('/api/public', require('./server/routes/public'));
app.use('/api/sync', require('./server/routes/sync'));
console.log('Routes registered successfully');

// Serve React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  console.log('Serving static files from client/build');
  // Express 5 uses path-to-regexp v8 which errors on string "*"; regex avoids that.
  app.get(/.*/, (req, res) => {
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