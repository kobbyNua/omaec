import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Determine a valid proxy target. Prefer explicit VITE_PROXY_BACKEND, then VITE_APP_URL,
  // and finally a sensible default. If a relative path is provided, fall back to default host.
  let rawTarget = (env.VITE_PROXY_BACKEND || env.VITE_APP_URL || '').trim();
  let proxyTarget = rawTarget || 'http://10.86.231.249';
  // If VITE_APP_URL is a relative path like '/media/api', proxy to localhost (port 80)
  if (rawTarget && rawTarget.startsWith('/')) {
    proxyTarget = 'http://localhost';
  }
  // If the proxy target has an explicit :80, strip it to let the default HTTP port be used.
  proxyTarget = proxyTarget.replace(/:80\/?$/, '');
  const isHttps = /^https:/i.test(proxyTarget);

  const createProxyEntry = () => ({
    target: proxyTarget,
    changeOrigin: true,
    secure: isHttps,
  });

  // Proxy common backend routes in development/preview to avoid 502 when requesting APIs
  const proxyRoutes = {
    // Note: do not proxy top-level '/media' which conflicts with the SPA route.
    // Use '/media/api' for backend API calls instead.
    '/media/api': createProxyEntry(),
    '/media/uploads': createProxyEntry(),
    '/uploads': createProxyEntry(),
    '/images': createProxyEntry(),
    // '/home' and '/home_clients' removed to avoid accidental proxy to root host.
    '/clients': createProxyEntry(),
    '/auth': createProxyEntry(),
    '/api': createProxyEntry(),
  };

  // NOTE: rely on Vite's default SPA handling; avoid custom plugin that returned HTML for module requests

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: proxyRoutes,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      proxy: proxyRoutes,
    },
  }
})
