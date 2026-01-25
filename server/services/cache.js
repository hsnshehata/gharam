const Redis = require('ioredis');

// نستخدم ريديس لو متاح، ولو مش موجود بنرجع لفول باك في الذاكرة
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let redis = null;
let memoryStore = new Map();

const buildRedisOptions = (urlString) => {
  const baseOptions = {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false
  };

  try {
    const parsed = new URL(urlString);
    if (parsed.username) baseOptions.username = decodeURIComponent(parsed.username);
    if (parsed.password) baseOptions.password = decodeURIComponent(parsed.password);

    // Redis السحابي عادة يحتاج TLS، نتأكد لو السيرفر مش لوكال
    if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
      baseOptions.tls = {};
    }
  } catch (err) {
    console.warn('Redis URL parse failed, continuing with defaults:', err.message);
  }

  return baseOptions;
};

try {
  redis = new Redis(redisUrl, buildRedisOptions(redisUrl));
  redis.on('error', (err) => {
    console.warn('Redis error, falling back to memory:', err.message);
    redis = null;
  });
} catch (err) {
  console.warn('Redis init failed, using in-memory cache:', err.message);
  redis = null;
}

const now = () => Date.now();

async function getCache(key) {
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('Redis get error, fallback to memory', err.message);
    }
  }
  return memoryStore.get(key) || null;
}

async function setCache(key, value, ttlSeconds) {
  const payload = JSON.stringify(value);
  if (redis) {
    try {
      if (ttlSeconds) {
        await redis.set(key, payload, 'EX', ttlSeconds);
      } else {
        await redis.set(key, payload);
      }
      return;
    } catch (err) {
      console.warn('Redis set error, storing in memory', err.message);
    }
  }
  memoryStore.set(key, value);
  if (ttlSeconds) {
    setTimeout(() => memoryStore.delete(key), ttlSeconds * 1000).unref();
  }
}

async function deleteByPrefix(prefix) {
  if (redis) {
    try {
      const stream = redis.scanStream({ match: `${prefix}*` });
      const keys = [];
      return await new Promise((resolve, reject) => {
        stream.on('data', (resultKeys) => {
          if (resultKeys.length) keys.push(...resultKeys);
        });
        stream.on('end', async () => {
          if (keys.length) await redis.del(keys);
          resolve(keys.length);
        });
        stream.on('error', reject);
      });
    } catch (err) {
      console.warn('Redis deleteByPrefix error, falling back to memory', err.message);
    }
  }
  let deleted = 0;
  memoryStore.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      memoryStore.delete(key);
      deleted += 1;
    }
  });
  return deleted;
}

async function cacheAside({ key, ttlSeconds, staleSeconds, fetchFn }) {
  const ttlMs = (ttlSeconds || 60) * 1000;
  const staleMs = (staleSeconds || ttlSeconds * 2 || 120) * 1000;
  const cached = await getCache(key);
  const isFresh = cached && cached.cachedAt && now() - cached.cachedAt < ttlMs;
  const isStaleButUsable = cached && cached.cachedAt && now() - cached.cachedAt < staleMs;

  if (isFresh) return cached.data;

  if (isStaleButUsable) {
    // نرجع الداتا القديمة فوراً ونجدّد في الخلفية
    refreshInBackground({ key, ttlSeconds, fetchFn });
    return cached.data;
  }

  const data = await fetchFn();
  await setCache(key, { data, cachedAt: now() }, staleSeconds || ttlSeconds * 2);
  return data;
}

async function refreshInBackground({ key, ttlSeconds, fetchFn }) {
  Promise.resolve()
    .then(fetchFn)
    .then((data) => setCache(key, { data, cachedAt: now() }, (ttlSeconds || 60) * 2))
    .catch((err) => console.warn(`Background refresh failed for ${key}:`, err.message));
}

module.exports = {
  getCache,
  setCache,
  deleteByPrefix,
  cacheAside,
  refreshInBackground
};
