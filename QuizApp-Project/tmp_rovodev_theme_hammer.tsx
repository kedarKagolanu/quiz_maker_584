import React, { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// Nuclear theme testing component
export const ThemeHammer: React.FC = () => {
  const { mode, preset, gradientEnabled, setMode, setPreset, setGradientEnabled } = useTheme();
  
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔨 Theme Hammer Check:', {
        mode,
        preset,
        gradientEnabled,
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        cssVar: getComputedStyle(document.documentElement).getPropertyValue('--terminal-accent'),
        timestamp: new Date().toISOString()
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [mode, preset, gradientEnabled]);
  
  return (
    <div className="fixed top-20 right-4 z-50 max-w-xs">
      {/* Theme Test Cards */}
      <div className="space-y-2 mb-4">
        <div className="bg-terminal border-2 border-terminal-accent p-3 rounded text-terminal-foreground">
          <div className="text-terminal-bright font-bold">Live Theme Test</div>
          <div className="text-terminal-accent">Accent Color</div>
          <div className="text-terminal-dim">Dim Color</div>
        </div>
        
        <div style={{
          background: `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--terminal')})`,
          border: `2px solid hsl(${getComputedStyle(document.documentElement).getPropertyValue('--terminal-accent')})`,
          color: `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--terminal-foreground')})`,
          padding: '12px',
          borderRadius: '4px'
        }}>
          Direct CSS Variable Test
        </div>
      </div>
      
      {/* Quick Theme Switcher */}
      <div className="bg-black/80 border border-white/20 p-3 rounded text-white text-xs">
        <div className="font-bold mb-2">🔨 Theme Hammer</div>
        <div className="space-y-2">
          <div>
            <button 
              onClick={() => setPreset('terminal')}
              className="mr-1 px-2 py-1 bg-green-600 text-black rounded text-xs"
            >
              Terminal
            </button>
            <button 
              onClick={() => setPreset('ocean')}
              className="mr-1 px-2 py-1 bg-blue-600 text-white rounded text-xs"
            >
              Ocean
            </button>
            <button 
              onClick={() => setPreset('sunset')}
              className="px-2 py-1 bg-orange-600 text-white rounded text-xs"
            >
              Sunset
            </button>
          </div>
          <div>
            <button 
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              className="mr-1 px-2 py-1 bg-gray-600 text-white rounded text-xs"
            >
              {mode === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button 
              onClick={() => setGradientEnabled(!gradientEnabled)}
              className="px-2 py-1 bg-purple-600 text-white rounded text-xs"
            >
              Gradient: {gradientEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};