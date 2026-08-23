// Helper to determine backend base URL.
// In development we prefer relative URLs so Vite's dev proxy forwards requests.
export function getBackendBase() {
  const raw = import.meta.env.VITE_APP_URL?.trim() || '';
  // In development, if a relative backend base is provided (e.g. '/media/api/'),
  // return it so the dev server and proxy use the same prefix. Otherwise return
  // empty to use plain relative endpoints (proxied root paths).
  if (import.meta.env.DEV) {
    if (raw && raw.startsWith('/')) return raw.replace(/\/+$/g, '');
    return '';
  }

  return raw.replace(/\/+$/g, '');
}

export function getBackendOriginFrom(base) {
  try {
    return new URL(base).origin;
  } catch (e) {
    return window.location.origin;
  }
}
