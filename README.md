# 📊 GitHub Analytics Dashboard

A modern, feature-rich dashboard for developers to analyze GitHub activity, repositories, language usage, and contributions over time. Built with **React**, **Tailwind CSS**, and **Recharts**, this app fetches data from GitHub's REST and GraphQL APIs and provides interactive visualizations, export functionality, and privacy-focused data management.

**Live Demo**: [Deploy to Vercel](https://my-github-analysics.vercel.app/)  
**GitHub Repo**: https://github.com/NiteshChaudhari-exe/My-Github-Analysics

---

## 🎯 Features

### Dashboard Analytics
- **Overview Stats**: Total commits, repositories, contributions, followers, pull requests, code reviews
- **Contribution Heatmap**: 12-month activity visualization with compact/label toggles
- **Language Breakdown**: Pie chart showing language distribution across all repos
- **Monthly Activity**: Time-series chart tracking commits and PRs by month
- **Repository List**: Searchable, sortable repositories with star counts and languages
- **Repository Details**: Modal view with detailed repo information

### Authentication
- **OAuth Login**: Secure GitHub OAuth flow with httpOnly cookie storage
- **Personal Access Token**: Direct token entry for quick testing
- **Auto-Detection**: Detects existing server-side authentication on load
- **Scope Display**: Shows requested permissions before OAuth authorization
- **Loading States**: Clear feedback during authentication processes

### Data Management (GDPR-Compliant)
- **Consent Banner**: User opt-in for analytics before data collection
- **Data Export**: Download personal data as JSON
- **Data Deletion**: Request right to be forgotten (GDPR compliance)
- **Server-Side Storage**: Consent records stored securely server-side
- **Privacy Preferences**: User control over analytics and data usage

### Developer Experience
- **Dark/Light Theme**: Toggle between theme preferences
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Error Handling**: User-friendly error messages with troubleshooting hints
- **Caching**: GraphQL and REST responses cached to reduce API calls
- **Rate Limit Warnings**: Alert when approaching GitHub API limits
- **Export Formats**: JSON, CSV (zipped), and markdown reports

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (or recent LTS)
- **npm** 8+
- **GitHub Account** (for authentication)

### Installation

```bash
# Clone the repository
git clone https://github.com/NiteshChaudhari-exe/My-Github-Analysics.git
cd My-Github-Analysics

# Install dependencies
npm install

# Install additional peer dependencies
npm install file-saver jszip
```

### Local Development

```bash
# Terminal 1: Start React client (port 3000)
npm start

# Terminal 2: Start Express server (port 4000)
npm run start:server
```

Then open http://localhost:3000 in your browser.

### Environment Setup

Create a `.env` file in the project root (copy from `.env.example`):

```env
# GitHub OAuth (register at https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# URLs
CLIENT_APP_URL=http://localhost:3000
OAUTH_REDIRECT_URI=http://localhost:4000/auth/github/callback
REACT_APP_API_SERVER=http://localhost:4000

# Optional: Google Analytics (for consent demo)
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXX
```

**Note**: Never commit `.env` file to version control. Use `.env.example` as a template.

---

## 📖 Usage Guide

### Login Methods

#### 1. OAuth (Recommended for Production)

1. Click **"Login with GitHub (OAuth)"**
2. (Optional) Click **"Show OAuth scopes"** to preview permissions
3. Authorize the app on GitHub
4. Automatically redirected to dashboard

✅ **Benefits**: Secure, no token management, temporary access

#### 2. Personal Access Token (Quick Testing)

1. Enter GitHub token in the input field
2. Click **"Test token"** to verify
3. Click **"Save token"** to authenticate
4. Access dashboard

⚠️ **Note**: Token stored in secure httpOnly cookie server-side, not in browser

### Dashboard Navigation

- **Overview Tab**: High-level statistics and charts
- **Repositories Tab**: Browse and search your repositories
- **Privacy Button**: Manage consent and data
- **Dark/Light Toggle**: Theme preference
- **Login/Logout**: Authentication controls

### Data Management

1. Click **"Privacy"** button in header
2. Select **"Manage data on server"**
3. Options:
   - **Request export**: Download JSON of stored data
   - **Delete my data**: Remove all stored records (GDPR)
   - **Close**: Return to app

---

## 🔐 Authentication

### How It Works

```
┌─────────┐         ┌──────────┐         ┌────────┐
│  Client │◄────────│  Server  │────────►│ GitHub │
└─────────┘         └──────────┘         └────────┘
    │                    │                    │
    │ Click OAuth        │ Redirect to Auth   │
    ├───────────────────►├───────────────────►│
    │                    │                    │
    │                    │◄─ User Authorizes ─┤
    │                    │                    │
    │                    │ Exchange Code      │
    │                    ├───────────────────►│
    │                    │◄─ Get Token ───────┤
    │                    │                    │
    │◄─ Redirect + Cookie ─┤                  │
    │                    │ Set httpOnly Cookie
    │
    ├─ API calls with credentials: 'include'
    │ (Sends httpOnly cookie automatically)
    │
```

### Token Storage

- **Server-Side httpOnly Cookie**: Secure, HttpOnly flag prevents JavaScript access
- **Never in localStorage**: Reduces XSS vulnerability surface
- **Auto-Sent with Requests**: Cookie included automatically with `credentials: 'include'`

### Scopes Requested

- `read:user`: Public profile information
- `repo`: Repository access (public and private)

---

## 📁 Project Structure

```
My-Github-Analysics/
├── src/
│   ├── App.js                          # Main app & routing
│   ├── githubApi.js                    # API helpers (REST/GraphQL + proxy)
│   ├── index.css                       # Global styles
│   ├── components/
│   │   ├── Login.js                    # OAuth & PAT login
│   │   ├── ManageData.js               # GDPR data management modal
│   │   ├── PrivacyPreferences.js       # Privacy settings popover
│   │   ├── ConsentBanner.js            # Analytics consent banner
│   │   ├── RepoList.js                 # Repository list with search/sort
│   │   ├── RepoModal.js                # Repository details modal
│   │   ├── RepoSearch.js               # Search & filter controls
│   │   ├── Heatmap.js                  # Contribution heatmap
│   │   ├── TimeSeriesCharts.js         # Monthly activity charts
│   │   ├── LoadingSpinner.js           # Loading indicator
│   │   ├── ErrorBoundary.js            # Error boundary component
│   │   └── __tests__/                  # Component tests
│   ├── utils/
│   │   ├── analytics.js                # Consent-aware analytics wrapper
│   │   ├── export.js                   # Export helpers (JSON/CSV/zip)
│   │   ├── aggregate.js                # Data aggregation utilities
│   │   ├── heatmap.js                  # Heatmap calculations
│   │   └── __tests__/                  # Utility tests
│   ├── hooks/
│   │   └── useGitHubData.js            # Custom hook for data fetching
│   └── __tests__/
│       ├── aggregate.test.js
│       ├── analytics.test.js
│       └── fetchGraphQL.test.js
├── server/
│   ├── index.js                        # Express server with OAuth + proxies
│   └── data/
│       └── db.json                     # Local data storage (demo)
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── package.json                        # Dependencies & scripts
├── .env.example                        # Environment variables template
├── tailwind.config.js                  # Tailwind CSS config
├── postcss.config.js                   # PostCSS config
└── README.md                           # This file
```

---

## 🛠️ Available Scripts

```bash
# Development
npm start              # Start React dev server (port 3000)
npm run start:server   # Start Express server (port 4000)

# Testing
npm test               # Run test suite in watch mode
npm run test:ci        # Run tests once (CI mode)

# Production
npm run build          # Create optimized build in ./build/
npm run eject          # Eject from Create React App (irreversible)
```

---

## 🔗 API Reference

### Client-Side (GraphQL & REST via `src/githubApi.js`)

```javascript
// REST API call (with client token or via server proxy)
const data = await fetchGitHub('/user/repos?per_page=100');

// GraphQL query (with caching)
const result = await fetchGraphQL(query, variables, { useCache: true, ttl: 300 });

// Paginated REST (auto-handles pagination)
const allRepos = await fetchAllPagesREST('/user/repos', { per_page: 100, maxPages: 10 });

// Check rate limit
const limits = await checkRateLimit();
```

### Server-Side Endpoints (Express in `server/index.js`)

```bash
# Authentication
GET  /auth/github                    # Start OAuth flow
GET  /auth/github/callback           # OAuth callback (auto-redirects)
POST /auth/token/test                # Test PAT without saving
POST /auth/token                     # Save PAT to httpOnly cookie
POST /auth/logout                    # Clear authentication

# GitHub API Proxies
GET  /api/github/user                # Get authenticated user
GET  /api/github/scopes              # Get token scopes
GET  /api/github/rest?path=/user/repos  # Generic REST proxy
POST /api/github/graphql             # GraphQL proxy

# Data Management
GET  /api/consent                    # Get consent record
POST /api/consent                    # Set consent preference
POST /api/data-request               # Export user data
DELETE /api/data                     # Delete user data
```

---

## 🧪 Testing

```bash
# Run all tests (watch mode)
npm test

# Run specific test file
npm test Login.test.js

# Run with coverage
npm test -- --coverage

# Run in CI mode (single run)
CI=true npm test -- --watchAll=false
```

**Test Coverage:**
- ✅ Login component (OAuth/PAT flow)
- ✅ Data management (export/delete)
- ✅ API helpers (REST/GraphQL)
- ✅ Analytics wrapper
- ✅ Export utilities
- ✅ Charts and visualizations

---

## 📤 Deployment to Vercel

### Prerequisites

- Vercel account (free at https://vercel.com)
- GitHub OAuth App credentials

### Step-by-Step

1. **Create GitHub OAuth App**
   - Visit: https://github.com/settings/developers
   - New OAuth App → Fill in details
   - Save Client ID and Client Secret

2. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```
   Or use the Vercel Dashboard → Import Git Repository

3. **Set Environment Variables** (in Vercel Dashboard)
   ```
   GITHUB_CLIENT_ID=<from OAuth app>
   GITHUB_CLIENT_SECRET=<from OAuth app>
   CLIENT_APP_URL=https://<your-vercel-url>.vercel.app
   OAUTH_REDIRECT_URI=https://<your-vercel-url>.vercel.app/auth/github/callback
   REACT_APP_API_SERVER=https://<your-vercel-url>.vercel.app
   ```

4. **Update GitHub OAuth App**
   - Homepage URL: `https://<your-vercel-url>.vercel.app`
   - Authorization callback URL: `https://<your-vercel-url>.vercel.app/auth/github/callback`

5. **Redeploy**
   - Vercel will auto-redeploy after env vars are set

---

## 🐛 Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| **Login shows "Failed to fetch"** | Server not running | Run `npm run start:server` in separate terminal |
| **OAuth redirect fails** | Callback URL mismatch | Verify URL in GitHub OAuth app settings matches exactly |
| **No data shows after login** | Invalid token scopes | Check token has `read:user` and `repo` scopes |
| **"Rate limit exceeded"** | GitHub API limit hit | Wait for reset or use different token |
| **Build fails on Vercel** | Missing dependencies | Run `npm install` locally; commit `package-lock.json` |
| **Dark mode not persisting** | localStorage disabled | Enable localStorage in browser settings |
| **Heatmap not loading** | GraphQL error | Check browser console for API errors; verify token |

### Debug Tips

```javascript
// Check localStorage
console.log(localStorage.getItem('github.token'));
console.log(localStorage.getItem('analytics.consent'));

// Verify server reachability
fetch('http://localhost:4000/api/github/user', { credentials: 'include' })

// Check API rate limit
fetch('https://api.github.com/rate_limit', {
  headers: { Authorization: 'token YOUR_TOKEN' }
}).then(r => r.json()).then(console.log);
```

---

## 🔒 Security

### Best Practices Implemented

✅ **httpOnly Cookies**: Token stored server-side, not in JavaScript  
✅ **CORS Configuration**: Only allows requests from configured origin  
✅ **State Validation**: CSRF protection using state tokens  
✅ **Consent Management**: GDPR-compliant data handling  
✅ **Error Handling**: No sensitive data in error messages  

### Production Recommendations

- [ ] Set `secure: true` on cookies (HTTPS only)
- [ ] Implement CSRF tokens for state-changing operations
- [ ] Add rate limiting to server endpoints
- [ ] Use environment-specific configurations
- [ ] Implement logging and monitoring
- [ ] Add API request signing or JWTs
- [ ] Consider server-side session storage instead of cookies
- [ ] Regularly rotate OAuth app secrets

---

## 📝 Analytics & Consent

The app includes a consent-first analytics system:

1. **Consent Banner** appears on first visit
2. **User selects** Accept/Decline
3. **Stored in localStorage** and server (if opted in)
4. **Analytics only tracks** after explicit consent

### Privacy Features

- 🔒 Server-side consent storage
- 📊 Consent records exportable
- 🗑️ Data fully deletable (GDPR)
- 🎯 No tracking without consent
- 📱 Device-specific consent (anon ID cookies)

---

## 🚀 Advanced Configuration

### Google Analytics Integration

```javascript
// In src/components/ConsentBanner.js
if (consent) {
  analytics.enable({
    ga: process.env.REACT_APP_GA_MEASUREMENT_ID
  });
}
```

### Custom API Server

```env
# Point to custom API server instead of default
REACT_APP_API_SERVER=https://api.your-domain.com
```

### OAuth Scope Customization

Edit `server/index.js` line 47:

```javascript
scope: 'read:user repo admin:repo_hook', // Add or remove scopes
```

---

## 📚 Resources

- [GitHub REST API Docs](https://docs.github.com/en/rest)
- [GitHub GraphQL API Docs](https://docs.github.com/en/graphql)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙋 Support

For issues, questions, or suggestions:

- **GitHub Issues**: https://github.com/NiteshChaudhari-exe/My-Github-Analysics/issues
- **Documentation**: See inline code comments and component JSDoc
- **Local Testing**: Follow the Quick Start section above

---

**Built with ❤️ by developers, for developers**
