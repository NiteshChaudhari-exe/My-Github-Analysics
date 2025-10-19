import React, { useState, useEffect } from 'react';
import { Activity, GitBranch, Code, TrendingUp, Users, Star, GitCommit, Moon, Coffee, Download } from 'lucide-react';
import { fetchGitHub, fetchRepoLanguages, batchFetch } from './githubApi';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import RepoList from './components/RepoList';
import RepoModal from './components/RepoModal';

// Helper for GraphQL queries
async function fetchGitHubGraphQL(query, variables = {}) {
  const token = process.env.REACT_APP_GITHUB_TOKEN;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join(', '));
  return json.data;
}

const EnhancedDeveloperAnalyticsDashboard = () => {
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

  useEffect(() => {
    async function loadGitHubStats() {
      try {
        // 1. Get user info and repositories (first 50 for demo, increase if needed)
        const user = await fetchGitHub('/user');
  const repos = await fetchGitHub('/user/repos?per_page=100');
  setRepos(repos);
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

        // 3. Fetch stats via GraphQL
        const data = await fetchGitHubGraphQL(query);

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
        // keep repos state already set earlier
      } catch (e) {
        console.error(e);
      }
    }
    loadGitHubStats();
  }, []);

  const exportData = (format) => {
    const data = {
      stats: animatedStats,
      languages: languageData,
      commits: commitData,
      exportDate: new Date().toISOString()
    };
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `developer-analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
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

      {/* Overview Content */}
      <div className="space-y-6 sm:space-y-8">
        {/* Repo list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <RepoList repos={repos} onOpenRepo={(r) => setActiveRepo(r)} />
          </div>
          <div className="lg:col-span-2">
            {/* Language Pie Chart */}
            
          </div>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
          <StatCard icon={GitCommit} title="Total Commits" value={animatedStats.commits} color="from-green-500 to-emerald-600" />
          <StatCard icon={GitBranch} title="Repositories" value={animatedStats.repos} color="from-blue-500 to-cyan-600" />
          <StatCard icon={TrendingUp} title="Contributions" value={animatedStats.contributions} color="from-purple-500 to-pink-600" />
          <StatCard icon={Users} title="Followers" value={animatedStats.followers} color="from-orange-500 to-red-600" />
          <StatCard icon={Star} title="Pull Requests" value={animatedStats.pullRequests} color="from-indigo-500 to-purple-600" />
          <StatCard icon={Code} title="Code Reviews" value={animatedStats.codeReviews} color="from-yellow-500 to-orange-600" />
        </div>

        <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border`}>
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
                  <div key={lang.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/30">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lang.color }}></div>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{lang.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{lang.value}%</span>
                  </div>
                ))}
              </div>
            </div>

        {/* (Duplicate Technology Stack removed; chart is shown above with the repo list) */}

        {/* Export Button */}
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-green-400" />
          <button 
            onClick={() => exportData('json')}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            Export JSON
          </button>
        </div>
        {activeRepo && <RepoModal repo={activeRepo} onClose={() => setActiveRepo(null)} />}
      </div>
    </div>
  );
};

export default EnhancedDeveloperAnalyticsDashboard;