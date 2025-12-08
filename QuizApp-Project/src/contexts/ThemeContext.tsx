import React, { createContext, useContext, useState, useEffect } from 'react';

// Force style injection utility
const injectThemeStyles = (preset: string, mode: string, gradientEnabled: boolean, brightness: number, colors: any) => {
  // Remove existing theme styles
  document.querySelectorAll('[data-theme-style]').forEach(el => el.remove());
  
  // Create new comprehensive style injection
  const style = document.createElement('style');
  style.setAttribute('data-theme-style', 'true');
  style.textContent = `
    /* FORCE THEME OVERRIDE - ALL IMPORTANT */
    :root {
      --background: ${colors.background} !important;
      --foreground: ${colors.foreground} !important;
      --terminal: ${colors.background} !important;
      --terminal-foreground: ${colors.foreground} !important;
      --terminal-accent: ${colors.accent} !important;
      --terminal-bright: ${colors.bright} !important;
      --terminal-dim: ${colors.dim} !important;
      --primary: ${colors.accent} !important;
      --accent: ${colors.accent} !important;
      --card: ${colors.background} !important;
      --border: ${colors.dim} !important;
      --input: ${colors.dim} !important;
      --ring: ${colors.accent} !important;
    }
    
    /* Force body styling */
    body, #root {
      background-color: hsl(${colors.background}) !important;
      color: hsl(${colors.foreground}) !important;
      transition: all 0.3s ease !important;
      filter: brightness(${brightness}%) !important;
      ${gradientEnabled ? `
        background: linear-gradient(135deg, 
          hsl(${colors.background}) 0%, 
          hsl(${colors.accent} / ${mode === 'dark' ? '0.15' : '0.25'}) 30%,
          hsl(${colors.bright} / ${mode === 'dark' ? '0.08' : '0.20'}) 70%,
          hsl(${colors.background}) 100%) !important;
        background-attachment: fixed !important;
        background-repeat: no-repeat !important;
        background-size: 100% 100% !important;
        background-position: center center !important;
        box-shadow: inset 0 0 200px rgba(${mode === 'dark' ? '0,0,0' : '255,255,255'},${mode === 'dark' ? '0.2' : '0.3'}) !important;
      ` : ''}
    }
    
    /* Enhanced terminal components with better contrast */
    .terminal-container, .bg-terminal {
      ${gradientEnabled ? `
        background: linear-gradient(135deg, 
          hsl(${colors.background} / 0.95) 0%, 
          hsl(${colors.background} / 0.98) 50%,
          hsl(${colors.accent} / 0.15) 100%) !important;
        backdrop-filter: blur(10px) !important;
        border: 2px solid hsl(${colors.accent} / 0.8) !important;
        box-shadow: 
          0 8px 16px rgba(0,0,0,${mode === 'dark' ? '0.4' : '0.25'}),
          0 2px 4px rgba(0,0,0,${mode === 'dark' ? '0.2' : '0.15'}),
          inset 0 1px 0 rgba(255,255,255,${mode === 'dark' ? '0.2' : '0.4'}) !important;
      ` : `
        background-color: hsl(${colors.background}) !important;
        border: 2px solid hsl(${colors.accent} / ${mode === 'dark' ? '0.8' : '0.9'}) !important;
        box-shadow: 
          0 4px 8px rgba(0,0,0,${mode === 'dark' ? '0.3' : '0.2'}),
          0 1px 3px rgba(0,0,0,${mode === 'dark' ? '0.2' : '0.15'}) !important;
      `}
    }

    /* Enhanced UI elements with better contrast and modern design */
    ${gradientEnabled ? `
      /* Cards and containers with beautiful gradients */
      .rounded, .rounded-lg, .rounded-md {
        background: linear-gradient(135deg, 
          hsl(${colors.background} / 0.95) 0%, 
          hsl(${colors.accent} / ${mode === 'dark' ? '0.08' : '0.03'}) 50%,
          hsl(${colors.background} / 0.98) 100%) !important;
        backdrop-filter: blur(12px) !important;
        border: 2px solid hsl(${colors.accent} / ${mode === 'dark' ? '0.4' : '0.2'}) !important;
        box-shadow: 
          0 4px 20px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.3' : '0.08'}),
          0 1px 3px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.2' : '0.04'}),
          inset 0 1px 0 rgba(255, 255, 255, ${mode === 'dark' ? '0.1' : '0.5'}) !important;
      }

      /* Enhanced text with subtle shadows */
      .text-terminal-foreground, .text-terminal-bright {
        text-shadow: 0 1px 2px rgba(${mode === 'dark' ? '0,0,0' : '255,255,255'}, ${mode === 'dark' ? '0.6' : '0.8'}) !important;
        font-weight: ${mode === 'dark' ? '500' : '600'} !important;
      }

      /* Modern input fields with glass morphism */
      input, textarea, select {
        background: linear-gradient(135deg, 
          hsl(${colors.background} / 0.9) 0%, 
          hsl(${colors.accent} / 0.05) 100%) !important;
        border: 2px solid hsl(${colors.accent} / ${mode === 'dark' ? '0.3' : '0.25'}) !important;
        backdrop-filter: blur(10px) !important;
        box-shadow: 
          0 4px 16px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.2' : '0.06'}),
          inset 0 1px 0 rgba(255, 255, 255, ${mode === 'dark' ? '0.1' : '0.4'}) !important;
        color: hsl(${colors.foreground}) !important;
        transition: all 0.2s ease !important;
      }
      
      input:focus, textarea:focus, select:focus {
        border-color: hsl(${colors.accent} / ${mode === 'dark' ? '0.8' : '0.6'}) !important;
        box-shadow: 
          0 6px 20px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.3' : '0.12'}),
          0 0 0 3px hsl(${colors.accent} / ${mode === 'dark' ? '0.2' : '0.1'}),
          inset 0 1px 0 rgba(255, 255, 255, ${mode === 'dark' ? '0.2' : '0.6'}) !important;
        outline: none !important;
      }
    ` : `
      /* Clean non-gradient design for white theme */
      .rounded, .rounded-lg, .rounded-md {
        background: hsl(${colors.background}) !important;
        border: 2px solid hsl(${colors.accent} / ${mode === 'dark' ? '0.6' : '0.3'}) !important;
        box-shadow: 
          0 2px 12px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.3' : '0.08'}),
          0 1px 3px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.2' : '0.04'}) !important;
      }
      
      .text-terminal-foreground, .text-terminal-bright {
        font-weight: ${mode === 'dark' ? '500' : '600'} !important;
      }
      
      input, textarea, select {
        background: hsl(${colors.background}) !important;
        border: 2px solid hsl(${colors.accent} / ${mode === 'dark' ? '0.4' : '0.35'}) !important;
        box-shadow: 
          0 2px 8px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.2' : '0.06'}),
          inset 0 1px 0 rgba(255, 255, 255, ${mode === 'dark' ? '0.1' : '0.5'}) !important;
        color: hsl(${colors.foreground}) !important;
        transition: all 0.2s ease !important;
      }
      
      input:focus, textarea:focus, select:focus {
        border-color: hsl(${colors.accent} / ${mode === 'dark' ? '0.8' : '0.7'}) !important;
        box-shadow: 
          0 4px 16px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.3' : '0.12'}),
          0 0 0 3px hsl(${colors.accent} / ${mode === 'dark' ? '0.2' : '0.15'}) !important;
        outline: none !important;
      }
    `}

    /* Modern button styling with enhanced UX */
    button, .terminal-button {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      ${gradientEnabled ? `
        background: linear-gradient(135deg, 
          hsl(${colors.background} / 0.95) 0%, 
          hsl(${colors.accent} / ${mode === 'dark' ? '0.15' : '0.08'}) 50%,
          hsl(${colors.background} / 0.98) 100%) !important;
        backdrop-filter: blur(8px) !important;
      ` : `
        background: hsl(${colors.background}) !important;
      `}
      border: 2px solid hsl(${colors.accent} / ${mode === 'dark' ? '0.6' : '0.5'}) !important;
      box-shadow: 
        0 3px 12px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.3' : '0.1'}),
        0 1px 3px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.2' : '0.05'}),
        inset 0 1px 0 rgba(255, 255, 255, ${mode === 'dark' ? '0.1' : '0.4'}) !important;
      color: hsl(${colors.foreground}) !important;
      font-weight: ${mode === 'light' ? '600' : '500'} !important;
      border-radius: 8px !important;
      padding: 8px 16px !important;
    }

    button:hover, .terminal-button:hover {
      ${gradientEnabled ? `
        background: linear-gradient(135deg, 
          hsl(${colors.accent} / ${mode === 'dark' ? '0.2' : '0.12'}) 0%, 
          hsl(${colors.bright} / ${mode === 'dark' ? '0.15' : '0.08'}) 50%,
          hsl(${colors.accent} / ${mode === 'dark' ? '0.25' : '0.15'}) 100%) !important;
      ` : `
        background: hsl(${colors.accent} / ${mode === 'dark' ? '0.2' : '0.15'}) !important;
      `}
      border-color: hsl(${colors.accent} / ${mode === 'dark' ? '0.8' : '0.8'}) !important;
      box-shadow: 
        0 6px 20px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.4' : '0.15'}),
        0 3px 8px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.3' : '0.08'}),
        0 0 0 2px hsl(${colors.accent} / ${mode === 'dark' ? '0.3' : '0.2'}),
        inset 0 1px 0 rgba(255, 255, 255, ${mode === 'dark' ? '0.2' : '0.6'}) !important;
      transform: translateY(-1px) scale(1.02) !important;
      color: hsl(${colors.bright}) !important;
    }

    button:active, .terminal-button:active {
      ${gradientEnabled ? `
        background: linear-gradient(135deg, 
          hsl(${colors.accent} / ${mode === 'dark' ? '0.3' : '0.25'}) 0%, 
          hsl(${colors.background} / 0.95) 100%) !important;
      ` : `
        background: hsl(${colors.accent} / ${mode === 'dark' ? '0.3' : '0.25'}) !important;
      `}
      box-shadow: 
        0 1px 4px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.4' : '0.2'}),
        inset 0 2px 4px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.3' : '0.15'}) !important;
      transform: translateY(0px) scale(1.0) !important;
      border-color: hsl(${colors.accent}) !important;
    }

    /* Enhanced background classes with modern design */
    .bg-terminal-accent\\/10, .bg-terminal-accent\\/20, .bg-terminal-accent\\/30 {
      ${gradientEnabled ? `
        background: linear-gradient(135deg, 
          hsl(${colors.background} / 0.98) 0%, 
          hsl(${colors.accent} / ${mode === 'dark' ? '0.12' : '0.06'}) 50%,
          hsl(${colors.background} / 0.95) 100%) !important;
        backdrop-filter: blur(8px) !important;
      ` : `
        background: hsl(${colors.background}) !important;
      `}
      border: 2px solid hsl(${colors.accent} / ${mode === 'dark' ? '0.4' : '0.25'}) !important;
      border-radius: 12px !important;
      box-shadow: 
        0 4px 16px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.3' : '0.06'}),
        0 1px 3px rgba(${mode === 'dark' ? '0,0,0' : '139, 92, 246'}, ${mode === 'dark' ? '0.2' : '0.03'}),
        inset 0 1px 0 rgba(255, 255, 255, ${mode === 'dark' ? '0.1' : '0.3'}) !important;
    }

    .border-terminal-accent\\/30, .border-terminal-accent {
      border-color: hsl(${colors.accent} / ${mode === 'dark' ? '0.6' : '0.4'}) !important;
      box-shadow: 
        0 0 12px hsl(${colors.accent} / ${mode === 'dark' ? '0.3' : '0.15'}) !important,
        inset 0 1px 0 rgba(255, 255, 255, ${mode === 'dark' ? '0.1' : '0.2'}) !important;
    }
    
    .text-terminal-foreground {
      color: hsl(${colors.foreground}) !important;
      text-shadow: 0 1px 2px rgba(${mode === 'dark' ? '0,0,0' : '255,255,255'},${mode === 'dark' ? '0.8' : '0.6'}) !important;
      font-weight: ${mode === 'light' ? '600' : '500'} !important;
    }
    
    .text-terminal-accent {
      color: hsl(${colors.accent}) !important;
      text-shadow: 0 1px 2px rgba(${mode === 'dark' ? '0,0,0' : '255,255,255'},0.7) !important;
    }
    
    .text-terminal-bright {
      color: hsl(${colors.bright}) !important;
      text-shadow: 0 1px 2px rgba(${mode === 'dark' ? '0,0,0' : '255,255,255'},${mode === 'dark' ? '0.7' : '0.9'}) !important;
      font-weight: ${mode === 'light' ? '700' : '600'} !important;
    }

    .text-terminal-dim {
      color: hsl(${colors.dim}) !important;
      text-shadow: 0 1px 2px rgba(${mode === 'dark' ? '0,0,0' : '255,255,255'},${mode === 'dark' ? '0.5' : '0.7'}) !important;
      font-weight: ${mode === 'light' ? '500' : '400'} !important;
    }
    
    .border-terminal-accent {
      border-color: hsl(${colors.accent}) !important;
    }
    
    /* Force button styling with proper contrast */
    button, .btn {
      background-color: hsl(${colors.background}) !important;
      border: 1px solid hsl(${colors.accent}) !important;
      color: hsl(${colors.foreground}) !important;
    }
    
    button:hover, .btn:hover {
      background-color: hsl(${colors.accent}) !important;
      color: hsl(${colors.background}) !important;
    }
    
    /* Terminal button specific styling */
    .terminal-button {
      background-color: transparent !important;
      border: 1px solid hsl(${colors.accent}) !important;
      color: hsl(${colors.accent}) !important;
      padding: 8px 12px !important;
      transition: all 0.2s ease !important;
    }
    
    .terminal-button:hover {
      background-color: hsl(${colors.accent}) !important;
      color: hsl(${colors.background}) !important;
    }
    
    /* Theme Hammer buttons - special styling */
    .theme-hammer button {
      background-color: hsl(${colors.accent}) !important;
      color: hsl(${colors.background}) !important;
      border: 1px solid hsl(${colors.bright}) !important;
    }
    
    .theme-hammer button:hover {
      background-color: hsl(${colors.bright}) !important;
      color: hsl(${colors.background}) !important;
    }
    
    /* Force input styling */
    input, textarea, select {
      background-color: hsl(${colors.background}) !important;
      color: hsl(${colors.foreground}) !important;
      border-color: hsl(${colors.dim}) !important;
    }
    
    /* Debug indicator */
    body::before {
      content: "${preset}-${mode}${gradientEnabled ? '-gradient' : ''}";
      position: fixed;
      top: 0;
      left: 0;
      background: hsl(${colors.accent});
      color: hsl(${colors.background});
      padding: 4px 8px;
      font-size: 12px;
      z-index: 9999;
      font-family: monospace;
    }
  `;
  
  document.head.appendChild(style);
  
  // Also set document attributes for CSS selectors
  document.documentElement.className = `theme-${preset} mode-${mode} ${gradientEnabled ? 'gradient-enabled' : 'gradient-disabled'}`;
  document.documentElement.setAttribute('data-theme-preset', preset);
  document.documentElement.setAttribute('data-theme-mode', mode);
  document.documentElement.setAttribute('data-gradient', gradientEnabled.toString());
  
  // Only log theme injection in development mode
  if (import.meta.env.DEV) {

  }
};

