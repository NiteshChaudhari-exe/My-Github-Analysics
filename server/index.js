const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));

function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { return { users: {} }; }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const app = express();
app.use(express.json());
app.use(cookieParser());
// Allow client origin from env or default to localhost:3000
const CLIENT_APP_URL = process.env.CLIENT_APP_URL || 'http://localhost:3000';
app.use(cors({ origin: [CLIENT_APP_URL], credentials: true }));

const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

// GitHub OAuth configuration - provide these via environment variables in development
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || `http://localhost:${PORT}/auth/github/callback`;

function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

// Start OAuth by redirecting to GitHub
app.get('/auth/github', (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).send('OAuth not configured on server. Set GITHUB_CLIENT_ID.');
  }
  const state = generateState();
  // store state in cookie to verify on callback
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'Lax' });

  const params = querystring.stringify({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: 'read:user repo',
    state,
    allow_signup: true,
  });
  const url = `https://github.com/login/oauth/authorize?${params}`;
  return res.redirect(url);
});

// Exchange code for access token and return a small HTML page that stores token in localStorage and redirects to the client app
// Callback: exchange code for access token, store token in an httpOnly cookie and redirect to client
app.get('/auth/github/callback', (req, res) => {
  const { code, state } = req.query;
  const saved = req.cookies && req.cookies.oauth_state;
  if (!code) return res.status(400).send('Missing code');
  if (!state || !saved || state !== saved) return res.status(400).send('Invalid state');
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) return res.status(500).send('OAuth not configured on server. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.');

  // exchange code for token
  const postData = querystring.stringify({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: OAUTH_REDIRECT_URI,
    state,
  });

  const options = {
    hostname: 'github.com',
    path: '/login/oauth/access_token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'Accept': 'application/json',
    },
  };

  const ghReq = https.request(options, (ghRes) => {
    let body = '';
    ghRes.on('data', (chunk) => { body += chunk.toString(); });
    ghRes.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const token = parsed && parsed.access_token;
        if (!token) {
          return res.status(500).send('Failed to obtain access token from GitHub');
        }

        // Clear the oauth_state cookie
        res.clearCookie('oauth_state');

        // Set httpOnly cookie with token. In production, set `secure: true` and consider SameSite settings.
        res.cookie('github_token', token, { httpOnly: true, sameSite: 'Lax' });

        const clientUrl = process.env.CLIENT_APP_URL || 'http://localhost:3000';
        return res.redirect(clientUrl + '?auth=success');
      } catch (e) {
        return res.status(500).send('Error parsing GitHub response');
      }
    });
  });

  ghReq.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Error requesting token from GitHub', err);
    return res.status(500).send('Error exchanging code for token');
  });

  ghReq.write(postData);
  ghReq.end();
});

// assign anon id cookie
app.use((req, res, next) => {
  if (!req.cookies || !req.cookies.anon_id) {
    const id = uuidv4();
    res.cookie('anon_id', id, { httpOnly: true, sameSite: 'Lax' });
    req.cookies = Object.assign({}, req.cookies, { anon_id: id });
  }
  next();
});

app.get('/api/consent', (req, res) => {
  const db = readDb();
  const id = req.cookies.anon_id || 'anonymous';
  const record = db.users[id] && db.users[id].consent ? db.users[id].consent : { consent: null };
  res.json({ id, consent: record });
});

app.post('/api/consent', (req, res) => {
  const { consent } = req.body;
  const db = readDb();
  const id = req.cookies.anon_id || 'anonymous';
  db.users[id] = db.users[id] || {};
  db.users[id].consent = { consent: !!consent, updatedAt: new Date().toISOString() };
  writeDb(db);
  res.json({ ok: true, id, consent: db.users[id].consent });
});

// Return user data export (demo: only consent record)
app.post('/api/data-request', (req, res) => {
  const db = readDb();
  const id = req.cookies.anon_id || 'anonymous';
  const user = db.users[id] || {};
  const exportData = { id, consent: user.consent || null, createdAt: new Date().toISOString() };
  res.json({ ok: true, data: exportData });
});

// Delete user data (GDPR right to be forgotten) - demo deletes consent and user record
app.delete('/api/data', (req, res) => {
  const db = readDb();
  const id = req.cookies.anon_id || 'anonymous';
  if (db.users[id]) delete db.users[id];
  writeDb(db);
  res.json({ ok: true, id });
});

