const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { startSalaryResetScheduler } = require('./server/services/salaryResetService');

dotenv.config();

// Fail fast when required env vars are absent
const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { msg: 'Too many requests, please try again later.' }
});
app.use('/api', rateLimiter);
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
  const status = err.status || err.statusCode || 500;
  const errorId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const safeMessage = status >= 500 ? 'Server error' : err.message;
  console.error(`[${errorId}] ${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
  if (err.stack) console.error(err.stack);
  const payload = { msg: safeMessage, errorId };
  if (process.env.NODE_ENV !== 'production') {
    payload.error = err.message;
  }
  res.status(status).json(payload);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));