const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cron = require('node-cron');
const { startSalaryResetScheduler } = require('./server/services/salaryResetService');
const { initTelegramBot } = require('./server/services/telegramBot');

dotenv.config();

// Fail fast when required env vars are absent
const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();
// Render sits behind a proxy; trust it for correct IP handling
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Security middlewares that depend on body/query should be AFTER parsers
app.use(helmet({ contentSecurityPolicy: false }));
// Removed mongoSanitize() here because it is incompatible with Express 5
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

const { warmUp: warmUpDataStore } = require('./server/services/dataStore');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    startSalaryResetScheduler();
    initTelegramBot();
    // Warm up the in-memory data store for instant reads
    await warmUpDataStore();
  })
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
console.log('Registering routes...');

// Login Brute-force protection
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول من هذا الجهاز. يرجى المحاولة بعد 15 دقيقة.' }
});
app.use('/api/auth/login', loginLimiter);

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
app.use('/api/public/facebook', require('./server/routes/facebook'));
app.use('/api/facebook', require('./server/routes/facebookAdmin'));
app.use('/api/ai', require('./server/routes/ai'));
app.use('/api/admin-ai', require('./server/routes/adminAi'));
app.use('/api/admin/agents', require('./server/routes/adminAIAgents'));
app.use('/api/admin/teams', require('./server/routes/adminAITeams'));
app.use('/api/telegram', require('./server/routes/telegramRoutes'));
app.use('/api/afrakoush', require('./server/routes/afrakoushRoutes'));
app.use('/api/sync', require('./server/routes/sync'));
console.log('Routes registered successfully');

// Facebook Cron Job: تحديث البوستات كل 30 دقيقة
const { syncFacebookPosts } = require('./server/controllers/facebookController');
cron.schedule('*/30 * * * *', async () => {
	console.log('[CRON] جاري تحديث بوستات Facebook...');
	try {
		const fakeReq = {};
		const fakeRes = {
			status: (code) => ({
				json: (data) => {
					console.log(`[CRON] Facebook Sync Result: ${data.message}`);
				}
			})
		};
		await syncFacebookPosts(fakeReq, fakeRes);
	} catch (error) {
		console.error('[CRON] خطأ في تحديث Facebook:', error);
	}
});
console.log('[CRON] Facebook sync scheduled (every 30 minutes)');

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

// Memory usage monitor — warn when approaching heap limit
setInterval(() => {
  const used = process.memoryUsage();
  const heapMB = Math.round(used.heapUsed / 1024 / 1024);
  const rssMB = Math.round(used.rss / 1024 / 1024);
  if (heapMB > 200) {
    console.warn(`[Memory] ⚠️ Heap: ${heapMB}MB, RSS: ${rssMB}MB — approaching limit!`);
  }
}, 60000).unref();

const { setupLiveVoiceWebSocket } = require('./server/services/liveAudioService');
const { initCronService } = require('./server/services/cronService');

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
  const mem = process.memoryUsage();
  console.log(`Server running on port ${PORT} | Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
  await initCronService();
});

setupLiveVoiceWebSocket(server);
