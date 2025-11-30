import React, { useState, useEffect } from 'react';
import { getApiServerUrl } from '../utils/apiServer.js';
export default function Login({ onSaved } = {}) {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [scopes, setScopes] = useState('');
  const [success, setSuccess] = useState(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showOAuthScopes, setShowOAuthScopes] = useState(false);

  const OAUTH_SCOPES = 'read:user repo';

  useEffect(() => {
    // Detect OAuth success redirect (?auth=success)
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      setSuccess('Successfully authenticated via OAuth! Redirecting...');
      setTimeout(() => {
        if (typeof onSaved === 'function') onSaved();
      }, 1500);
      return;
    }
  }, [onSaved]);

  useEffect(() => {
    // Check if server already has a token (httpOnly cookie)
    async function checkAuth() {
      try {
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const port = isProduction ? '' : ':4000';
        const apiServer = (process.env.REACT_APP_API_SERVER && process.env.REACT_APP_API_SERVER.trim()) || `${window.location.protocol}//${window.location.hostname}${port}`;
        const res = await fetch(`${apiServer.replace(/\/$/, '')}/api/github/user`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json && json.ok && json.user) {
            setUser(json.user);
            setSaved(true);
            // fetch scopes
            try {
              const sc = await fetch(`${apiServer.replace(/\/$/, '')}/api/github/scopes`, { credentials: 'include' });
              const scj = await sc.json().catch(() => ({}));
              if (sc.ok && scj && scj.ok) setScopes(scj.scopes || '');
            } catch (e) {
              // network error or CORS when fetching scopes
              console.warn('Failed fetching scopes from server', e);
            }
          }
        }
      } catch (e) {
        // Surface helpful error when server is unreachable (network/CORS)
        try {
          const apiServer = getApiServerUrl();
          setError(`Network error: failed to reach auth server at ${apiServer}. Is the server running and CORS configured? (${e.message})`);
        } catch (err) {
          setError(`Network error: ${e.message}`);
        }
      }
    }
    checkAuth();
  }, []);

  async function testToken(provisionalToken) {
    setError(null);
    setUser(null);
    setLoading(true);
    try {
      const apiServer = getApiServerUrl();
      const res = await fetch(`${apiServer.replace(/\/$/, '')}/auth/token/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: provisionalToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json && json.error ? (typeof json.error === 'string' ? json.error : JSON.stringify(json.error)) : `GitHub API error ${res.status}`);
        return null;
      }
      setUser(json.user || null);
      setScopes(json.scopes || '');
      setError(null);
      return json;
    } catch (e) {
      // network or CORS error when reaching the server
      try {
        const apiServer = getApiServerUrl();
        setError(`Network error: failed to reach auth server at ${apiServer}. Is the server running and CORS configured? (${e.message})`);
      } catch (err) {
        setError(e.message || String(e));
      }
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!token || !token.trim()) {
      setError('Please enter a token before saving.');
      return;
    }
    setLoading(true);
    try {
      const apiServer = getApiServerUrl();
      const res = await fetch(`${apiServer.replace(/\/$/, '')}/auth/token`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json && json.error ? (typeof json.error === 'string' ? json.error : JSON.stringify(json.error)) : `GitHub API error ${res.status}`);
      } else {
        setSaved(true);
        setUser(json.user || null);
        setScopes(json.scopes || '');
        if (typeof onSaved === 'function') onSaved();
      }
    } catch (e) {
      try {
        const apiServer = getApiServerUrl();
        setError(`Network error: failed to reach auth server at ${apiServer}. Is the server running and CORS configured? (${e.message})`);
      } catch (err) {
        setError(e.message || String(e));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    try {
      // ask server to clear cookie
      const apiServer = getApiServerUrl();
      fetch(`${apiServer.replace(/\/$/, '')}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
      setToken('');
      setSaved(false);
      setUser(null);
      setError(null);
      if (typeof onSaved === 'function') onSaved();
    } catch (e) {
      console.warn('failed clearing token', e);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow p-6">
        <h2 className="text-2xl font-bold mb-3">GitHub Login</h2>
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700 font-medium">
            ✓ {success}
          </div>
        )}
        
        <p className="text-sm text-gray-600 mb-4">Authenticate with your GitHub Personal Access Token or use OAuth for a seamless login experience.</p>

        <label className="text-xs text-gray-500">Personal Access Token</label>
        <input
          className="w-full mt-2 mb-3 p-2 border rounded bg-gray-50"
          placeholder="ghp_xxx... or gho_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60">Save token</button>
          <button onClick={() => testToken(token.trim())} disabled={loading || !token.trim()} className="px-4 py-2 rounded bg-indigo-500 text-white disabled:opacity-60">Test token</button>
          <button onClick={handleClear} className="px-4 py-2 rounded bg-gray-200">Clear token</button>
        </div>

        {loading && <div className="mt-3 text-sm text-gray-700">Checking token with GitHub...</div>}
        {error && <div className="mt-3 text-sm text-red-600">Error: {error}</div>}
        {user && (
          <div className="mt-4 flex items-center gap-3">
            <img src={user.avatar_url} alt="avatar" className="w-12 h-12 rounded-full" />
            <div>
              <div className="font-semibold">{user.login}</div>
              <div className="text-sm text-gray-600">{user.name || user.email || ''}</div>
              {scopes && <div className="text-xs text-gray-500 mt-1">Scopes: {scopes}</div>}
            </div>
          </div>
        )}

        {saved && <div className="mt-3 text-sm text-green-600">Token saved. You can now access GitHub analytics.</div>}

        <hr className="my-4" />

        <div className="text-sm text-gray-600 font-medium">Prefer OAuth?</div>
        <div className="mt-2 text-sm text-gray-500">Authenticate with GitHub OAuth for a seamless login experience. Your token will be securely stored on the server.<br />
        (This option was for test only while development but If you have Backend Source Code you can try it out, check README for more info.)
        </div>
        
        {showOAuthScopes && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
            <div className="font-medium mb-2">This app will request the following scopes:</div>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-medium">read:user</span> - Access public user information</li>
              <li><span className="font-medium">repo</span> - Access your repositories and their analytics</li>
            </ul>
            <div className="mt-2 text-xs text-gray-600">You can modify permissions after authorization on GitHub.</div>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          {!showOAuthScopes ? (
            <button
              onClick={() => setShowOAuthScopes(true)}
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm"
            >
              Show OAuth scopes
            </button>
          ) : (
            <button
              onClick={() => setShowOAuthScopes(false)}
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm"
            >
              Hide OAuth scopes
            </button>
          )}
          <button
            onClick={() => {
              setOauthLoading(true);
              const apiServer = getApiServerUrl();
              const url = `${apiServer.replace(/\/$/, '')}/auth/github`;
              window.location.href = url;
            }}
            disabled={oauthLoading}
            className="flex-1 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 font-medium transition-colors"
            title="Authenticate with GitHub OAuth"
          >
            {oauthLoading ? 'Redirecting to GitHub...' : 'Login with GitHub (OAuth)'}
          </button>
        </div>

      </div>
    </div>
  );
}
