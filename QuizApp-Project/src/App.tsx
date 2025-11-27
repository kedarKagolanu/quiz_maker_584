import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MusicPlayer } from "@/components/MusicPlayer";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MusicProvider } from "./contexts/MusicContext";
import { Suspense, lazy } from "react";

// Critical pages - keep synchronous
import { Auth } from "./pages/Auth";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Heavy pages - lazy load
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

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-terminal">
    <div className="text-center">
      <div className="animate-spin w-8 h-8 border-2 border-terminal-accent border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-terminal-bright">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/" />;
};

const App = () => (
  <ThemeProvider>
    <MusicProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><QuizCreator /></ProtectedRoute>} />
              <Route path="/my-quizzes" element={<ProtectedRoute><MyQuizzesExplorer /></ProtectedRoute>} />
              <Route path="/quiz-permissions/:quizId" element={<ProtectedRoute><QuizPermissions /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/browse-quizzes" element={<ProtectedRoute><QuizBrowser /></ProtectedRoute>} />
              <Route path="/music-library" element={<ProtectedRoute><MusicLibrary /></ProtectedRoute>} />
              <Route path="/quiz/:id/customize" element={<ProtectedRoute><QuizCustomizer /></ProtectedRoute>} />
              <Route path="/quiz/:id/customize-advanced" element={<ProtectedRoute><QuizCustomizerAdvanced /></ProtectedRoute>} />
              <Route path="/quiz/:quizId/advanced" element={<ProtectedRoute><UnifiedQuizAdvanced /></ProtectedRoute>} />
              <Route path="/advanced" element={<ProtectedRoute><UnifiedQuizAdvanced /></ProtectedRoute>} />
              <Route path="/quiz/:id/take" element={<ProtectedRoute><QuizTaker /></ProtectedRoute>} />
              <Route path="/profile/:username?" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/quiz/:id" element={<ProtectedRoute><QuizTaker /></ProtectedRoute>} />
              <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
              <Route path="/leaderboard/:id" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="/my-quizzes-explorer" element={<ProtectedRoute><MyQuizzesExplorer /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <MusicPlayer isAdvanced={true} />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
    </MusicProvider>
  </ThemeProvider>
);

export default App;
