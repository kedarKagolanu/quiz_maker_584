/**
 * useCachedData - Hook for loading data with automatic caching
 */

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { CachedStorageDriver } from '@/lib/cache/CachedStorageDriver';
import { handleError } from '@/lib/errorHandler';

interface UseCachedDataOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  autoRefresh?: number; // Auto refresh interval in ms
}

export function useCachedData<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  options: UseCachedDataOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      options.onSuccess?.(result);
    } catch (err: any) {
      setError(err);
      handleError(err, { userMessage: 'Failed to load data' });
      options.onError?.(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, dependencies);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    if (!options.autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchData(false); // Refresh in background
    }, options.autoRefresh);
    
    return () => clearInterval(interval);
  }, [fetchData, options.autoRefresh]);

  // Manual refresh function
  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    // Cache utilities if using CachedStorageDriver
    clearCache: storage instanceof CachedStorageDriver ? () => storage.clearCache() : undefined,
    cacheStats: storage instanceof CachedStorageDriver ? () => storage.getCacheStats() : undefined
  };
}

// Convenient hooks for common data types
export const useCachedQuizzes = (options?: UseCachedDataOptions) => 
  useCachedData(() => storage.getQuizzes(), [], options);

export const useCachedUserQuizzes = (userId: string, options?: UseCachedDataOptions) => 
  useCachedData(() => storage.getUserQuizzes?.(userId) || Promise.resolve([]), [userId], options);

export const useCachedPublicQuizzes = (options?: UseCachedDataOptions) => 
  useCachedData(() => storage.getPublicQuizzes?.() || Promise.resolve([]), [], options);

export const useCachedFolders = (options?: UseCachedDataOptions) => 
  useCachedData(() => storage.getFolders?.() || Promise.resolve([]), [], options);