export type ThemeMode = 'dark' | 'light';
export type ThemePreset = 'terminal' | 'ocean' | 'forest' | 'sunset' | 'minimal' | 'white' | 'reading' | 'soft';

interface ThemeContextType {
  mode: ThemeMode;
  preset: ThemePreset;
  gradientEnabled: boolean;
  brightness: number;
  toggleMode: () => void;
  setPreset: (preset: ThemePreset) => void;
  toggleGradient: () => void;
  setBrightness: (brightness: number) => void;
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
  white: {
    dark: {
      background: '0 0% 8%',
      foreground: '0 0% 95%',
      accent: '0 0% 85%',
      bright: '0 0% 100%',
      dim: '0 0% 60%',
    },
    light: {
      background: '0 0% 100%',
      foreground: '262 83% 15%',
      accent: '262 100% 65%',
      bright: '262 100% 50%',
      dim: '262 40% 70%',
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
  },
  soft: {
    dark: {
      background: '220 15% 18%',
      foreground: '220 8% 75%',
      accent: '220 12% 55%',
      bright: '220 8% 85%',
      dim: '220 6% 45%',
    },
    light: {
      background: '220 20% 94%',
      foreground: '220 15% 30%',
      accent: '220 25% 65%',
      bright: '220 15% 20%',
      dim: '220 10% 55%',
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
    return saved === 'true' ? true : false; // Default to false (gradient off)
  });

  const [brightness, setBrightnessState] = useState(() => {
    const saved = localStorage.getItem('theme-brightness');
    return saved ? parseInt(saved) : 100;
  });

  useEffect(() => {
    const colors = themePresets[preset][mode];
    
    // Use the force injection utility
    injectThemeStyles(preset, mode, gradientEnabled, brightness, colors);
    
    // Save settings
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-preset', preset);
    localStorage.setItem('theme-gradient', String(gradientEnabled));
    localStorage.setItem('theme-brightness', String(brightness));
    
    // Removed forced reflow - causes performance issues
    // Theme changes are applied immediately via CSS injection
    
  }, [mode, preset, gradientEnabled, brightness]);

  const toggleMode = () => {
    setMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
  };

  const toggleGradient = () => {
    setGradientEnabled(prev => !prev);
  };

  const setBrightness = (newBrightness: number) => {
    const clampedBrightness = Math.max(20, Math.min(200, newBrightness));
    setBrightnessState(clampedBrightness);
  };

  return (
    <ThemeContext.Provider value={{ mode, preset, gradientEnabled, brightness, toggleMode, setPreset, toggleGradient, setBrightness }}>
      {children}
    </ThemeContext.Provider>
  );
};