// Helper to call GitHub REST API with a token
function callGitHubREST(path, token, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'User-Agent': 'My-Github-Analysics',
        'Accept': 'application/vnd.github.v3+json',
      },
    };
    if (token) options.headers.Authorization = `token ${token}`;
    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const ghReq = https.request(options, (ghRes) => {
      let body = '';
      ghRes.on('data', (chunk) => { body += chunk.toString(); });
      ghRes.on('end', () => {
        const headers = ghRes.headers || {};
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
        if (ghRes.statusCode >= 400) return reject({ status: ghRes.statusCode, body: parsed, headers });
        return resolve({ data: parsed, headers });
      });
    });
    ghReq.on('error', (err) => reject(err));
    if (data) ghReq.write(data);
    ghReq.end();
  });
}

// Validate a token without storing it
app.post('/auth/token/test', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const { data, headers } = await callGitHubREST('/user', token);
    const scopes = headers['x-oauth-scopes'] || headers['x-oauth-scopes'.toLowerCase()] || '';
    return res.json({ ok: true, user: data, scopes });
  } catch (e) {
    return res.status(401).json({ ok: false, error: e && e.body ? e.body : String(e) });
  }
});

// Store token in httpOnly cookie after validating it
app.post('/auth/token', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const { data, headers } = await callGitHubREST('/user', token);
    const scopes = headers['x-oauth-scopes'] || headers['x-oauth-scopes'.toLowerCase()] || '';
    // Set httpOnly cookie. In production set secure: true
    res.cookie('github_token', token, { httpOnly: true, sameSite: 'Lax' });
    return res.json({ ok: true, user: data, scopes });
  } catch (e) {
    return res.status(401).json({ ok: false, error: e && e.body ? e.body : String(e) });
  }
});

// Logout / clear token
app.post('/auth/logout', (req, res) => {
  res.clearCookie('github_token');
  res.json({ ok: true });
});

// Proxy endpoint: return authenticated user using server-stored token
app.get('/api/github/user', async (req, res) => {
  const token = req.cookies && req.cookies.github_token;
  if (!token) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  try {
    const { data } = await callGitHubREST('/user', token);
    res.json({ ok: true, user: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e && e.body ? e.body : String(e) });
  }
});

// Proxy endpoint: return token scopes (read from GitHub response headers)
app.get('/api/github/scopes', async (req, res) => {
  const token = req.cookies && req.cookies.github_token;
  if (!token) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  try {
    const { headers } = await callGitHubREST('/user', token);
    const scopes = headers['x-oauth-scopes'] || '';
    res.json({ ok: true, scopes });
  } catch (e) {
    res.status(500).json({ ok: false, error: e && e.body ? e.body : String(e) });
  }
});

// Generic REST proxy: /api/github/rest?path=/user/repos?per_page=100
app.get('/api/github/rest', async (req, res) => {
  const token = req.cookies && req.cookies.github_token;
  const path = req.query.path;
  if (!path || !path.startsWith('/')) return res.status(400).json({ ok: false, error: 'Invalid path' });
  try {
    const { data, headers } = await callGitHubREST(path, token);
    res.set('x-github-proxy', '1');
    return res.json({ ok: true, data, headers });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.body ? e.body : String(e) });
  }
});

// GraphQL proxy: POST /api/github/graphql { query, variables }
app.post('/api/github/graphql', express.json(), async (req, res) => {
  const token = req.cookies && req.cookies.github_token;
  const { query, variables } = req.body || {};
  if (!query) return res.status(400).json({ ok: false, error: 'Missing query' });
  try {
    // call GitHub GraphQL API
    const options = {
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'My-Github-Analysics'
      }
    };
    if (token) options.headers.Authorization = `bearer ${token}`;

    const postData = JSON.stringify({ query, variables });

    const ghReq = https.request(options, (ghRes) => {
      let body = '';
      ghRes.on('data', (chunk) => { body += chunk.toString(); });
      ghRes.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.errors) return res.status(500).json({ ok: false, error: parsed.errors });
          return res.json({ ok: true, data: parsed.data });
        } catch (e) {
          return res.status(500).json({ ok: false, error: 'Invalid response from GitHub' });
        }
      });
    });
    ghReq.on('error', (err) => {
      return res.status(500).json({ ok: false, error: String(err) });
    });
    ghReq.write(postData);
    ghReq.end();
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Consent server listening on http://localhost:${PORT}`);
});
