const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { startSalaryResetScheduler } = require('./services/salaryResetService');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    startSalaryResetScheduler();
  })
  .catch(err => console.log(err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/public/facebook', require('./routes/facebook'));
app.use('/api/facebook', require('./routes/facebookAdmin'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/expenses-advances', require('./routes/expensesAdvances'));
app.use('/api/instant-services', require('./routes/instantServices'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/today-work', require('./routes/todayWork'));
app.use('/api/public', require('./routes/public'));
app.use('/api/sync', require('./routes/sync'));

// Serve React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));