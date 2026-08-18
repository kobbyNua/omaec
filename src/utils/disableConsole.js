// disableConsole.js
// Replace selected console methods with no-ops to prevent noisy logs in the browser
// Keep `console.error` so real errors still surface.
(function disableConsole() {
  if (typeof window === 'undefined' || typeof console === 'undefined') return;
  const methods = ['log', 'debug', 'info'];
  for (const m of methods) {
    try {
      console[m] = () => {};
    } catch (e) {
      // ignore
    }
  }
})();

export {};
