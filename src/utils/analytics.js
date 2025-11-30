// Lightweight consent-aware analytics wrapper
// Usage: call `enable({ gaId })` after user gives consent. Before that, calls are no-ops.
const STORAGE_KEY = 'analytics.consent';
let enabled = false;
let gaId = null;

function _injectGtag(id) {
  if (!id || typeof window === 'undefined' || window.gtagInitialized) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);} // eslint-disable-line no-inner-declarations
  window.gtag = gtag;
  window.gtag('js', new Date());
  window.gtag('config', id);
  window.gtagInitialized = true;
}

const analytics = {
  // Initialize/enable analytics after consent. Optionally pass provider-specific opts.
  enable: ({ ga } = {}) => {
    enabled = true;
    if (ga) {
      gaId = ga;
      try { _injectGtag(gaId); } catch (e) { console.warn('gtag init failed', e); }
    }
  },

  // Disable analytics (stop sending events). Does not remove scripts.
  disable: () => {
    enabled = false;
  },

  // Track a named event with optional params
  trackEvent: (name, params) => {
    try {
      if (!enabled) return;
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', name, params || {});
      } else {
        // fallback for development / no provider: console log
        // eslint-disable-next-line no-console
        console.log('[analytics] event', name, params || {});
      }
    } catch (e) {
      // swallow analytics errors
      // eslint-disable-next-line no-console
      console.warn('analytics.trackEvent error', e);
    }
  },

  // Track a pageview
  pageview: (path) => {
    try {
      if (!enabled) return;
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', gaId, { page_path: path });
      } else {
        // eslint-disable-next-line no-console
        console.log('[analytics] pageview', path);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('analytics.pageview error', e);
    }
  },

  // Helper: read persisted consent state
  consentGiven: () => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  },

  // Persist consent locally (used by ConsentBanner)
  setConsent: (v) => {
    try { localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false'); } catch (e) {}
    if (v) analytics.enable(); else analytics.disable();
  }
};

export default analytics;
