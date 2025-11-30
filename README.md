# GitHub Analytics Dashboard

A modern, visually-rich dashboard for developers to analyze GitHub activity, repositories, language usage, and contributions. Built with React, Tailwind CSS and Recharts, this app fetches data from the GitHub REST and GraphQL APIs and provides charts, heatmaps and exports.

---

## Quick status (as of this edit)

- The app compiles but there were several recent edits to improve error handling and exports.
- You'll need a GitHub personal access token in `REACT_APP_GITHUB_TOKEN` to fetch private/owner data and avoid anonymous rate limits.
- We added export helpers that require `file-saver` and `jszip` — these were installed with npm in this workspace.

---

## Features

- Overview tiles (commits, repos, contributions, followers, PRs, code reviews)
- Contribution heatmap (last 12 months)
- Language breakdown (pie chart)
- Monthly activity timeseries
- Repository list with search/sort
- Export: JSON / CSV (zipped) / Markdown report
- Dark / Light theme toggle

---

## Prerequisites

- Node.js 18+ (or recent LTS)
- npm
- A GitHub Personal Access Token (PAT) with at least the following scopes when fetching private data: `repo`, `read:user`. For public-only data you may omit `repo` but will be subject to public rate limits.

How to create a token:
- Visit https://github.com/settings/tokens
- Click "Generate new token (classic)" or a fine-grained token and grant the necessary scopes.

---

## Setup

1. Install dependencies

```powershell
npm install
```

2. Create `.env` in the project root and add your token:

```text
REACT_APP_GITHUB_TOKEN=your_personal_access_token_here
```

3. Start the dev server

```powershell
npm start
```

Open http://localhost:3000 in your browser.

---

## Available scripts

- `npm start` — start the dev server (uses `react-scripts start`)
- `npm run build` — build production assets
- `npm test` — run tests

## Analytics & Consent

This project includes a small, consent-aware analytics wrapper and a consent banner component that prevents analytics from running until a user explicitly Accepts.

- Consent storage key: `analytics.consent` in `localStorage` (`'true'` or `'false'`).
- Analytics wrapper: `src/utils/analytics.js` — exposes `enable`, `disable`, `trackEvent`, `pageview`, `consentGiven`, and `setConsent`.
- Consent banner: `src/components/ConsentBanner.js` — simple Accept / Decline UI. On Accept it calls `analytics.setConsent(true)`.

Wiring a real provider (Google Analytics gtag):

1. Add your Measurement ID to environment variables, e.g. in PowerShell before starting:

```powershell
$env:REACT_APP_GA_MEASUREMENT_ID='G-XXXXXXXX'; npm start
```

2. Update `ConsentBanner` to call `analytics.enable({ ga: process.env.REACT_APP_GA_MEASUREMENT_ID })` when the user accepts (I can do this change for you).

How to verify locally:

1. Start the app with `npm start`.
2. Without accepting the banner, open DevTools -> Network/Console and confirm there are no `gtag` network requests and no analytics logs.
3. Accept the banner and click a repo — the wrapper logs an analytics event in the console (`[analytics] event repo_open { repo: ..., id: ... }`).

If you'd like, I can automatically enable GA on Accept using the `REACT_APP_GA_MEASUREMENT_ID` env var and add a CI-safe way to publish source maps or configure a real analytics provider.

## Server-side consent and Manage Data

This project includes a small demo server that provides server-side consent storage and simple data export/delete endpoints.

- Start the server (after installing dependencies):

```powershell
npm install
npm run start:server
```

- Endpoints:
   - `GET /api/consent` — returns the consent record for the current anonymous cookie id.
   - `POST /api/consent` — body: `{ "consent": true|false }` to set server-side consent for the current cookie id.
   - `POST /api/data-request` — returns a JSON export of stored data for the current cookie id (demo only).
   - `DELETE /api/data` — deletes stored data for the current cookie id (GDPR demo).

The client `Privacy` popover includes a "Manage data on server" link which opens a small modal that calls these endpoints (export/delete).


