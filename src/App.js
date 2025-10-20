import React, { useState, useEffect, useCallback } from 'react';
import { Activity, GitBranch, Code, TrendingUp, Users, Star, GitCommit, Moon, Coffee, Download, AlertCircle, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { fetchGitHub, fetchRepoLanguages, batchFetch, fetchGraphQL, fetchAllPagesREST, checkRateLimit } from './githubApi';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import RepoSearch, { useRepoFilters } from './components/RepoSearch';
import { exportDataAsJSON, exportDataAsCSV, generateReport } from './utils/export';
import { useGitHubData } from './hooks/useGitHubData';
import TimeSeriesCharts from './components/TimeSeriesCharts';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import RepoList from './components/RepoList';
import RepoModal from './components/RepoModal';
import Heatmap from './components/Heatmap';

// GraphQL helper: use fetchGraphQL from githubApi (cached + rate-limit aware)

const RATE_LIMIT_THRESHOLD = 50; // Warn when fewer than 50 requests remaining

const ErrorNotification = ({ message, onDismiss }) => (
  <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
    <AlertCircle className="w-5 h-5" />
    <p>{message}</p>
    <button onClick={onDismiss} className="ml-2 text-red-700 hover:text-red-900">×</button>
  </div>
);

const EnhancedDeveloperAnalyticsDashboard = () => {
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [animatedStats, setAnimatedStats] = useState({
    commits: 0,
    repos: 0,
    contributions: 0,
    followers: 0,
    pullRequests: 0,
    codeReviews: 0
  });
  const [languageData, setLanguageData] = useState([]);
  const [commitData, setCommitData] = useState([]);
  const [repos, setRepos] = useState([]);
  const [activeRepo, setActiveRepo] = useState(null);
  const [contribDays, setContribDays] = useState([]);
  const [monthlySeries, setMonthlySeries] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  // Repository filtering and sorting
  const {
    filteredRepos,
    languages,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filterLanguage,
    setFilterLanguage
  } = useRepoFilters(repos);

  useEffect(() => {
    async function loadGitHubStats() {
      try {
        // Check rate limit before making requests
        const rateLimit = await checkRateLimit();
        if (rateLimit.remaining < RATE_LIMIT_THRESHOLD) {
          setError(`Warning: ${rateLimit.remaining} API requests remaining. Resets at ${new Date(rateLimit.reset * 1000).toLocaleString()}`);
        }

        // 1. Get user info and repositories (first 50 for demo, increase if needed)
        const user = await fetchGitHub('/user');
        const repos = await fetchGitHub('/user/repos?per_page=100');
        
        // Validate response data
        if (!Array.isArray(repos)) {
          throw new Error('Invalid repository data received from GitHub');
        }
        
        setRepos(repos);
        // Use Promise.all to ensure state is updated before continuing
        await Promise.all([
          new Promise(resolve => setTimeout(resolve, 0)), // Allow state update to complete
          repos
        ]);
        const repoNames = repos.map(r => r.name);

        // 2. Prepare GraphQL query for commit, PR, and review counts
        const repoQueries = repoNames.map(
          (name, i) => `
            repo${i}: repository(owner: "${user.login}", name: "${name}") {
              name
              defaultBranchRef {
                target {
                  ... on Commit {
                    history {
                      totalCount
                    }
                  }
                }
              }
              pullRequests(first: 10, states: [OPEN, CLOSED, MERGED]) {
                totalCount
                nodes {
                  reviews {
                    totalCount
                  }
                }
              }
              primaryLanguage {
                name
              }
            }
          `
        ).join('\n');

        const query = `
          query {
            ${repoQueries}
          }
        `;

  // 3. Fetch stats via GraphQL (cached)
  const data = await fetchGraphQL(query, {}, { useCache: true, ttl: 300 });

        // 4. Aggregate stats (commits, PRs, reviews)
        let totalCommits = 0;
        let totalPRs = 0;
        let totalReviews = 0;

        Object.values(data).forEach(repo => {
          totalCommits += repo.defaultBranchRef?.target?.history?.totalCount || 0;
          totalPRs += repo.pullRequests?.totalCount || 0;
          if (repo.pullRequests?.nodes) {
            totalReviews += repo.pullRequests.nodes.reduce((sum, pr) => sum + (pr.reviews?.totalCount || 0), 0);
          }
        });

        // 5. Fetch languages per repo and aggregate by bytes
        // Build list of owner/repo pairs
        const owner = user.login;
        const repoPairs = repos.map(r => ({ owner, repo: r.name }));

        // Use batchFetch to avoid hammering the API
        const languagesList = await batchFetch(repoPairs, async ({ owner, repo }) => {
          try {
            return await fetchRepoLanguages(owner, repo);
          } catch (e) {
            console.warn('language fetch error', e);
            return {};
          }
        }, 6);

        const langBytes = {};
        languagesList.forEach(langObj => {
          Object.entries(langObj || {}).forEach(([name, bytes]) => {
            langBytes[name] = (langBytes[name] || 0) + bytes;
          });
        });

        const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0) || 1;
        const colorPalette = ['#f7df1e', '#3178c6', '#3776ab', '#61dafb', '#1572b6', '#e34c26', '#563d7c', '#b07219', '#00bcd4', '#ff9800'];
        const langArr = Object.entries(langBytes).map(([name, bytes], i) => ({
          name,
          value: Math.round((bytes / totalBytes) * 100),
          color: colorPalette[i % colorPalette.length]
        })).sort((a, b) => b.value - a.value);

        setLanguageData(langArr);
        setAnimatedStats({
          commits: totalCommits,
          repos: repos.length,
          contributions: user.public_repos + (user.total_private_repos || 0),
          followers: user.followers,
          pullRequests: totalPRs,
          codeReviews: totalReviews
        });
        setCommitData([]);
        // 6. Fetch contributionsCollection for the last year (via GraphQL)
        try {
          const to = new Date();
          const from = new Date();
          from.setFullYear(from.getFullYear() - 1);
          const contribQuery = `
            query { 
              user(login: "${user.login}") {
                contributionsCollection(from: "${from.toISOString()}", to: "${to.toISOString()}") {
                  contributionCalendar {
                    weeks {
                      contributionDays {
                        date
                        contributionCount
                      }
                    }
                  }
                }
              }
            }
          `;
          const contribData = await fetchGraphQL(contribQuery);
          const weeks = contribData.user.contributionsCollection.contributionCalendar.weeks || [];
          const days = [];
          weeks.forEach(w => w.contributionDays.forEach(d => days.push({ date: d.date, count: d.contributionCount })));
          setContribDays(days);

          // 6b. Fetch commit and PR contributions (occurredAt) to separate commits vs PRs per month
          try {
            const detailQuery = `
              query {
                user(login: "${user.login}") {
                  contributionsCollection(from: "${from.toISOString()}", to: "${to.toISOString()}") {
                    commitContributionsByRepository(maxRepositories: 100) {
                      repository { name }
                      contributions(first: 100) { nodes { occurredAt } }
                    }
                    pullRequestContributionsByRepository(maxRepositories: 100) {
                      repository { name }
                      contributions(first: 100) { nodes { occurredAt } }
                    }
                  }
                }
              }
            `;
            const detailData = await fetchGraphQL(detailQuery, {}, { useCache: true, ttl: 300 });
            const coll = detailData.user.contributionsCollection || {};
            const commitBuckets = {};
            const prBuckets = {};

            (coll.commitContributionsByRepository || []).forEach(item => {
              const nodes = item.contributions?.nodes || [];
              nodes.forEach(n => {
                const m = (new Date(n.occurredAt)).toISOString().slice(0,7);
                commitBuckets[m] = (commitBuckets[m] || 0) + 1;
              });
            });

            (coll.pullRequestContributionsByRepository || []).forEach(item => {
              const nodes = item.contributions?.nodes || [];
              nodes.forEach(n => {
                const m = (new Date(n.occurredAt)).toISOString().slice(0,7);
                prBuckets[m] = (prBuckets[m] || 0) + 1;
              });
            });

            // Build months between from and to
            const months = [];
            const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
            while (cursor <= to) {
              const y = cursor.getFullYear();
              const mo = String(cursor.getMonth() + 1).padStart(2, '0');
              months.push(`${y}-${mo}`);
              cursor.setMonth(cursor.getMonth() + 1);
            }

            const series = months.map(m => ({ month: m, commits: commitBuckets[m] || 0, prs: prBuckets[m] || 0 }));
            setMonthlySeries(series);
            // If the series totals seem low compared to contributionCalendar, attempt REST fallback per repo
            const totalFromSeries = series.reduce((s, x) => s + x.commits + x.prs, 0);
            const totalFromCalendar = days.reduce((s, d) => s + (d.count||0), 0);
            if (totalFromSeries < totalFromCalendar * 0.9) {
              // likely truncated; fetch via REST per-repo (may be slow)
              setLoadingDetails(true);
              try {
                const owner = user.login;
                const allCommits = [];
                const allPRs = [];
                setProgress({ completed: 0, total: repos.length * 2 });
                for (let i = 0; i < repos.length; i++) {
                  const r = repos[i];
                  // commits
                  const commits = await fetchAllPagesREST(`/repos/${owner}/${r.name}/commits`, { per_page: 100, maxPages: 5 });
                  allCommits.push(...commits.map(c => c.commit?.author?.date).filter(Boolean));
                  setProgress(p => ({ ...p, completed: p.completed + 1 }));
                  // pulls (state=all)
                  const prs = await fetchAllPagesREST(`/repos/${owner}/${r.name}/pulls?state=all`, { per_page: 100, maxPages: 5 });
                  allPRs.push(...prs.map(pull => pull.created_at).filter(Boolean));
                  setProgress(p => ({ ...p, completed: p.completed + 1 }));
                }

                const commitBuckets = {};
                allCommits.forEach(date => { const m = new Date(date).toISOString().slice(0,7); commitBuckets[m] = (commitBuckets[m] || 0) + 1; });
                const prBuckets = {};
                allPRs.forEach(date => { const m = new Date(date).toISOString().slice(0,7); prBuckets[m] = (prBuckets[m] || 0) + 1; });

                const months = series.map(s => s.month);
                const merged = months.map(m => ({ month: m, commits: commitBuckets[m] || 0, prs: prBuckets[m] || 0 }));
                setMonthlySeries(merged);
              } catch (e) {
                console.warn('REST fallback failed', e);
              } finally {
                setLoadingDetails(false);
                setProgress({ completed: 0, total: 0 });
              }
            }
          } catch (e) {
            console.warn('failed fetching commit/PR contributions detail', e);
            // fallback: derive monthly totals from contributionCalendar
            const monthMap = {};
            days.forEach(d => { const m = d.date.slice(0,7); monthMap[m] = (monthMap[m] || 0) + (d.count||0); });
            const months = Object.keys(monthMap).sort();
            setMonthlySeries(months.map(m => ({ month: m, commits: monthMap[m], prs: 0 })));
          }
        } catch (e) {
          console.warn('contrib fetch failed', e);
        }
        // keep repos state already set earlier
      } catch (e) {
        console.error(e);
      }
    }
    loadGitHubStats();
  }, []);

  // monthlySeries is populated by the detailed GraphQL fetch inside loadGitHubStats

  const exportData = (format) => {
    const data = {
      stats: animatedStats,
      languages: languageData,
      commits: commitData,
      monthlySeries,
      contribDays,
      exportDate: new Date().toISOString()
    };

    switch (format) {
      case 'json':
        exportDataAsJSON(data);
        break;
      case 'csv':
        exportDataAsCSV(data);
        break;
      case 'report':
        generateReport(data);
        break;
      default:
        console.error('Unsupported export format:', format);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-gray-300'} p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:transform hover:scale-105 cursor-pointer`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-r ${color}`}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
      <h3 className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-xs sm:text-sm font-medium mb-1`}>{title}</h3>
      <p className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value?.toLocaleString()}</p>
      {subtitle && <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{subtitle}</p>}
    </div>
  );

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white' : 'bg-gradient-to-br from-gray-50 via-white to-blue-50 text-gray-900'} p-3 sm:p-6`}>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Developer Analytics
              </h1>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm sm:text-lg`}>GitHub-powered insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Only Overview Tab */}
      <div className="flex gap-1 mb-6 sm:mb-8 bg-gray-800/50 p-1 rounded-xl w-full overflow-x-auto backdrop-blur-sm">
        <button
          className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg capitalize font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg`}
        >
          Overview
        </button>
      </div>
      
      {/* Stats Grid */}
  <div className={`${isDarkMode ? 'border-gray-700' : 'border-gray-200'} grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6 border-2 rounded-2xl shadow-sm p-3`}>
          <StatCard icon={GitCommit} title="Total Commits" value={animatedStats.commits} color="from-green-500 to-emerald-600" />
          <StatCard icon={GitBranch} title="Repositories" value={animatedStats.repos} color="from-blue-500 to-cyan-600" />
          <StatCard icon={TrendingUp} title="Contributions" value={animatedStats.contributions} color="from-purple-500 to-pink-600" />
          <StatCard icon={Users} title="Followers" value={animatedStats.followers} color="from-orange-500 to-red-600" />
          <StatCard icon={Star} title="Pull Requests" value={animatedStats.pullRequests} color="from-indigo-500 to-purple-600" />
          <StatCard icon={Code} title="Code Reviews" value={animatedStats.codeReviews} color="from-yellow-500 to-orange-600" />
        </div>


      {/* Overview Content */}
      <div className="space-y-6 sm:space-y-8">
        {/* Repo list + Heatmap (side-by-side on large screens) - now inside a single main container */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-1 h-full">
            <div className="flex flex-col sm:flex-row sm:items-stretch sm:gap-4 h-full">
              {/* RepoList: on small screens place after Heatmap, keep left on large screens */}
             
                <div className={`${isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white/80 border-gray-200'} p-3 sm:p-2 rounded-2xl border-2 shadow-sm h-72`}>
                  <div className="mb-3">
                    <RepoSearch onSearch={term => setSearchTerm(term)} className="mb-2" />
                    <div className="flex gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg px-2 py-1 text-sm`}
                      >
                        <option value="stars">Stars</option>
                        <option value="updated">Recently Updated</option>
                        <option value="name">Name</option>
                      </select>
                      <select
                        value={filterLanguage}
                        onChange={(e) => setFilterLanguage(e.target.value)}
                        className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg px-2 py-1 text-sm`}
                      >
                        <option value="">All Languages</option>
                        {languages.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <RepoList repos={filteredRepos} onOpenRepo={(r) => setActiveRepo(r)} />
                </div>
             
            </div>
          </div>
          <div className="lg:col-span-2 order-first lg:order-last">
            {/* Heatmap moved here from the left column; make it order-first on small screens */}
            <div className={`${isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-white/80 border-gray-200'} p-3 sm:p-4 rounded-2xl border-2 shadow-sm h-72 mb-4`}> 
              <Heatmap daily={contribDays} isDarkMode={isDarkMode} />
            </div>
            {/* Language Pie Chart */}
          </div>
        </main>

        {/* Arrange charts and tech stack side-by-side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border-2 shadow-sm h-full`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Activity</h3>
              <TimeSeriesCharts series={monthlySeries} />
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border-2 shadow-sm h-full`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Code className="w-5 h-5 text-purple-400" />
                Technology Stack
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={languageData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    stroke="none"
                  >
                    {languageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                {languageData.map((lang) => (
                  <div key={lang.name} className={`${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-white/80 border-gray-200'} flex items-center justify-between p-2 rounded-lg border`}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lang.color }}></div>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{lang.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{lang.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* (Duplicate Technology Stack removed; chart is shown above with the repo list) */}

        {/* Export Buttons */}
        <div className="flex items-center gap-4 flex-wrap">
          <button 
            onClick={() => exportData('json')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <FileJson className="w-4 h-4" />
            Export JSON
          </button>
          <button 
            onClick={() => exportData('csv')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
          <button 
            onClick={() => exportData('report')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generate Report
          </button>
        </div>
        {loadingDetails && (
          <div className="mt-3 w-full">
            <div className="text-sm text-gray-300">Fetching detailed history... ({progress.completed}/{progress.total})</div>
            <div className="w-full bg-gray-700 rounded h-2 mt-1">
              <div className="bg-green-500 h-2 rounded" style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}
        {activeRepo && <RepoModal repo={activeRepo} onClose={() => setActiveRepo(null)} />}
      </div>
    </div>
      {error && <ErrorNotification message={error} onDismiss={() => setError(null)} />}
    </ErrorBoundary>
  );
};

export default EnhancedDeveloperAnalyticsDashboard;