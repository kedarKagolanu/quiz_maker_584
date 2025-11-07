import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';
export type ThemePreset = 'terminal' | 'ocean' | 'forest' | 'sunset' | 'minimal' | 'reading';

interface ThemeContextType {
  mode: ThemeMode;
  preset: ThemePreset;
  gradientEnabled: boolean;
  toggleMode: () => void;
  setPreset: (preset: ThemePreset) => void;
  toggleGradient: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const themePresets = {
  terminal: {
    dark: {
      background: '220 13% 9%',
      foreground: '142 76% 73%',
      accent: '142 76% 73%',
      bright: '142 76% 85%',
      dim: '142 20% 50%',
    },
    light: {
      background: '0 0% 98%',
      foreground: '142 50% 35%',
      accent: '142 60% 45%',
      bright: '142 60% 30%',
      dim: '142 15% 60%',
    }
  },
  ocean: {
    dark: {
      background: '210 50% 12%',
      foreground: '195 80% 75%',
      accent: '195 80% 65%',
      bright: '195 80% 85%',
      dim: '195 30% 50%',
    },
    light: {
      background: '200 50% 98%',
      foreground: '210 60% 35%',
      accent: '210 70% 50%',
      bright: '210 70% 30%',
      dim: '210 20% 60%',
    }
  },
  forest: {
    dark: {
      background: '120 15% 10%',
      foreground: '100 70% 70%',
      accent: '100 70% 60%',
      bright: '100 70% 80%',
      dim: '100 25% 45%',
    },
    light: {
      background: '80 40% 98%',
      foreground: '100 50% 35%',
      accent: '100 60% 45%',
      bright: '100 60% 30%',
      dim: '100 15% 60%',
    }
  },
  sunset: {
    dark: {
      background: '15 25% 12%',
      foreground: '30 85% 75%',
      accent: '20 90% 65%',
      bright: '25 90% 80%',
      dim: '30 30% 50%',
    },
    light: {
      background: '30 50% 98%',
      foreground: '15 60% 40%',
      accent: '20 75% 55%',
      bright: '15 75% 35%',
      dim: '25 20% 60%',
    }
  },
  minimal: {
    dark: {
      background: '0 0% 10%',
      foreground: '0 0% 85%',
      accent: '210 100% 60%',
      bright: '0 0% 95%',
      dim: '0 0% 55%',
    },
    light: {
      background: '0 0% 100%',
      foreground: '0 0% 20%',
      accent: '210 100% 50%',
      bright: '0 0% 10%',
      dim: '0 0% 45%',
    }
  },
  reading: {
    dark: {
      background: '30 10% 15%',
      foreground: '40 15% 80%',
      accent: '45 70% 60%',
      bright: '40 20% 90%',
      dim: '40 10% 55%',
    },
    light: {
      background: '40 30% 96%',
      foreground: '30 20% 25%',
      accent: '45 60% 50%',
      bright: '30 25% 15%',
      dim: '30 15% 50%',
    }
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    return (saved as ThemeMode) || 'dark';
  });

  const [preset, setPresetState] = useState<ThemePreset>(() => {
    const saved = localStorage.getItem('theme-preset');
    return (saved as ThemePreset) || 'terminal';
  });

  const [gradientEnabled, setGradientEnabled] = useState(() => {
    const saved = localStorage.getItem('theme-gradient');
    return saved === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    const colors = themePresets[preset][mode];

    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--terminal', colors.background);
    root.style.setProperty('--terminal-foreground', colors.foreground);
    root.style.setProperty('--terminal-accent', colors.accent);
    root.style.setProperty('--terminal-bright', colors.bright);
    root.style.setProperty('--terminal-dim', colors.dim);
    
    root.style.setProperty('--card', colors.background);
    root.style.setProperty('--card-foreground', colors.foreground);
    root.style.setProperty('--popover', colors.background);
    root.style.setProperty('--popover-foreground', colors.foreground);
    
    root.style.setProperty('--primary', colors.accent);
    root.style.setProperty('--primary-foreground', colors.background);
    
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-foreground', colors.background);
    
    root.style.setProperty('--muted', colors.dim);
    root.style.setProperty('--muted-foreground', colors.dim);
    
    root.style.setProperty('--border', colors.dim);
    root.style.setProperty('--input', colors.dim);
    root.style.setProperty('--ring', colors.accent);

    // Apply gradient background if enabled
    if (gradientEnabled) {
      const gradient = `linear-gradient(135deg, 
        hsl(${colors.background}) 0%, 
        hsl(${colors.accent} / 0.15) 50%, 
        hsl(${colors.bright} / 0.10) 100%)`;
      document.body.style.backgroundImage = gradient;
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = 'none';
    }

    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-preset', preset);
    localStorage.setItem('theme-gradient', String(gradientEnabled));
  }, [mode, preset, gradientEnabled]);

  const toggleMode = () => {
    setMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
  };

  const toggleGradient = () => {
    setGradientEnabled(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ mode, preset, gradientEnabled, toggleMode, setPreset, toggleGradient }}>
      {children}
    </ThemeContext.Provider>
  );
};
