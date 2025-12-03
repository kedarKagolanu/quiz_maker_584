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
