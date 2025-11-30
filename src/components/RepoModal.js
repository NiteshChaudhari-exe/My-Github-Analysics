import React, { useEffect, useState } from 'react';
import { fetchGitHub } from '../githubApi';

export default function RepoModal({ repo, onClose }) {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repo) return;
    let mounted = true;
    async function loadCommits() {
      setLoading(true);
      try {
        const owner = repo.owner.login;
        const data = await fetchGitHub(`/repos/${owner}/${repo.name}/commits?per_page=10`);
        if (mounted) setCommits(data || []);
      } catch (e) {
        console.warn(e);
        if (mounted) setCommits([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCommits();
    return () => { mounted = false };
  }, [repo]);

  if (!repo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-2xl border border-gray-700 text-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold">{repo.name}</h3>
            <div className="text-sm text-gray-300">{repo.full_name}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-300">⭐ {repo.stargazers_count}</div>
            <button onClick={onClose} className="px-3 py-1 bg-gray-700 rounded">Close</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Recent commits</h4>
            {loading && <div className="text-sm text-gray-400">Loading commits...</div>}
            {!loading && commits.length === 0 && <div className="text-sm text-gray-400">No commits found.</div>}
            <ul className="space-y-2">
              {commits.map(c => (
                <li key={c.sha} className="text-sm bg-gray-800/40 p-2 rounded">
                  <div className="font-medium">{c.commit.message.split('\n')[0]}</div>
                  <div className="text-xs text-gray-300">{c.commit.author?.name} • {new Date(c.commit.author?.date).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Repository details</h4>
            <div className="text-sm text-gray-300">Language: {repo.language}</div>
            <div className="text-sm text-gray-300">Forks: {repo.forks_count}</div>
            <div className="text-sm text-gray-300">Open issues: {repo.open_issues_count}</div>
            <div className="mt-3 text-sm">
              <a className="text-blue-400" href={repo.html_url} target="_blank" rel="noreferrer">View on GitHub</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
