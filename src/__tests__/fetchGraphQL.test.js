import { fetchGraphQL } from '../githubApi';

describe('fetchGraphQL caching', () => {
  const originalFetch = global.fetch;
  const originalLS = global.localStorage;

  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ data: { hello: 'world' } }) }));
    const store = {};
    global.localStorage = {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = v; }
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalLS;
  });

  test('uses cache when available', async () => {
    const query = '{ hello }';
    // first call - fetch will be used
    const a = await fetchGraphQL(query, {}, { useCache: true, ttl: 1000 });
    expect(a).toEqual({ hello: 'world' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // second call - should read from localStorage and not call fetch
    global.fetch.mockClear();
    const b = await fetchGraphQL(query, {}, { useCache: true, ttl: 1000 });
    expect(b).toEqual({ hello: 'world' });
    expect(global.fetch).toHaveBeenCalledTimes(0);
  });
});
