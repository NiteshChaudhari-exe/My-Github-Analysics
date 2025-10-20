const GITHUB_API_URL = 'https://api.github.com';
const RATE_LIMIT_THRESHOLD = 50; // Warn when fewer than 50 requests remaining

function cacheKeyFor(prefix, key) {
  return `gh_cache:${prefix}:${btoa(unescape(encodeURIComponent(key))).slice(0, 120)}`;
}

async function validateGitHubToken() {
  const token = process.env.REACT_APP_GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token not found. Please set REACT_APP_GITHUB_TOKEN environment variable.');
  }
  return token;
}

export async function checkRateLimit() {
  const token = await validateGitHubToken();
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
  const token = process.env.REACT_APP_GITHUB_TOKEN;
  const url = `${GITHUB_API_URL}${endpoint}`;

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

  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  const json = await handleResponse(res);

  if (useCache) {
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: json })); } catch (e) { }
  }
  return json;
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
  const token = process.env.REACT_APP_GITHUB_TOKEN;
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

  const res = await fetch(`${GITHUB_API_URL}/graphql`, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    // Check rate limit info in headers isn't available here, but surface errors
    throw new Error(json.errors.map(e => e.message).join(', '));
  }

  if (useCache) {
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: json.data })); } catch (e) { }
  }
  return json.data;
}

// Fetch all pages for a REST endpoint. If isSearch is true, the response shape is { items: [...] }
export async function fetchAllPagesREST(path, { per_page = 100, maxPages = 10, isSearch = false, concurrency = 3 } = {}) {
  const token = process.env.REACT_APP_GITHUB_TOKEN;
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
    const res = await fetch(url, { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } });
    if (!res.ok) {
      console.warn(`fetchAllPagesREST: request failed ${res.status} ${url}`);
      break;
    }

    const json = await res.json();
    const items = isSearch ? (json.items || []) : (Array.isArray(json) ? json : []);
    if (items.length === 0) break;
    results.push(...items);

    // stop if fewer than per_page returned (last page)
    if (!isSearch && items.length < per_page) break;

    // inspect Link header for next page
    const link = res.headers.get('link');
    const links = parseLinkHeader(link);
    if (links.next) {
      url = links.next;
      // small throttle to avoid hitting rate limits
      await new Promise(r => setTimeout(r, 200));
    } else {
      break;
    }
  }

  return results;
}