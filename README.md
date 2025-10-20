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
