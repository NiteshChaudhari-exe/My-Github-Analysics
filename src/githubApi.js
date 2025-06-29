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