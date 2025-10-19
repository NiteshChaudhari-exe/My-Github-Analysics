import React, { useMemo, useState } from 'react';

export default function RepoList({ repos = [], onOpenRepo }) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated'); // updated, stars, forks, name

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = repos.filter(r => r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));
    if (sortBy === 'updated') list = list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    else if (sortBy === 'stars') list = list.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
    else if (sortBy === 'forks') list = list.sort((a, b) => (b.forks_count || 0) - (a.forks_count || 0));
    else if (sortBy === 'name') list = list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [repos, query, sortBy]);

  return (
    <div className="bg-white/5 p-3 rounded-2xl border border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <input
          className="flex-1 px-3 py-2 rounded-lg bg-transparent border border-gray-600"
          placeholder="Search repositories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-2 py-2 rounded-lg bg-transparent border border-gray-600">
          <option value="updated">Recently updated</option>
          <option value="stars">Stars</option>
          <option value="forks">Forks</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {filtered.map(repo => (
          <button key={repo.id} onClick={() => onOpenRepo(repo)} className="text-left p-3 rounded-lg bg-gray-800/40 hover:bg-gray-800/60">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{repo.name}</div>
                {repo.description && <div className="text-xs text-gray-300">{repo.description}</div>}
              </div>
              <div className="text-xs text-gray-400">⭐ {repo.stargazers_count || 0}</div>
            </div>
            <div className="mt-2 text-xs text-gray-400">Updated {new Date(repo.updated_at).toLocaleDateString()}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
