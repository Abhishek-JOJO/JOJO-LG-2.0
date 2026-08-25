interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleBffCache {
  private cache = new Map<string, CacheEntry<any>>();

  constructor() {
    if (typeof window === "undefined") {
      setInterval(() => this.pruneExpired(), 10 * 60 * 1000);
    }
  }

  private pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    if (!key || ttlMs <= 0) return;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const bffCache = new SimpleBffCache();
