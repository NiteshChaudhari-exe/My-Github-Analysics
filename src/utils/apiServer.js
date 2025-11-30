/**
 * Get the API server URL
 * - In production (non-localhost hostnames), uses same origin without port
 * - In local dev (localhost), assumes server on port 4000
 * - Respects REACT_APP_API_SERVER env var if set
 */
export function getApiServerUrl() {
  if (typeof window === 'undefined') return null;
  
  // Respect explicit REACT_APP_API_SERVER env var first
  if (process.env.REACT_APP_API_SERVER && process.env.REACT_APP_API_SERVER.trim()) {
    const url = process.env.REACT_APP_API_SERVER.trim();
    // Ensure no port is added
    return url;
  }
  
  // Auto-detect: production vs local dev
  // On Vercel, hostname is the vercel domain (not localhost), so use same origin
  // On localhost, assume separate server on port 4000
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const protocol = window.location.protocol; // includes ':'
  
  if (isLocalhost) {
    // Local development: connect to server on port 4000
    return `${protocol}//localhost:4000`;
  } else {
    // Production (Vercel, etc.): use same origin, no port
    return `${protocol}//${hostname}`;
  }
}
