import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { storage } from '@/lib/storage';

export const FullDebugPanel: React.FC = () => {
  const { user } = useAuth();
  const { mode, preset, gradientEnabled } = useTheme();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkEverything = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        // Environment
        supabaseConfigured: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...',
        
        // Theme
        theme: { mode, preset, gradientEnabled },
        cssVars: {
          background: getComputedStyle(document.documentElement).getPropertyValue('--background'),
          terminalAccent: getComputedStyle(document.documentElement).getPropertyValue('--terminal-accent'),
          foreground: getComputedStyle(document.documentElement).getPropertyValue('--foreground'),
        },
        
        // Auth
        user: user ? { id: user.id, username: user.username } : null,
        
        // Storage
        storageDriver: 'unknown',
        errors: []
      };

      try {
        // Test storage
        const users = await storage.getUsers();
        const quizzes = await storage.getQuizzes();
        const groups = await storage.getChatGroups?.() || [];
        
        info.storage = {
          users: users.length,
          quizzes: quizzes.length,
          groups: groups.length,
          usersPreview: users.slice(0, 2).map(u => ({ id: u.id, username: u.username })),
          quizzesPreview: quizzes.slice(0, 2).map(q => ({ id: q.id, title: q.title }))
        };
        
        // Detect driver
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          info.storageDriver = 'Supabase';
        } else {
          info.storageDriver = 'LocalStorage';
        }
      } catch (error: any) {
        info.errors.push(`Storage Error: ${error.message}`);
      }

      setDebugInfo(info);
      setIsLoading(false);
    };

    checkEverything();
  }, [user, mode, preset, gradientEnabled]);

  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 bg-terminal border border-terminal-accent p-2 rounded z-50 text-xs">
        <div className="text-terminal-bright">Loading debug info...</div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-terminal border border-terminal-accent p-3 rounded z-50 text-xs max-w-md max-h-96 overflow-y-auto">
      <div className="text-terminal-bright font-bold mb-2">🔍 Full Debug Panel</div>
      
      <div className="space-y-2">
        {/* Environment */}
        <div>
          <div className="text-terminal-accent font-semibold">Environment:</div>
          <div className="ml-2 space-y-1">
            <div>Supabase: {debugInfo.supabaseConfigured ? '✅' : '❌'}</div>
            <div>URL: {debugInfo.supabaseUrl}</div>
            <div>Driver: {debugInfo.storageDriver}</div>
          </div>
        </div>

        {/* Theme */}
        <div>
          <div className="text-terminal-accent font-semibold">Theme:</div>
          <div className="ml-2 space-y-1">
            <div>Mode: {debugInfo.theme.mode}</div>
            <div>Preset: {debugInfo.theme.preset}</div>
            <div>Gradient: {debugInfo.theme.gradientEnabled ? 'ON' : 'OFF'}</div>
            <div>CSS --background: {debugInfo.cssVars.background || 'MISSING'}</div>
            <div>CSS --terminal-accent: {debugInfo.cssVars.terminalAccent || 'MISSING'}</div>
          </div>
        </div>

        {/* Auth */}
        <div>
          <div className="text-terminal-accent font-semibold">Auth:</div>
          <div className="ml-2">
            {debugInfo.user ? (
              <div>User: {debugInfo.user.username} ({debugInfo.user.id.substring(0, 8)}...)</div>
            ) : (
              <div>❌ No user logged in</div>
            )}
          </div>
        </div>

        {/* Storage */}
        <div>
          <div className="text-terminal-accent font-semibold">Storage:</div>
          <div className="ml-2 space-y-1">
            {debugInfo.storage ? (
              <>
                <div>Users: {debugInfo.storage.users}</div>
                <div>Quizzes: {debugInfo.storage.quizzes}</div>
                <div>Groups: {debugInfo.storage.groups}</div>
                {debugInfo.storage.usersPreview.length > 0 && (
                  <div className="text-terminal-dim">
                    Users: {debugInfo.storage.usersPreview.map((u: any) => u.username).join(', ')}
                  </div>
                )}
              </>
            ) : (
              <div>❌ Storage not accessible</div>
            )}
          </div>
        </div>

        {/* Errors */}
        {debugInfo.errors.length > 0 && (
          <div>
            <div className="text-red-400 font-semibold">Errors:</div>
            <div className="ml-2 space-y-1">
              {debugInfo.errors.map((error: string, i: number) => (
                <div key={i} className="text-red-300">{error}</div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-terminal-dim text-xs">
        Updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};