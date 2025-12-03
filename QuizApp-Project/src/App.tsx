/**
 * @fileoverview Main Application Component
 * @description Root application component that sets up routing, providers, and lazy loading
 * @author Quiz Application Team
 * @version 2.0.0
 */

// UI Component Imports - Toast notifications and tooltips
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Routing Components - React Router for navigation
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Context Providers - Application state management
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MusicProvider } from "./contexts/MusicContext";
import { CacheProvider } from "./contexts/CacheContext";

// React Utilities - Performance optimization
import { Suspense, lazy } from "react";

// Global Components - Always available components
import { MusicPlayer } from "@/components/MusicPlayer";
import { MobileNavigation } from "@/components/MobileNavigation";

/**
 * CRITICAL PAGES - Loaded synchronously for immediate access
 * These pages are essential for initial user experience and must be available instantly
 */
import { Auth } from "./pages/Auth";             // Authentication/Login page
import { ResetPassword } from "./pages/ResetPassword"; // Password reset functionality  
import { Dashboard } from "./pages/Dashboard";   // Main dashboard - first page users see
import NotFound from "./pages/NotFound";         // 404 error page

/**
 * FEATURE PAGES - Lazy loaded for performance optimization
 * These pages are loaded on-demand to reduce initial bundle size
 * Each lazy import includes specific export mapping for better tree-shaking
 */
const QuizCreator = lazy(() => import("./pages/QuizCreator").then(m => ({ default: m.QuizCreator })));
const QuizTaker = lazy(() => import("./pages/QuizTaker").then(m => ({ default: m.QuizTaker })));
const Results = lazy(() => import("./pages/Results").then(m => ({ default: m.Results })));
const Leaderboard = lazy(() => import("./pages/Leaderboard").then(m => ({ default: m.Leaderboard })));
const MyQuizzesExplorer = lazy(() => import("./pages/MyQuizzesExplorer").then(m => ({ default: m.MyQuizzesExplorer })));
const QuizPermissions = lazy(() => import("./pages/QuizPermissions").then(m => ({ default: m.QuizPermissions })));
const Chat = lazy(() => import("./pages/Chat").then(m => ({ default: m.Chat })));
const QuizCustomizer = lazy(() => import("./pages/QuizCustomizer").then(m => ({ default: m.QuizCustomizer })));
const QuizCustomizerAdvanced = lazy(() => import("./pages/QuizCustomizerAdvanced").then(m => ({ default: m.QuizCustomizerAdvanced })));
const UnifiedQuizAdvanced = lazy(() => import("./pages/UnifiedQuizAdvanced"));
const QuizBrowser = lazy(() => import("./pages/QuizBrowser").then(m => ({ default: m.QuizBrowser })));
const MusicLibrary = lazy(() => import("./pages/MusicLibrary").then(m => ({ default: m.MusicLibrary })));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const AIQuizGenerator = lazy(() => import("./pages/AIQuizGenerator").then(m => ({ default: m.AIQuizGeneratorPage })));

/**
 * Loading Fallback Component
 * @description Displays a loading spinner while lazy-loaded components are being fetched
 * @returns {JSX.Element} Centered loading spinner with theme-aware styling
 */
const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-terminal">
    <div className="text-center">
      {/* Animated spinner with theme colors */}
      <div className="animate-spin w-8 h-8 border-2 border-terminal-accent border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-terminal-bright">Loading...</p>
    </div>
  </div>
);

/**
 * Protected Route Component
 * @description Wrapper component that ensures only authenticated users can access protected pages
 * @param {React.ReactNode} children - Child components to render if user is authenticated
 * @returns {JSX.Element} Either the protected content or redirect to login
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  // Redirect to login if user is not authenticated
  return user ? <>{children}</> : <Navigate to="/" />;
};

/**
 * Main Application Component
 * @description Root component that sets up the entire application architecture with providers and routing
 * @returns {JSX.Element} Complete application with all providers and routes configured
 * 
 * ARCHITECTURE OVERVIEW:
 * 1. ThemeProvider - Global theming system (outer layer)
 * 2. MusicProvider - Background music management
 * 3. CacheProvider - Data caching and performance optimization
 * 4. AuthProvider - User authentication and session management
 * 5. TooltipProvider - UI tooltip functionality
 * 6. BrowserRouter - Client-side routing
 * 7. Suspense - Lazy loading fallback handling
 * 8. Routes - Application page routing configuration
 */
const App = () => (
  <ThemeProvider>
    <MusicProvider>
      <CacheProvider>
        <AuthProvider>
          <TooltipProvider>
          {/* Global toast notification systems */}
          <Toaster />
          <Sonner />
          
          {/* Client-side routing setup */}
          <BrowserRouter>
            {/* Lazy loading wrapper with fallback */}
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* PUBLIC ROUTES - No authentication required */}
                <Route path="/" element={<Auth />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* PROTECTED ROUTES - Authentication required */}
                {/* Core Application Pages */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                
                {/* Quiz Management */}
                <Route path="/create" element={<ProtectedRoute><QuizCreator /></ProtectedRoute>} />
                <Route path="/my-quizzes" element={<ProtectedRoute><MyQuizzesExplorer /></ProtectedRoute>} />
                <Route path="/browse-quizzes" element={<ProtectedRoute><QuizBrowser /></ProtectedRoute>} />
                
                {/* Quiz Taking & Results */}
                <Route path="/quiz/:id/take" element={<ProtectedRoute><QuizTaker /></ProtectedRoute>} />
                <Route path="/quiz/:id" element={<ProtectedRoute><QuizTaker /></ProtectedRoute>} />
                <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
                <Route path="/leaderboard/:id" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                
                {/* Quiz Customization */}
                <Route path="/quiz/:id/customize" element={<ProtectedRoute><QuizCustomizer /></ProtectedRoute>} />
                <Route path="/quiz/:id/customize-advanced" element={<ProtectedRoute><QuizCustomizerAdvanced /></ProtectedRoute>} />
                <Route path="/quiz/:quizId/advanced" element={<ProtectedRoute><UnifiedQuizAdvanced /></ProtectedRoute>} />
                <Route path="/advanced" element={<ProtectedRoute><UnifiedQuizAdvanced /></ProtectedRoute>} />
                
                {/* Permissions & Sharing */}
                <Route path="/quiz-permissions/:quizId" element={<ProtectedRoute><QuizPermissions /></ProtectedRoute>} />
                
                {/* AI Features */}
                <Route path="/ai-generator" element={<ProtectedRoute><AIQuizGenerator /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                
                {/* Media & User Management */}
                <Route path="/music-library" element={<ProtectedRoute><MusicLibrary /></ProtectedRoute>} />
                <Route path="/profile/:username?" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                
                {/* Legacy Routes */}
                <Route path="/my-quizzes-explorer" element={<ProtectedRoute><MyQuizzesExplorer /></ProtectedRoute>} />
                
                {/* Fallback Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            
            {/* Global Music Player - Always available */}
            <MusicPlayer isAdvanced={true} />
            
            {/* Mobile Navigation - Only shows on mobile devices */}
            <MobileNavigation />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </CacheProvider>
    </MusicProvider>
  </ThemeProvider>
);

export default App;
