import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ComposedChart } from 'recharts';
import { Activity, GitBranch, Code, Clock, TrendingUp, Users, Star, GitCommit, Calendar, Download, Filter, Target, Award, Zap, Database, Globe, Smartphone, Laptop, Coffee, Moon } from 'lucide-react';

const EnhancedDeveloperAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDateRange, setSelectedDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('commits');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [animatedStats, setAnimatedStats] = useState({
    commits: 0,
    repos: 0,
    contributions: 0,
    followers: 0,
    pullRequests: 0,
    codeReviews: 0
  });

  // Enhanced mock data with more variety
  const generateTimeSeriesData = (days, baseValue, variance) => {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return {
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        value: Math.floor(baseValue + Math.random() * variance),
        commits: Math.floor(5 + Math.random() * 15),
        lines: Math.floor(200 + Math.random() * 500),
        pullRequests: Math.floor(Math.random() * 5),
        reviews: Math.floor(Math.random() * 8),
        issues: Math.floor(Math.random() * 3)
      };
    });
  };

  const commitData = useMemo(() => {
    const days = selectedDateRange === '7d' ? 7 : selectedDateRange === '30d' ? 30 : 90;
    return generateTimeSeriesData(days, 10, 20);
  }, [selectedDateRange]);

  const performanceData = [
    { metric: 'Code Quality', value: 92, target: 95 },
    { metric: 'Test Coverage', value: 87, target: 90 },
    { metric: 'Documentation', value: 78, target: 85 },
    { metric: 'Code Review', value: 94, target: 90 },
    { metric: 'Deployment', value: 89, target: 95 },
    { metric: 'Bug Resolution', value: 91, target: 88 }
  ];

  const teamData = [
    { name: 'Alice', commits: 156, reviews: 89, score: 94 },
    { name: 'Bob', commits: 134, reviews: 67, score: 87 },
    { name: 'Charlie', commits: 178, reviews: 92, score: 91 },
    { name: 'Diana', commits: 145, reviews: 78, score: 89 },
    { name: 'You', commits: 189, reviews: 95, score: 96 }
  ];

  const languageData = [
    { name: 'JavaScript', value: 35, lines: 15420, files: 89, color: '#f7df1e' },
    { name: 'TypeScript', value: 25, lines: 11250, files: 56, color: '#3178c6' },
    { name: 'Python', value: 20, lines: 8900, files: 34, color: '#3776ab' },
    { name: 'React', value: 12, lines: 5340, files: 28, color: '#61dafb' },
    { name: 'CSS', value: 8, lines: 3560, files: 23, color: '#1572b6' }
  ];

  const deviceData = [
    { device: 'Desktop', hours: 6.5, productivity: 95 },
    { device: 'Laptop', hours: 2.3, productivity: 87 },
    { device: 'Mobile', hours: 0.8, productivity: 65 }
  ];

  const goalsData = [
    { goal: 'Daily Commits', current: 8, target: 10, progress: 80 },
    { goal: 'Code Reviews', current: 12, target: 15, progress: 80 },
    { goal: 'New Features', current: 3, target: 5, progress: 60 },
    { goal: 'Bug Fixes', current: 7, target: 8, progress: 87 },
    { goal: 'Documentation', current: 4, target: 6, progress: 67 }
  ];

  const realTimeMetrics = [
    { time: '09:00', commits: 2, focus: 85, energy: 90, temperature: 72 },
    { time: '10:00', commits: 5, focus: 92, energy: 88, temperature: 74 },
    { time: '11:00', commits: 3, focus: 89, energy: 85, temperature: 76 },
    { time: '12:00', commits: 1, focus: 70, energy: 65, temperature: 78 },
    { time: '13:00', commits: 0, focus: 45, energy: 40, temperature: 75 },
    { time: '14:00', commits: 4, focus: 78, energy: 75, temperature: 73 },
    { time: '15:00', commits: 6, focus: 95, energy: 90, temperature: 71 },
    { time: '16:00', commits: 8, focus: 88, energy: 85, temperature: 70 }
  ];

  // Animated counter effect
  useEffect(() => {
    const targets = { 
      commits: 1247, 
      repos: 23, 
      contributions: 2847, 
      followers: 456,
      pullRequests: 89,
      codeReviews: 234
    };
    const duration = 2000;
    const steps = 60;
    const stepTime = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      setAnimatedStats({
        commits: Math.floor(targets.commits * easeOutQuart),
        repos: Math.floor(targets.repos * easeOutQuart),
        contributions: Math.floor(targets.contributions * easeOutQuart),
        followers: Math.floor(targets.followers * easeOutQuart),
        pullRequests: Math.floor(targets.pullRequests * easeOutQuart),
        codeReviews: Math.floor(targets.codeReviews * easeOutQuart)
      });

      if (step >= steps) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [selectedDateRange]);

  const exportData = (format) => {
    const data = {
      stats: animatedStats,
      commits: commitData,
      languages: languageData,
      performance: performanceData,
      team: teamData,
      goals: goalsData,
      exportDate: new Date().toISOString()
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `developer-analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } else if (format === 'csv') {
      const csv = commitData.map(row => 
        `${row.date},${row.commits},${row.lines},${row.pullRequests}`
      ).join('\n');
      const blob = new Blob([`Date,Commits,Lines,Pull Requests\n${csv}`], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `developer-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  const StatCard = ({ icon: Icon, title, value, change, color, subtitle }) => (
    <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-gray-300'} p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:transform hover:scale-105 cursor-pointer`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-r ${color}`}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
        </div>
        <span className="text-green-400 text-xs sm:text-sm font-semibold">+{change}%</span>
      </div>
      <h3 className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-xs sm:text-sm font-medium mb-1`}>{title}</h3>
      <p className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value.toLocaleString()}</p>
      {subtitle && <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{subtitle}</p>}
    </div>
  );

  const FilterControls = () => (
    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-800/50 rounded-xl backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-400" />
        <select 
          value={selectedDateRange} 
          onChange={(e) => setSelectedDateRange(e.target.value)}
          className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-purple-400" />
        <select 
          value={selectedLanguage} 
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="all">All Languages</option>
          {languageData.map(lang => (
            <option key={lang.name} value={lang.name.toLowerCase()}>{lang.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 text-green-400" />
        <button 
          onClick={() => exportData('json')}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
        >
          Export JSON
        </button>
        <button 
          onClick={() => exportData('csv')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
        >
          Export CSV
        </button>
      </div>
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
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm sm:text-lg`}>Advanced insights for modern developers</p>
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

      {/* Navigation Tabs */}
      <div className="flex gap-1 mb-6 sm:mb-8 bg-gray-800/50 p-1 rounded-xl w-full overflow-x-auto backdrop-blur-sm">
        {['overview', 'activity', 'projects', 'team', 'performance', 'goals'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg capitalize font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
              activeTab === tab
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : `${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter Controls */}
      <FilterControls />

      {activeTab === 'overview' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
            <StatCard icon={GitCommit} title="Total Commits" value={animatedStats.commits} change={12} color="from-green-500 to-emerald-600" subtitle="This month" />
            <StatCard icon={GitBranch} title="Repositories" value={animatedStats.repos} change={8} color="from-blue-500 to-cyan-600" subtitle="Active projects" />
            <StatCard icon={Activity} title="Contributions" value={animatedStats.contributions} change={25} color="from-purple-500 to-pink-600" subtitle="Open source" />
            <StatCard icon={Users} title="Followers" value={animatedStats.followers} change={15} color="from-orange-500 to-red-600" subtitle="GitHub profile" />
            <StatCard icon={TrendingUp} title="Pull Requests" value={animatedStats.pullRequests} change={18} color="from-indigo-500 to-purple-600" subtitle="Merged" />
            <StatCard icon={Star} title="Code Reviews" value={animatedStats.codeReviews} change={22} color="from-yellow-500 to-orange-600" subtitle="Completed" />
          </div>

          {/* Advanced Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Enhanced Activity Chart */}
            <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Development Activity
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={commitData}>
                  <defs>
                    <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                  <XAxis dataKey="day" stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <YAxis stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }} 
                  />
                  <Area type="monotone" dataKey="commits" stroke="#3b82f6" fillOpacity={1} fill="url(#commitGradient)" />
                  <Bar dataKey="pullRequests" fill="#8b5cf6" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Enhanced Language Chart */}
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
          </div>

          {/* Real-time Metrics */}
          <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border`}>
            <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Zap className="w-5 h-5 text-yellow-400" />
              Real-time Productivity
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={realTimeMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                <XAxis dataKey="time" stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <YAxis stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    color: isDarkMode ? '#ffffff' : '#000000'
                  }} 
                />
                <Line type="monotone" dataKey="focus" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
                <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }} />
                <Line type="monotone" dataKey="commits" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Device Usage */}
            <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Smartphone className="w-5 h-5 text-blue-400" />
                Device Analytics
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deviceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                  <XAxis dataKey="device" stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <YAxis stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }} 
                  />
                  <Bar dataKey="hours" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Productivity Scatter */}
            <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Clock className="w-5 h-5 text-green-400" />
                Hours vs Productivity
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart data={deviceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                  <XAxis dataKey="hours" stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} name="Hours" />
                  <YAxis dataKey="productivity" stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} name="Productivity %" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }} 
                  />
                  <Scatter dataKey="productivity" fill="#10b981" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-6">
          <h3 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Repository Analytics</h3>
          <div className="grid gap-4">
            {[
              { name: 'awesome-project', stars: 234, forks: 45, commits: 156, status: 'Active', health: 95 },
              { name: 'react-dashboard', stars: 89, forks: 23, commits: 78, status: 'Stable', health: 87 },
              { name: 'api-wrapper', stars: 67, forks: 12, commits: 234, status: 'Growing', health: 92 },
              { name: 'ui-components', stars: 145, forks: 34, commits: 89, status: 'Mature', health: 89 }
            ].map((repo, index) => (
              <div key={repo.name} className={`${isDarkMode ? 'bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600' : 'bg-gradient-to-r from-white to-gray-50 border-gray-200 hover:border-gray-300'} p-4 sm:p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-105`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                      <GitBranch className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{repo.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{repo.status}</span>
                        <div className={`w-2 h-2 rounded-full ${repo.health > 90 ? 'bg-green-400' : repo.health > 80 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                        <span className="text-xs text-gray-500">{repo.health}% health</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 sm:gap-6 text-right">
                    <div>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4" />
                        <span className="font-bold">{repo.stars}</span>
                      </div>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>stars</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-blue-400">
                        <GitBranch className="w-4 h-4" />
                        <span className="font-bold">{repo.forks}</span>
                      </div>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>forks</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-green-400">
                        <GitCommit className="w-4 h-4" />
                        <span className="font-bold">{repo.commits}</span>
                      </div>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>commits</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${repo.health > 90 ? 'bg-green-400' : repo.health > 80 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${repo.health}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6 sm:space-y-8">
          <h3 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Team Performance</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Team Comparison Chart */}
            <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Users className="w-5 h-5 text-blue-400" />
                Team Contributions
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teamData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                  <XAxis dataKey="name" stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <YAxis stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }} 
                  />
                  <Bar dataKey="commits" fill="#3b82f6" />
                  <Bar dataKey="reviews" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Team Leaderboard */}
            <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Award className="w-5 h-5 text-yellow-400" />
                Performance Scores
              </h3>
              <div className="space-y-4">
                {teamData.sort((a, b) => b.score - a.score).map((member, index) => (
                  <div key={member.name} className={`flex items-center justify-between p-4 rounded-xl ${member.name === 'You' ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30' : isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-400 text-black' : index === 1 ? 'bg-gray-300 text-black' : index === 2 ? 'bg-orange-400 text-black' : isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{member.name}</h4>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{member.commits} commits, {member.reviews} reviews</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{member.score}</div>
                      <div className="text-sm text-gray-500">score</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6 sm:space-y-8">
          <h3 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Performance Metrics</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Performance Radar Chart */}
            <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <TrendingUp className="w-5 h-5 text-green-400" />
                Skill Assessment
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={performanceData}>
                  <PolarGrid stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: isDarkMode ? '#9CA3AF' : '#6B7280' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: isDarkMode ? '#9CA3AF' : '#6B7280' }} />
                  <Radar name="Current" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                  <Radar name="Target" dataKey="target" stroke="#10b981" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Metrics List */}
            <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Database className="w-5 h-5 text-purple-400" />
                Detailed Metrics
              </h3>
              <div className="space-y-4">
                {performanceData.map((metric) => (
                  <div key={metric.metric} className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{metric.metric}</h4>
                      <span className={`text-sm ${metric.value >= metric.target ? 'text-green-400' : 'text-yellow-400'}`}>
                        {metric.value}% / {metric.target}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${metric.value >= metric.target ? 'bg-green-400' : 'bg-yellow-400'}`}
                        style={{ width: `${(metric.value / metric.target) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-6 sm:space-y-8">
          <h3 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Goals & Targets</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Goals Progress Chart */}
            <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} p-4 sm:p-6 rounded-2xl border`}>
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Target className="w-5 h-5 text-red-400" />
                Goal Progress
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={goalsData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                  <XAxis type="number" domain={[0, 100]} stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <YAxis dataKey="goal" type="category" stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }} 
                  />
                  <Bar dataKey="progress" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Goals Cards */}
            <div className="space-y-4">
              <h3 className={`text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Award className="w-5 h-5 text-yellow-400" />
                Active Goals
              </h3>
              {goalsData.map((goal) => (
                <div key={goal.goal} className={`${isDarkMode ? 'bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-r from-white to-gray-50 border-gray-200'} p-4 rounded-xl border`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{goal.goal}</h4>
                    <span className={`text-sm font-bold ${goal.progress >= 80 ? 'text-green-400' : goal.progress >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {goal.current}/{goal.target}
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${goal.progress >= 80 ? 'bg-green-400' : goal.progress >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{goal.progress}% complete</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${goal.progress >= 80 ? 'bg-green-400/20 text-green-400' : goal.progress >= 60 ? 'bg-yellow-400/20 text-yellow-400' : 'bg-red-400/20 text-red-400'}`}>
                      {goal.progress >= 80 ? 'On Track' : goal.progress >= 60 ? 'Good' : 'Needs Focus'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDeveloperAnalyticsDashboard;