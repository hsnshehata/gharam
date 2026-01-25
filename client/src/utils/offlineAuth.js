const OFFLINE_SESSION_KEY = 'offlineUserSession';

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashCredentials(username, password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${username}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return toHex(hashBuffer);
}

export function loadOfflineSession() {
  try {
    const raw = localStorage.getItem(OFFLINE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse offline session', e);
    return null;
  }
}

export function clearOfflineSession() {
  try {
    localStorage.removeItem(OFFLINE_SESSION_KEY);
  } catch (e) {
    console.warn('Failed to clear offline session', e);
  }
}

export async function persistOfflineSession({ user, token, username, password }) {
  try {
    const credentialHash = await hashCredentials(username, password);
    const payload = {
      user,
      token,
      credentialHash,
      username,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(payload));
    return payload;
  } catch (e) {
    console.warn('Failed to persist offline session', e);
    return null;
  }
}

export async function verifyOfflineLogin(username, password) {
  const session = loadOfflineSession();
  if (!session) return null;
  if (session.username !== username) return null;
  try {
    const hash = await hashCredentials(username, password);
    if (hash !== session.credentialHash) return null;
    return session;
  } catch (e) {
    console.warn('Failed to verify offline login', e);
    return null;
  }
}
