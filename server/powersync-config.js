const path = require('path');
const { PowerSyncBackend } = require('@powersync/service-core');

// PowerSync backend to bridge MongoDB Atlas with SQLite clients
const powersync = new PowerSyncBackend({
  database: {
    type: 'mongodb',
    uri: process.env.MONGO_URI || process.env.MONGODB_URI,
  },
  port: process.env.POWERSYNC_PORT || 6060,
  syncRulesPath: path.join(__dirname, 'sync-rules.yaml'),
  jwt: {
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
    tokenHeader: 'x-auth-token',
  },
});

module.exports = powersync;
