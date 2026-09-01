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

export function normalizeAssetUrl(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let src = String(value).trim().replace(/\\/g, '/');
  if (!src || src === 'null' || src === 'undefined') {
    return '';
  }

  if (src.startsWith('data:') || src.startsWith('blob:') || /^https?:\/\//i.test(src)) {
    return src;
  }

  const backendBase = getBackendBase();
  const backendOrigin = backendBase ? getBackendOriginFrom(backendBase) : window.location.origin;

  const hasServerRootPath = src.includes('/var/www/html') || src.includes('/public_html') || /(?:\/home\d*\/.*\/public_html|\/home\d*\/.*\/html)/i.test(src);

  if (hasServerRootPath) {
    const assetMatch = src.match(/(?:\/media|\/uploads|\/storage|\/public)[^?]*/i);
    const assetPath = assetMatch ? assetMatch[0] : src.replace(/^.*?(?:\/media|\/uploads|\/storage|\/public)/i, '');
    return `${backendOrigin}${assetPath.startsWith('/') ? assetPath : `/${assetPath}`}`;
  }

  if (src.startsWith('/media/uploads') || src.startsWith('/uploads') || src.startsWith('/media/') || src.startsWith('/storage/') || src.startsWith('/public/')) {
    return `${backendOrigin}${src}`;
  }

  if (src.startsWith('/')) {
    return `${backendOrigin}${src}`;
  }

  if (src.startsWith('uploads/') || src.startsWith('media/uploads') || src.startsWith('storage/')) {
    return `${backendOrigin}/${src.replace(/^\/+/, '')}`;
  }

  return src;
}
