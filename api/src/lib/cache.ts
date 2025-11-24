type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<any>>();
let hits = 0;
let misses = 0;

export function getCacheStats() {
  return { hits, misses, keys: store.size };
}

export function resetCacheStats() {
  hits = 0;
  misses = 0;
}

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return undefined;
  }
  if (process.env.CACHE_LOG === 'true') console.debug(`[cache] hit ${key}`);
  hits++;
  return e.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = 60_000) {
  const expiresAt = Date.now() + ttlMs;
  store.set(key, { value, expiresAt });
  if (process.env.CACHE_LOG === 'true') console.debug(`[cache] set ${key} ttl=${ttlMs}`);
}

export function cacheDel(key: string) {
  if (process.env.CACHE_LOG === 'true') console.debug(`[cache] del ${key}`);
  store.delete(key);
}


export function cacheClear() {
  if (process.env.CACHE_LOG === 'true') console.debug('[cache] clear');
  store.clear();
}

export function cacheGetOrMiss<T>(key: string): T | undefined {
  const v = cacheGet<T>(key);
  if (v === undefined) {
    if (process.env.CACHE_LOG === 'true') console.debug(`[cache] miss ${key}`);
    misses++;
  }
  return v;
}

export function cacheDelPrefix(prefix: string) {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) {
      if (process.env.CACHE_LOG === 'true') console.debug(`[cache] delPrefix ${key}`);
      store.delete(key);
    }
  }
}

export function invalidateRepoCache(owner: string, repo: string) {
  cacheDelPrefix(`tree:${owner}/${repo}:`);
  cacheDelPrefix(`file:${owner}/${repo}:`);
  cacheDelPrefix(`readme:${owner}/${repo}:`);
}
