import axios from 'axios';

const TTL = 5 * 60 * 1000; // 5 minutes
let cachedPackages = null;
let cachedServices = null;
let tsPackages = 0;
let tsServices = 0;

const getTokenHeader = () => ({ headers: { 'x-auth-token': localStorage.getItem('token') } });

export async function getPackages() {
  try {
    if (cachedPackages && (Date.now() - tsPackages) < TTL) return cachedPackages;
    const res = await axios.get('http://localhost:5000/api/packages/packages', getTokenHeader());
    cachedPackages = res.data;
    tsPackages = Date.now();
    return cachedPackages;
  } catch (err) {
    throw err;
  }
}

export async function getServices() {
  try {
    if (cachedServices && (Date.now() - tsServices) < TTL) return cachedServices;
    const res = await axios.get('http://localhost:5000/api/packages/services', getTokenHeader());
    cachedServices = res.data;
    tsServices = Date.now();
    return cachedServices;
  } catch (err) {
    throw err;
  }
}

export function clearCache() {
  cachedPackages = null;
  cachedServices = null;
  tsPackages = 0;
  tsServices = 0;
}
