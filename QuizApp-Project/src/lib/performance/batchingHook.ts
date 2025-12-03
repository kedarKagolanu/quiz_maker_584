/**
 * React Hook for Batched Operations
 * Provides easy access to batching functionality in components
 */

import { useCallback } from 'react';
import { storage } from '@/lib/storage';
import { BatchedSupabaseDriver } from '@/lib/storage/BatchedSupabaseDriver';

export function useBatching() {
  const isBatchingSupported = storage instanceof BatchedSupabaseDriver;

  const flushBatches = useCallback(async () => {
    if (isBatchingSupported) {
      await (storage as BatchedSupabaseDriver).flushBatches();
    }
  }, [isBatchingSupported]);

  const setBatchingEnabled = useCallback((enabled: boolean) => {
    if (isBatchingSupported) {
      (storage as BatchedSupabaseDriver).setBatchingEnabled(enabled);
    }
  }, [isBatchingSupported]);

  const getBatchingStats = useCallback(() => {
    if (isBatchingSupported) {
      return (storage as BatchedSupabaseDriver).getBatchingStats();
    }
    return { enabled: false };
  }, [isBatchingSupported]);

  return {
    isBatchingSupported,
    flushBatches,
    setBatchingEnabled,
    getBatchingStats,
  };
}