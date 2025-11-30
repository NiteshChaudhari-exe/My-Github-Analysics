import { getApiServerUrl } from './utils/apiServer.js';

const GITHUB_API_URL = 'https://api.github.com';
const RATE_LIMIT_THRESHOLD = 50; // Warn when fewer than 50 requests remaining

function apiServerBase() {
  return getApiServerUrl();
}

function cacheKeyFor(prefix, key) {
  return `gh_cache:${prefix}:${btoa(unescape(encodeURIComponent(key))).slice(0, 120)}`;
}

// Read token at runtime: prefer localStorage (set by Login), fallback to build-time env var
export function getToken() {
  try {
    const t = typeof window !== 'undefined' ? window.localStorage.getItem('github.token') : null;
    if (t) return t;
  } catch (e) {
    // ignore localStorage errors
  }
  return process.env.REACT_APP_GITHUB_TOKEN || null;
}

export async function checkRateLimit() {
  // If a client-side token is available, check GitHub rate limit directly.
  // If no client token is present (server-managed httpOnly cookie flow),
  // avoid throwing here — the server will enforce rate limits for proxied requests.
  const token = (function() {
    try { return getToken(); } catch (e) { return null; }
  })();

  if (!token) {
    // No client token: return a high remaining allowance so the app does not warn
    // or attempt direct GitHub calls. Server proxy will handle real limits.
    return { remaining: Number.MAX_SAFE_INTEGER, reset: Math.floor(Date.now() / 1000) + 3600 };
  }

  const res = await fetch(`${GITHUB_API_URL}/rate_limit`, {
    headers: { Authorization: `token ${token}` }
  });
  const data = await res.json();
  return data.resources.core;
}

async function handleResponse(res) {
  const remaining = res.headers?.get ? res.headers.get('x-ratelimit-remaining') : null;
  const reset = res.headers?.get ? res.headers.get('x-ratelimit-reset') : null;
  
  if (remaining !== null) {
    const remainingNum = Number(remaining);
    if (remainingNum === 0) {
      const resetDate = reset ? new Date(Number(reset) * 1000) : null;
      throw new Error(`GitHub rate limit exceeded${resetDate ? `, resets at ${resetDate.toLocaleString()}` : ''}`);
    }
    if (remainingNum < RATE_LIMIT_THRESHOLD) {
      console.warn(`GitHub rate limit warning: ${remainingNum} requests remaining`);
    }
  }
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API error ${res.status} ${text}`);
  }
  
  const data = await res.json();
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response from GitHub API');
  }
  return data;
}

export async function fetchGitHub(endpoint, { useCache = true, ttl = 60 } = {}) {
  const token = getToken();
  const url = `${GITHUB_API_URL}${endpoint}`;
  const apiServer = apiServerBase();

  const key = cacheKeyFor('rest', url);
  if (useCache) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.ts < ttl * 1000) return parsed.data;
      }
    } catch (e) {
      // ignore cache errors
    }
  }

  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (token) {
    headers.Authorization = `token ${token}`;
    const res = await fetch(url, { headers });
    const json = await handleResponse(res);
    if (useCache) {
      try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: json })); } catch (e) { }
    }
    return json;
  }

  // If no client token, proxy via server (httpOnly cookie)
  if (!apiServer) throw new Error('No API server configured for proxy');
  try {
    const proxyRes = await fetch(`${apiServer.replace(/\/$/, '')}/api/github/rest?path=${encodeURIComponent(endpoint)}`, { credentials: 'include' });
    const proxyJson = await proxyRes.json().catch(() => ({}));
    const proxyResOk = typeof proxyRes.ok === 'boolean' ? proxyRes.ok : true;
    const proxyJsonOk = proxyJson && typeof proxyJson.ok === 'boolean' ? proxyJson.ok : true;
    if (!proxyResOk || !proxyJsonOk) {
      throw new Error(proxyJson && proxyJson.error ? JSON.stringify(proxyJson.error) : `GitHub proxy error ${proxyRes.status}`);
    }
    const json = proxyJson.data;
    if (useCache) {
      try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: json })); } catch (e) { }
    }
    return json;
  } catch (e) {
    throw e;
  }
}

// Fetch languages for a single repo: returns an object like {JavaScript: 12345, HTML: 234}
export async function fetchRepoLanguages(owner, repo, opts = {}) {
  try {
    return await fetchGitHub(`/repos/${owner}/${repo}/languages`, opts);
  } catch (e) {
    console.warn(`Failed to fetch languages for ${owner}/${repo}:`, e.message || e);
    return {};
  }
}

// Helper: batch fetch with limited concurrency
export async function batchFetch(items, worker, concurrency = 5) {
  const results = [];
  const executing = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => worker(item));
    results.push(p);

    // push the promise into executing and ensure it is removed when settled
    executing.push(p);
    const remove = () => {
      const idx = executing.indexOf(p);
      if (idx >= 0) executing.splice(idx, 1);
    };
    p.then(remove, remove);

    if (executing.length >= concurrency) {
      // wait for any of the executing promises to settle
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

// GraphQL fetch with caching and rate-limit handling
export async function fetchGraphQL(query, variables = {}, { useCache = true, ttl = 120 } = {}) {
  const token = getToken();
  const key = cacheKeyFor('graphql', query + JSON.stringify(variables));
  if (useCache) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.ts < ttl * 1000) return parsed.data;
      }
    } catch (e) { }
  }

  const apiServer = apiServerBase();

  if (token) {
    const headers = { 'Content-Type': 'application/json', Authorization: `bearer ${token}` };
    const res = await fetch(`${GITHUB_API_URL}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors.map(e => e.message).join(', '));
    if (useCache) {
      try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: json.data })); } catch (e) { }
    }
    return json.data;
  }

  // Proxy GraphQL through server
  if (!apiServer) throw new Error('No API server configured for proxy');
  const proxyRes = await fetch(`${apiServer.replace(/\/$/, '')}/api/github/graphql`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const proxyJson = await proxyRes.json().catch(() => ({}));
  const proxyResOk = typeof proxyRes.ok === 'boolean' ? proxyRes.ok : true;
  const proxyJsonOk = proxyJson && typeof proxyJson.ok === 'boolean' ? proxyJson.ok : true;
  if (!proxyResOk || !proxyJsonOk) throw new Error(proxyJson && proxyJson.error ? JSON.stringify(proxyJson.error) : `GraphQL proxy error ${proxyRes.status}`);
  if (useCache) {
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: proxyJson.data })); } catch (e) { }
  }
  return proxyJson.data;
}

