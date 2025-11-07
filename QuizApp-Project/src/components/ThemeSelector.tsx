import React from 'react';
import { useTheme, ThemePreset } from '@/contexts/ThemeContext';
import { Sun, Moon, Sparkles, Palette } from 'lucide-react';
import { TerminalButton, TerminalLine } from './Terminal';

export const ThemeSelector: React.FC = () => {
  const { mode, preset, gradientEnabled, toggleMode, setPreset, toggleGradient } = useTheme();

  const presets: { value: ThemePreset; label: string; description: string }[] = [
    { value: 'terminal', label: 'Terminal', description: 'Classic green terminal' },
    { value: 'ocean', label: 'Ocean', description: 'Cool blue waters' },
    { value: 'forest', label: 'Forest', description: 'Natural green tones' },
    { value: 'sunset', label: 'Sunset', description: 'Warm orange glow' },
    { value: 'minimal', label: 'Minimal', description: 'Clean and simple' },
    { value: 'reading', label: 'Reading', description: 'Eye-friendly warm tones' },
  ];

  return (
    <div className="border border-terminal-accent/30 rounded p-4 space-y-4">
      <TerminalLine prefix="#">Theme Settings</TerminalLine>

      {/* Mode Toggle */}
      <div className="ml-6 space-y-2">
        <div className="text-sm text-terminal-bright">Color Mode:</div>
        <div className="flex gap-2">
          <TerminalButton onClick={toggleMode}>
            {mode === 'dark' ? (
              <>
                <Moon className="w-4 h-4 inline mr-2" />
                Dark Mode
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 inline mr-2" />
                Light Mode
              </>
            )}
          </TerminalButton>
        </div>
      </div>

      {/* Gradient Toggle */}
      <div className="ml-6 space-y-2">
        <div className="text-sm text-terminal-bright">Background Effect:</div>
        <div className="flex gap-2">
          <TerminalButton onClick={toggleGradient}>
            <Sparkles className="w-4 h-4 inline mr-2" />
            {gradientEnabled ? 'Gradient On' : 'Gradient Off'}
          </TerminalButton>
        </div>
      </div>

      {/* Preset Selection */}
      <div className="ml-6 space-y-2">
        <div className="text-sm text-terminal-bright flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Theme Preset:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`text-left border rounded p-3 transition-all ${
                preset === p.value
                  ? 'border-terminal-accent bg-terminal-accent/20'
                  : 'border-terminal-accent/30 hover:border-terminal-accent/60 hover:bg-terminal-accent/10'
              }`}
            >
              <div className="font-medium text-terminal-bright">{p.label}</div>
              <div className="text-xs text-terminal-dim">{p.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
