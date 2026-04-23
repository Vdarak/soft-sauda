/**
 * In-memory LRU Cache with TTL expiration.
 * Zero dependencies.
 * 
 * Usage:
 *   cacheSet('parties:list', data, 60);  // 60s TTL
 *   cacheGet('parties:list');             // returns data or null
 *   cacheInvalidate('parties');           // removes all keys starting with 'parties'
 * 
 * Default TTL is 10 minutes — data is invalidated on every write, so
 * long TTLs are safe for a single-user ERP.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/** Default TTL: 10 minutes (in seconds) */
export const DEFAULT_TTL = 600;

const MAX_ENTRIES = 500;
const store = new Map<string, CacheEntry<unknown>>();

/** Get a cached value. Returns null if expired or missing. */
export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

/** Set a cached value with TTL in seconds (default: 10 min). */
export function cacheSet<T>(key: string, data: T, ttlSeconds: number = DEFAULT_TTL): void {
  // Evict oldest entries if at capacity
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
  store.set(key, {
    data,
    expiresAt: Date.now() + (ttlSeconds * 1000),
  });
}

/** 
 * Invalidate all cache keys that start with the given prefix.
 * Example: invalidate('parties') removes 'parties:list', 'parties:42', etc. 
 */
export function cacheInvalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/** Clear the entire cache. */
export function cacheClear(): void {
  store.clear();
}

/** Check if a key exists and is not expired. */
export function cacheHas(key: string): boolean {
  return cacheGet(key) !== null;
}
