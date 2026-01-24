const STORAGE_KEY = 'recentEntries';
const MAX_ITEMS = 8;

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    return {};
  }
}

function writeStore(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    /* ignore quota errors silently */
  }
}

export function getRecentEntries(field) {
  if (!field) return [];
  const store = readStore();
  const list = Array.isArray(store[field]) ? store[field] : [];
  return list.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  }).slice(0, MAX_ITEMS);
}

export function saveRecentEntry(field, value) {
  if (!field) return [];
  const trimmed = (value || '').trim();
  if (!trimmed) return getRecentEntries(field);

  const store = readStore();
  const list = Array.isArray(store[field]) ? store[field] : [];
  const now = Date.now();
  const existingIndex = list.findIndex((item) => item.value === trimmed);

  if (existingIndex >= 0) {
    const existing = list[existingIndex];
    list[existingIndex] = { ...existing, count: (existing.count || 0) + 1, updatedAt: now };
  } else {
    list.unshift({ value: trimmed, count: 1, updatedAt: now });
  }

  const normalized = list
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    })
    .slice(0, MAX_ITEMS);

  store[field] = normalized;
  writeStore(store);
  return normalized;
}
