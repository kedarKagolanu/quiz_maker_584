/**
 * CacheManager - Advanced caching system for quiz application
 * Provides in-memory caching with TTL, LRU eviction, and smart invalidation
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  enableLRU?: boolean; // Enable LRU eviction
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 1000; // Maximum cache entries
  private enableLRU = true;
  
  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || this.defaultTTL;
    this.maxSize = options.maxSize || this.maxSize;
    this.enableLRU = options.enableLRU ?? this.enableLRU;
    
    // Clean up expired entries every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  /**
   * Get cached data or execute fetcher function
   */
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();
    
    // Check if cache hit and not expired
    if (entry && (now - entry.timestamp) < (options.ttl || entry.ttl)) {
      entry.accessCount++;
      entry.lastAccessed = now;
      console.log(`🎯 Cache HIT: ${key}`);
      return entry.data;
    }
    
    // Cache miss or expired - fetch fresh data
    console.log(`🔄 Cache MISS: ${key} - fetching fresh data`);
    try {
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    } catch (error) {
      // If fetch fails and we have stale data, return it
      if (entry) {
        console.log(`⚠️ Using stale cache data for ${key} due to fetch error`);
        return entry.data;
      }
      throw error;
    }
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const now = Date.now();
    const ttl = options.ttl || this.defaultTTL;
    
    // Remove oldest entries if at max capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now
    });
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate multiple entries by pattern
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    console.log(`🗑️ Invalidated ${count} cache entries matching pattern: ${pattern}`);
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    
    return {
      totalEntries: entries.length,
      memoryUsage: this.calculateMemoryUsage(),
      expiredEntries: entries.filter(([_, entry]) => 
        (now - entry.timestamp) > entry.ttl
      ).length,
      mostAccessed: entries
        .sort((a, b) => b[1].accessCount - a[1].accessCount)
        .slice(0, 5)
        .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictOldest(): void {
    if (!this.enableLRU) return;
    
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private calculateMemoryUsage(): string {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // String characters are 2 bytes each
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 64; // Rough estimate for entry metadata
    }
    
    if (totalSize < 1024) return `${totalSize} B`;
    if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} KB`;
    return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// Global cache instance
export const globalCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes default
  maxSize: 1000,
  enableLRU: true
});