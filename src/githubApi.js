const GITHUB_API_URL = 'https://api.github.com';

export async function fetchGitHub(endpoint) {
  const token = process.env.REACT_APP_GITHUB_TOKEN;
  const res = await fetch(`${GITHUB_API_URL}${endpoint}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error('GitHub API error');
  return res.json();
}

// Fetch languages for a single repo: returns an object like {JavaScript: 12345, HTML: 234}
export async function fetchRepoLanguages(owner, repo) {
  const token = process.env.REACT_APP_GITHUB_TOKEN;
  const res = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/languages`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) {
    // return empty to avoid breaking aggregation if a single repo fails
    console.warn(`Failed to fetch languages for ${owner}/${repo}: ${res.status}`);
    return {};
  }
  return res.json();
}

// Helper: batch fetch with limited concurrency
export async function batchFetch(items, worker, concurrency = 5) {
  const results = [];
  const executing = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => worker(item));
    results.push(p);

    const e = p.then(() => executing.splice(executing.indexOf(e), 1));
    executing.push(e);
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}