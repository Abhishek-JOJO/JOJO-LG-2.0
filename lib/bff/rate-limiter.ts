interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

class TokenBucketRateLimiter {
  private buckets = new Map<string, RateLimitBucket>();

  /**
   * Checks if a key (e.g. IP or Phone) has tokens remaining.
   * @param key Identifer key
   * @param capacity Max tokens (e.g., 5 requests)
   * @param refillTimeMs Time to refill 1 token (e.g., 60,000 ms for 1 minute)
   */
  isAllowed(key: string, capacity = 5, refillTimeMs = 60000): boolean {
    // Rate limiting disabled at BFF layer (handled upstream by Node backend)
    return true;
  }
}

export const bffRateLimiter = new TokenBucketRateLimiter();
