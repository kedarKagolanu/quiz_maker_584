/**
 * @fileoverview Application Entry Point
 * @description Main entry point that initializes and renders the React application
 * @author Quiz Application Team
 * @version 2.0.0
 */

// React DOM utilities for rendering
import { createRoot } from "react-dom/client";

// Main application component
import App from "./App.tsx";

// Global styles
import "./index.css";        // Base Tailwind CSS styles
import './quiz-override.css' // Quiz-specific style overrides

// Theme system
import { ThemeProvider } from "./contexts/ThemeContext";

/**
 * Application Bootstrap
 * @description Creates React root and renders the application with theme provider
 * 
 * RENDERING STRATEGY:
 * 1. Get root DOM element (guaranteed to exist by HTML template)
 * 2. Create React 18 concurrent root
 * 3. Render app wrapped in ThemeProvider for global theme support
 * 
 * Note: ThemeProvider is included here AND in App.tsx to ensure theme
 * consistency during the initial render phase
 */
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

/**
 * PWA Service Worker Registration
 * @description Registers service worker for offline functionality and app-like experience
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('🚀 QuizForge Service Worker registered successfully:', registration.scope);
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker installed, prompt user to refresh
              console.log('🔄 New version available! Please refresh the page.');
              // Could show a toast here asking user to refresh
            }
          });
        }
      });
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
  
  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('📦 Cache updated:', event.data.cacheName);
    }
  });
}
