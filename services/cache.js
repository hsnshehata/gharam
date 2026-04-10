// إيقاف الاعتماد على Redis نهائياً والاعتماد فقط على الذاكرة المؤقتة
let memoryStore = new Map();

const now = () => Date.now();

async function getCache(key) {
  return memoryStore.get(key) || null;
}

async function setCache(key, value, ttlSeconds) {
  const payload = JSON.stringify(value);
  memoryStore.set(key, payload ? JSON.parse(payload) : value);
  if (ttlSeconds) {
    setTimeout(() => memoryStore.delete(key), ttlSeconds * 1000).unref();
  }
}

async function deleteByPrefix(prefix) {
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
