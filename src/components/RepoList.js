import React from 'react';
import PropTypes from 'prop-types';

export default function RepoList({ repos, onOpenRepo, isLoading }) {
  const filtered = Array.isArray(repos) ? repos : [];

  return (
    <section aria-labelledby="repo-list-heading" className="bg-white/5 p-3 rounded-2xl border border-gray-700 overflow-hidden">
      {/* Controls (search/sort) are managed by the parent component (App) via RepoSearch + filters */}

      <h2 id="repo-list-heading" className="sr-only">Repository list</h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 max-h-[50vh] overflow-auto" role="list">
        {isLoading ? (
          <div className="p-4 text-sm text-gray-300">Loading repositories…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-gray-300">No repositories found.</div>
        ) : (
          filtered.map(repo => (
            <div key={repo.id} role="listitem">
              <button
                type="button"
                onClick={() => onOpenRepo && onOpenRepo(repo)}
                className="w-full text-left p-3 rounded-lg bg-gray-800/40 hover:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-describedby={`repo-${repo.id}-updated`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-semibold text-sm truncate" title={repo.name || '—'}>{repo.name || '—'}</h3>
                      {repo.private && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-600 text-black">Private</span>
                      )}
                    </div>
                    {repo.description && <div className="mt-1 text-xs text-gray-300 truncate" title={repo.description}>{repo.description}</div>}
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-400 text-right">
                    <div>⭐ {repo.stargazers_count || 0}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400" aria-hidden>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-400" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 4.42 5.33 9.74 6.14 10.5.35.32.9.32 1.25 0C13.67 18.74 19 13.42 19 9c0-3.87-3.13-7-7-7z" fill="currentColor" />
                      </svg>
                      <span>{repo.language || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-400" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2l4 4h-3v6h-2V6H8l4-4zM6 14v6h12v-6H6z" fill="currentColor" />
                      </svg>
                      <span>{repo.forks_count || 0} forks</span>
                    </div>
                  </div>

                  <div id={`repo-${repo.id}-updated`} className="ml-2 truncate max-w-[6rem]">Updated {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : '—'}</div>
                </div>
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

RepoList.propTypes = {
  repos: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    description: PropTypes.string,
    stargazers_count: PropTypes.number,
    forks_count: PropTypes.number,
    updated_at: PropTypes.string,
  })),
  onOpenRepo: PropTypes.func,
  isLoading: PropTypes.bool,
};

RepoList.defaultProps = {
  repos: [],
  onOpenRepo: null,
  isLoading: false,
};