---

## Troubleshooting

If the app doesn't show GitHub data, check the following in order:

1. Token missing or invalid
   - Make sure `REACT_APP_GITHUB_TOKEN` is set in `.env` and the terminal session was restarted after editing `.env`.
   - Inspect browser console/network tab for 401/403 errors.

2. Rate limits
   - If you see messages about rate limits, your token may be exhausted. The app warns when remaining requests are low. You can:
     - Wait until the rate limit resets (the app prints reset times when possible), or
     - Use a different token, or
     - Reduce the number of API calls (limit repo count, reduce pages fetched).

3. Missing node packages
   - If you get build errors like `Can't resolve 'file-saver'` or `Can't resolve 'jszip'`, run:

```powershell
npm install file-saver jszip
```

4. LocalStorage / cache issues
   - The app uses `localStorage` to cache GraphQL and REST responses. If storage is full or broken, clear the site data in your browser and reload.

5. Long running fetches
   - Some operations (per-repo REST fallbacks) can be slow for users with many repos. The UI shows a progress bar during those operations.

6. Console errors
   - Open DevTools (F12) and check the Console and Network tabs. Most API or JSON parse errors are visible there and indicate which request failed.

---

## OAuth (httpOnly cookie server flow)

This project now supports a server-side GitHub OAuth flow that stores the access token in an httpOnly cookie (the SPA never writes the token to localStorage). Use this flow to avoid exposing tokens to JavaScript in the browser.

1. Register an OAuth App on GitHub: https://github.com/settings/developers -> OAuth Apps
   - Set the Authorization callback URL to `http://localhost:4000/auth/github/callback` (or your `OAUTH_REDIRECT_URI`).

2. Copy `.env.example` to `.env` (or set the environment variables) and fill in values:

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
CLIENT_APP_URL=http://localhost:3000
OAUTH_REDIRECT_URI=http://localhost:4000/auth/github/callback
```

3. Start the server (in a separate terminal):

```powershell
npm run start:server
```

4. Start the client app and open the Login page. Click "Login with GitHub (OAuth)" and complete the GitHub authorize flow. After successful auth the server will set an httpOnly cookie and redirect back to the client.

5. The Login UI also supports entering a Personal Access Token (PAT) directly — but when you save a token via the UI it will be POSTed to the server and stored in an httpOnly cookie (the SPA will not keep the token in localStorage).

Token scopes
- The server requests the following scopes by default when initiating OAuth: `read:user repo` (see `server/index.js` -> the `scope` param in `/auth/github`).
- If you need finer-grained scopes, edit `server/index.js` and change the `scope` string for the `/auth/github` redirect.
- The Login UI shows the token's effective scopes (returned by GitHub as `x-oauth-scopes`) after validation.

Security notes
- The server stores the access token in an httpOnly cookie (`github_token`) to reduce exposure to XSS.
- For production, set the cookie `secure: true` and consider SameSite policies, CSRF protections, and session management. You may also consider server-side session storage or a token store rather than cookies if you need token revocation or multi-server setups.


## Code structure (important files)

- `src/App.js` — main dashboard component and orchestration
- `src/githubApi.js` — REST/GraphQL helpers, caching, rate-limit checks
- `src/components/RepoList.js` — repository list, search & sort
- `src/components/Heatmap.js` — contribution heatmap
- `src/components/TimeSeriesCharts.js` — monthly charts
- `src/utils/export.js` — export helpers (JSON/CSV/zip/report)
- `src/hooks/useGitHubData.js` — custom hooks for fetching and caching

---

## Next steps & recommendations

If you want to make this project production-ready or more robust, consider:

- Adding tests for the aggregation and export utilities (there are some tests already under `src/__tests__`)
- Converting code to TypeScript (better type safety for API payloads)
- Improving GraphQL pagination and splitting repo queries to avoid complexity limits
- Implementing virtualization for the repo list if you have hundreds of repos
- Adding a lightweight backend proxy to avoid exposing tokens in the frontend in production

---
