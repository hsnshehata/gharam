import axios from 'axios';
import { API_BASE } from '../utils/apiBase';
import { initCollections } from './collections';
const SYNC_INTERVAL = Number(process.env.REACT_APP_SYNC_INTERVAL || 30000);
const LAST_PULL_KEY = 'beautycenterdb:lastPull:';

function authHeaders(token) {
  return { headers: { 'x-auth-token': token } };
}

function saveLastPull(collectionName, isoDate) {
  localStorage.setItem(`${LAST_PULL_KEY}${collectionName}`, isoDate);
}

function loadLastPull(collectionName) {
  return localStorage.getItem(`${LAST_PULL_KEY}${collectionName}`);
}

async function queueOperation(collections, collectionName, operation, doc) {
  const queueCol = collections.syncQueue;
  const createdAt = new Date().toISOString();
  const payload = { ...doc };
  const docId = doc._id;
  await queueCol.insert({
    _id: `${collectionName}:${docId}:${createdAt}`,
    collection: collectionName,
    operation,
    docId,
    payload,
    createdAt
  });
}

async function pushQueue(collections, token) {
  const queueCol = collections.syncQueue;
  const pending = await queueCol.find().sort({ createdAt: 'asc' }).exec();
  if (!pending.length) return { pending: 0 };

  const grouped = pending.reduce((acc, item) => {
    const data = item.toJSON();
    if (!acc[data.collection]) acc[data.collection] = [];
    acc[data.collection].push({
      op: data.operation,
      docId: data.docId,
      payload: data.payload
    });
    return acc;
  }, {});

  for (const [collectionName, operations] of Object.entries(grouped)) {
    try {
      await axios.post(`${API_BASE}/api/sync/${collectionName}/batch`, { operations }, authHeaders(token));
      const ids = pending
        .filter((item) => item.collection === collectionName)
        .map((item) => item._id);
      await queueCol.bulkRemove(ids);
    } catch (err) {
      console.error(`Push failed for ${collectionName}:`, err?.response?.data || err.message);
      return { pending: pending.length };
    }
  }

  const remaining = await queueCol.find().exec();
  return { pending: remaining.length };
}

async function pullCollection(collections, collectionName, token) {
  const last = loadLastPull(collectionName);
  const params = last ? { since: last } : {};
  try {
    const { data } = await axios.get(`${API_BASE}/api/sync/${collectionName}`, { ...authHeaders(token), params });
    const docs = data?.docs || [];
    if (!docs.length) return;
    const col = collections[collectionName];
    await col.bulkUpsert(docs);
    const newest = docs.reduce((acc, doc) => {
      if (!doc.updatedAt) return acc;
      const ts = new Date(doc.updatedAt).toISOString();
      return ts > acc ? ts : acc;
    }, last || new Date(0).toISOString());
    saveLastPull(collectionName, newest);
  } catch (err) {
    console.error(`Pull failed for ${collectionName}:`, err?.response?.data || err.message);
  }
}

export async function startReplication(token, onStatus) {
  const collections = await initCollections();
  let status = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    syncing: false,
    lastSync: null,
    pending: 0
  };

  const notify = (partial) => {
    status = { ...status, ...partial };
    if (onStatus) onStatus(status);
  };

  const syncOnce = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      notify({ online: false, syncing: false });
      return;
    }
    notify({ online: true, syncing: true });
    const pushed = await pushQueue(collections, token);
    const pending = pushed?.pending ?? status.pending;
    const collectionNames = [
      'bookings',
      'users',
      'instantServices',
      'expenses',
      'advances',
      'deductions',
      'packages',
      'services',
      'systemSettings'
    ];
    for (const name of collectionNames) {
      await pullCollection(collections, name, token);
    }
    notify({ syncing: false, lastSync: new Date().toISOString(), pending });
  };

  await syncOnce();
  const intervalId = setInterval(syncOnce, SYNC_INTERVAL);

  const onlineHandler = () => notify({ online: true });
  const offlineHandler = () => notify({ online: false });
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
  }

  return {
    collections,
    queueOperation: (collectionName, operation, doc) => queueOperation(collections, collectionName, operation, doc),
    stop: () => {
      clearInterval(intervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      }
    }
  };
}

export function applyLastWriteWins(localDoc, incomingDoc) {
  const localTs = new Date(localDoc.updatedAt || 0).getTime();
  const incomingTs = new Date(incomingDoc.updatedAt || 0).getTime();
  return incomingTs >= localTs ? incomingDoc : localDoc;
}
