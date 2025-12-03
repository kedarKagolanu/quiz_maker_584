/**
 * CacheMonitor - Development component to monitor cache performance
 */

import React, { useState } from 'react';
import { useCacheContext } from '@/contexts/CacheContext';
import { useAuth } from '@/contexts/AuthContext';
import { Terminal, TerminalButton } from './Terminal';
import { Card } from './ui/card';

interface CacheMonitorProps {
  className?: string;
}

export const CacheMonitor: React.FC<CacheMonitorProps> = ({ className = "" }) => {
  const { stats, clearCache, warmupCache, invalidatePattern, refreshStats } = useCacheContext();
  const { user } = useAuth();
  const [isWarming, setIsWarming] = useState(false);
  const [invalidateInput, setInvalidateInput] = useState('');

  const handleWarmup = async () => {
    setIsWarming(true);
    try {
      await warmupCache(user?.id);
    } finally {
      setIsWarming(false);
    }
  };

  const handleInvalidate = () => {
    if (!invalidateInput.trim()) return;
    const count = invalidatePattern(invalidateInput.trim());
    alert(`Invalidated ${count} cache entries matching pattern: ${invalidateInput}`);
    setInvalidateInput('');
  };

  if (!stats) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center text-muted-foreground">
          Cache stats not available
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-terminal-bright">
          📊 Cache Monitor
        </h3>
        <TerminalButton
          size="sm"
          variant="secondary"
          onClick={refreshStats}
        >
          🔄 Refresh
        </TerminalButton>
      </div>

      {/* Cache Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-terminal-accent">
            {stats.totalEntries}
          </div>
          <div className="text-sm text-muted-foreground">
            Total Entries
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-terminal-accent">
            {stats.memoryUsage}
          </div>
          <div className="text-sm text-muted-foreground">
            Memory Usage
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">
            {stats.expiredEntries}
          </div>
          <div className="text-sm text-muted-foreground">
            Expired Entries
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {stats.totalEntries - stats.expiredEntries}
          </div>
          <div className="text-sm text-muted-foreground">
            Active Entries
          </div>
        </div>
      </div>

      {/* Most Accessed Entries */}
      {stats.mostAccessed.length > 0 && (
        <div>
          <h4 className="font-medium text-terminal-bright mb-2">
            🔥 Most Accessed
          </h4>
          <div className="space-y-1">
            {stats.mostAccessed.map((entry, idx) => (
              <div
                key={idx}
                className="flex justify-between text-xs font-mono bg-background/50 px-2 py-1 rounded"
              >
                <span className="truncate max-w-[200px]">
                  {entry.key}
                </span>
                <span className="text-terminal-accent">
                  {entry.accessCount}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cache Actions */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <TerminalButton
            size="sm"
            onClick={handleWarmup}
            disabled={isWarming}
            className="flex-1"
          >
            {isWarming ? '🔥 Warming...' : '🔥 Warmup Cache'}
          </TerminalButton>
          <TerminalButton
            size="sm"
            variant="destructive"
            onClick={clearCache}
            className="flex-1"
          >
            🧹 Clear All
          </TerminalButton>
        </div>

        {/* Pattern Invalidation */}
        <div className="flex gap-2">
          <input
            type="text"
            value={invalidateInput}
            onChange={(e) => setInvalidateInput(e.target.value)}
            placeholder="Pattern (e.g., *quiz*, user-*)"
            className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
            onKeyDown={(e) => e.key === 'Enter' && handleInvalidate()}
          />
          <TerminalButton
            size="sm"
            variant="secondary"
            onClick={handleInvalidate}
            disabled={!invalidateInput.trim()}
          >
            🗑️ Invalidate
          </TerminalButton>
        </div>
      </div>

      {/* Cache Health Indicator */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div 
            className={`w-2 h-2 rounded-full ${
              stats.expiredEntries / stats.totalEntries < 0.1 
                ? 'bg-green-400' 
                : stats.expiredEntries / stats.totalEntries < 0.3 
                  ? 'bg-yellow-400' 
                  : 'bg-red-400'
            }`}
          />
          <span>
            Cache Health: {
              stats.expiredEntries / stats.totalEntries < 0.1 
                ? 'Excellent' 
                : stats.expiredEntries / stats.totalEntries < 0.3 
                  ? 'Good' 
                  : 'Needs Cleanup'
            }
          </span>
        </div>
      </div>
    </Card>
  );
};