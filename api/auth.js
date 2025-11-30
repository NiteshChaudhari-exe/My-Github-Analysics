const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const crypto = require('crypto');

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS configuration
const CLIENT_APP_URL = process.env.CLIENT_APP_URL || 'http://localhost:3000';
app.use(cors({
  origin: [CLIENT_APP_URL, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Data persistence (in Vercel, use /tmp which is writable)
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, '../server/data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
if (!fs.existsSync(DB_FILE)) {
  try { fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2)); } catch (e) {}
}

function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { return { users: {} }; }
}

function writeDb(db) {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch (e) {}
}

// GitHub OAuth endpoints
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

app.get('/auth/github', (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({ ok: false, error: 'GITHUB_CLIENT_ID not configured' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  const scope = 'read:user repo';
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  res.redirect(url);
});

app.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.redirect(`${CLIENT_APP_URL}/login?error=no_code`);
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: OAUTH_REDIRECT_URI
      })
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error('OAuth token error:', tokenData);
      return res.redirect(`${CLIENT_APP_URL}/login?error=${tokenData.error_description}`);
    }

    const accessToken = tokenData.access_token;
    // Set httpOnly cookie
    res.cookie('github_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.redirect(`${CLIENT_APP_URL}/?auth=success`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${CLIENT_APP_URL}/login?error=callback_failed`);
  }
});

app.post('/auth/token/test', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ ok: false, error: 'No token provided' });

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` }
    });

    if (!userRes.ok) {
      return res.json({ ok: false, error: `GitHub API error ${userRes.status}` });
    }

    const user = await userRes.json();
    const scopesRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` }
    });
    const scopes = scopesRes.headers.get('x-oauth-scopes') || '';

    return res.json({ ok: true, user, scopes });
  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});

app.post('/auth/token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ ok: false, error: 'No token provided' });

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` }
    });

    if (!userRes.ok) {
      return res.json({ ok: false, error: `GitHub API error ${userRes.status}` });
    }

    const user = await userRes.json();
    const scopesRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` }
    });
    const scopes = scopesRes.headers.get('x-oauth-scopes') || '';

    res.cookie('github_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    return res.json({ ok: true, user, scopes });
  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('github_token');
  return res.json({ ok: true });
});

// API endpoints
app.get('/api/github/user', async (req, res) => {
  const token = req.cookies.github_token;
  if (!token) return res.json({ ok: false, error: 'No token' });

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` }
    });

    if (!userRes.ok) {
      return res.json({ ok: false, error: 'Invalid token' });
    }

    const user = await userRes.json();
    return res.json({ ok: true, user });
  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});

app.get('/api/github/scopes', async (req, res) => {
  const token = req.cookies.github_token;
  if (!token) return res.json({ ok: false, error: 'No token' });

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` }
    });

    const scopes = userRes.headers.get('x-oauth-scopes') || '';
    return res.json({ ok: true, scopes });
  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});

app.get('/api/github/rest', async (req, res) => {
  const token = req.cookies.github_token;
  const { path: restPath } = req.query;

  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  if (!restPath) return res.status(400).json({ error: 'Missing path parameter' });

  try {
    const apiRes = await fetch(`https://api.github.com${restPath}`, {
      headers: { 'Authorization': `token ${token}` }
    });

    const data = await apiRes.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/github/graphql', async (req, res) => {
  const token = req.cookies.github_token;
  const { query, variables } = req.body;

  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const gqlRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables: variables || {} })
    });

    const data = await gqlRes.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Data management endpoints
app.get('/api/consent', (req, res) => {
  const db = readDb();
  const userConsent = db.users[req.ip] || null;
  res.json({ consent: userConsent });
});

app.post('/api/consent', (req, res) => {
  const { consent } = req.body;
  const db = readDb();
  db.users[req.ip] = consent;
  writeDb(db);
  res.json({ ok: true });
});

app.post('/api/data-request', (req, res) => {
  const db = readDb();
  const userData = db.users[req.ip];
  res.json({ ok: true, data: { id: uuidv4(), consent: userData } });
});

app.delete('/api/data', (req, res) => {
  const db = readDb();
  delete db.users[req.ip];
  writeDb(db);
  res.json({ ok: true });
});

// Export for Vercel
module.exports = app;
