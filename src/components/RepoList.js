import React, { useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { VariableSizeList as List } from 'react-window';

// Virtualized RepoList using react-window. Keeps grouping option and skeleton when loading.
export default function RepoList({ repos, onOpenRepo, isLoading, pageSize }) {
  const filtered = useMemo(() => (Array.isArray(repos) ? repos : []), [repos]);
  const [groupByLanguage, setGroupByLanguage] = useState(false);
  const listRef = useRef(null);

  // Build groups map
  const groups = useMemo(() => filtered.reduce((acc, r) => { const k = r.language || 'Unknown'; (acc[k] = acc[k] || []).push(r); return acc; }, {}), [filtered]);

  // Flattened items for virtualization: either { type: 'header', label, count } or { type: 'repo', repo }
  const items = useMemo(() => {
    if (groupByLanguage) {
      const keys = Object.keys(groups).sort();
      const out = [];
      keys.forEach((k) => {
        out.push({ type: 'header', label: k, count: groups[k].length });
        groups[k].forEach((r) => out.push({ type: 'repo', repo: r }));
      });
      return out;
    }
    return filtered.map((r) => ({ type: 'repo', repo: r }));
  }, [filtered, groups, groupByLanguage]);

  // item size in px: headers smaller than repo rows
  const getItemSize = (index) => (items[index].type === 'header' ? 36 : 88);

  // compute list height: up to ~50vh or number of items * average height (bounded)
  const totalEstimatedHeight = useMemo(() => {
    const avg = 88;
    const est = items.length * avg;
    const max = Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.5 || 480);
    return Math.min(est, max);
  }, [items.length]);

  // Early returns: loading skeleton / empty state
  if (isLoading) {
    return (
      <section aria-labelledby="repo-list-heading" className="bg-white/5 p-3 rounded-2xl border border-gray-700 overflow-hidden">
        <h2 id="repo-list-heading" className="sr-only">Repository list</h2>
        <div className="p-2">
          <div className="sr-only">Loading repositories…</div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} role="listitem" className="mb-2">
              <div className="w-full p-3 rounded-lg bg-gray-800/20 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-5/6 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section aria-labelledby="repo-list-heading" className="bg-white/5 p-3 rounded-2xl border border-gray-700 overflow-hidden">
        <h2 id="repo-list-heading" className="sr-only">Repository list</h2>
        <div className="p-4 text-sm text-gray-300">
          <div>No repositories found.</div>
          <div className="mt-2 text-xs text-gray-400">Try adjusting your search or filters. <button type="button" className="underline" onClick={() => window.location.reload()}>Reload</button></div>
        </div>
      </section>
    );
  }

  // Row renderer for react-window
  const Row = ({ index, style, data }) => {
    const item = data[index];
    if (!item) return null;

    if (item.type === 'header') {
      return (
        <div style={style} className="px-2 py-1">
          <div className="text-xs text-gray-400 px-1 py-1 font-medium">{item.label} ({item.count})</div>
        </div>
      );
    }

    const repo = item.repo;
    return (
      <div style={style} role="listitem" className="px-1">
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

            <div id={`repo-${repo.id}-Updated`} className="ml-2 truncate max-w-[6rem]">Updated {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : '—'}</div>
          </div>
        </button>
      </div>
    );
  };

  return (
    <section aria-labelledby="repo-list-heading" className="bg-white/5 p-3 rounded-2xl border border-gray-700 overflow-hidden">
      <h2 id="repo-list-heading" className="sr-only">Repository list</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1">
        <div className="col-span-full">
          <div className="flex items-center justify-between p-1">
            <div className="text-xs text-gray-400">Showing {filtered.length} repositories</div>
            <div className="text-xs">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" aria-label="Group by language" checked={groupByLanguage} onChange={(e) => { setGroupByLanguage(e.target.checked); if (listRef.current) listRef.current.resetAfterIndex(0); }} />
                <span className="text-xs text-gray-300">Group by language</span>
              </label>
            </div>
          </div>
        </div>

        <div className="col-span-full" role="list">
          <List
            ref={listRef}
            height={Math.max(200, Math.min(totalEstimatedHeight, 480))}
            itemCount={items.length}
            itemSize={getItemSize}
            width={'100%'}
            itemData={items}
            overscanCount={6}
          >
            {Row}
          </List>
        </div>
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
  pageSize: PropTypes.number,
};

RepoList.defaultProps = {
  repos: [],
  onOpenRepo: null,
  isLoading: false,
  pageSize: 10,
};
