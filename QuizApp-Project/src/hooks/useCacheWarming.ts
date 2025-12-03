/**
 * useCacheWarming - Hook to automatically warm up cache with user data
 */

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCacheContext } from '@/contexts/CacheContext';
import { toast } from 'sonner';

export const useCacheWarming = () => {
  const { user } = useAuth();
  const { warmupCache } = useCacheContext();

  useEffect(() => {
    if (!user?.id) return;

    // Automatically warm cache when user logs in
    const warmCache = async () => {
      try {
        await warmupCache(user.id);
        console.log('✅ Cache warmed up for user:', user.username);
      } catch (error) {
        console.error('❌ Cache warmup failed:', error);
      }
    };

    // Small delay to let auth settle
    const timer = setTimeout(warmCache, 1000);
    return () => clearTimeout(timer);
  }, [user?.id, warmupCache]);

  return { warmupCache };
};