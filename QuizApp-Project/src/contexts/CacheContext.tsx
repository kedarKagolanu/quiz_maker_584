/**
 * CacheContext - Provides cache management across the application
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { globalCache } from '@/lib/cache/CacheManager';
import { storage } from '@/lib/storage';
import { CachedStorageDriver } from '@/lib/cache/CachedStorageDriver';

interface CacheStats {
  totalEntries: number;
  memoryUsage: string;
  expiredEntries: number;
  mostAccessed: Array<{ key: string; accessCount: number }>;
}

interface CacheContextType {
  stats: CacheStats | null;
  clearCache: () => void;
  warmupCache: (userId?: string) => Promise<void>;
  invalidatePattern: (pattern: string) => number;
  refreshStats: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const useCacheContext = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCacheContext must be used within CacheProvider');
  }
  return context;
};

interface CacheProviderProps {
  children: React.ReactNode;
}

export const CacheProvider: React.FC<CacheProviderProps> = ({ children }) => {
  const [stats, setStats] = useState<CacheStats | null>(null);

  const refreshStats = () => {
    if (storage instanceof CachedStorageDriver) {
      setStats(storage.getCacheStats());
    } else {
      setStats(globalCache.getStats());
    }
  };

  const clearCache = () => {
    if (storage instanceof CachedStorageDriver) {
      storage.clearCache();
    } else {
      globalCache.clear();
    }
    refreshStats();
  };

  const warmupCache = async (userId?: string) => {
    if (storage instanceof CachedStorageDriver) {
      await storage.warmupCache(userId);
    }
    refreshStats();
  };

  const invalidatePattern = (pattern: string): number => {
    const count = globalCache.invalidatePattern(pattern);
    refreshStats();
    return count;
  };

  // Refresh stats every 30 seconds
  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const value: CacheContextType = {
    stats,
    clearCache,
    warmupCache,
    invalidatePattern,
    refreshStats
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
};