// Fetch all pages for a REST endpoint. If isSearch is true, the response shape is { items: [...] }
export async function fetchAllPagesREST(path, { per_page = 100, maxPages = 10, isSearch = false, concurrency = 3 } = {}) {
  const token = getToken();
  const results = [];

  // build initial url (page=1)
  let pageCount = 0;
  let url = `${GITHUB_API_URL}${path}${path.includes('?') ? '&' : '?'}per_page=${per_page}&page=1`;

  // helper to parse Link header into a map { rel: url }
  function parseLinkHeader(header) {
    if (!header) return {};
    return header.split(',').map(part => part.trim()).reduce((acc, part) => {
      const m = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (m) acc[m[2]] = m[1];
      return acc;
    }, {});
  }

  while (url && pageCount < maxPages) {
    pageCount += 1;

    if (token) {
      const headers = { Accept: 'application/vnd.github.v3+json', Authorization: `token ${token}` };
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn(`fetchAllPagesREST: request failed ${res.status} ${url}`);
        break;
      }
      const json = await res.json();
      const items = isSearch ? (json.items || []) : (Array.isArray(json) ? json : []);
      if (items.length === 0) break;
      results.push(...items);

      if (!isSearch && items.length < per_page) break;

      const link = res.headers.get('link');
      const links = parseLinkHeader(link);
      if (links.next) {
        url = links.next;
        await new Promise(r => setTimeout(r, 200));
        continue;
      }
      break;
    }

    // proxy via server
    const apiServer = apiServerBase();
    if (!apiServer) throw new Error('No API server configured for proxy');
    const pathQuery = url.replace(GITHUB_API_URL, '');
    const proxyRes = await fetch(`${apiServer.replace(/\/$/, '')}/api/github/rest?path=${encodeURIComponent(pathQuery)}`, { credentials: 'include' });
    const proxyJson = await proxyRes.json().catch(() => ({}));
    const proxyResOk = typeof proxyRes.ok === 'boolean' ? proxyRes.ok : true;
    const proxyJsonOk = proxyJson && typeof proxyJson.ok === 'boolean' ? proxyJson.ok : true;
    if (!proxyResOk || !proxyJsonOk) {
      console.warn(`fetchAllPagesREST proxy failed ${proxyRes.status} ${pathQuery}`);
      break;
    }
    const json = proxyJson.data;
    const items = isSearch ? (json.items || []) : (Array.isArray(json) ? json : []);
    if (items.length === 0) break;
    results.push(...items);

    if (!isSearch && items.length < per_page) break;

    const link = (proxyJson.headers && proxyJson.headers.link) || null;
    const links = parseLinkHeader(link);
    if (links.next) {
      url = links.next;
      await new Promise(r => setTimeout(r, 200));
      continue;
    }
    break;
  }

  return results;
}