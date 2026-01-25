const trimTrailingSlash = (url) => (url || '').replace(/\/$/, '');

export function resolveApiBase() {
  const envBase = trimTrailingSlash(process.env.REACT_APP_API_BASE || '');
  if (envBase) return envBase;

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    if (port === '3000') return `${protocol}//${hostname}:5000`;
    return trimTrailingSlash(origin);
  }

  return 'http://localhost:5000';
}

export const API_BASE = resolveApiBase();
