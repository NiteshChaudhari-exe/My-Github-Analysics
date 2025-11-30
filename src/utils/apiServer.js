/**
 * Get the API server URL
 * - In production (non-localhost hostnames), uses same origin without port
 * - In local dev (localhost), assumes server on port 4000
 * - Respects REACT_APP_API_SERVER env var if set
 */
export function getApiServerUrl() {
  if (typeof window === 'undefined') return null;
  
  // Respect explicit REACT_APP_API_SERVER env var
  if (process.env.REACT_APP_API_SERVER && process.env.REACT_APP_API_SERVER.trim()) {
    return process.env.REACT_APP_API_SERVER.trim();
  }
  
  // Auto-detect: production vs local dev
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const port = isProduction ? '' : ':4000';
  return `${window.location.protocol}//${window.location.hostname}${port}`;
}
