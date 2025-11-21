import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MusicPlayerAdvanced } from "@/components/MusicPlayerAdvanced";
import { Auth } from "./pages/Auth";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/Dashboard";
import { QuizCreator } from "./pages/QuizCreator";
import { QuizTaker } from "./pages/QuizTaker";
import { Results } from "./pages/Results";
import { Leaderboard } from "./pages/Leaderboard";
import { MyQuizzes } from "./pages/MyQuizzes";
import { MyQuizzesExplorer } from "./pages/MyQuizzesExplorer";
import { QuizPermissions } from "./pages/QuizPermissions";
import { Chat } from "./pages/Chat";
import { QuizCustomizer } from "./pages/QuizCustomizer";
import { QuizBrowser } from "./pages/QuizBrowser";
import { MusicLibrary } from "./pages/MusicLibrary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MusicProvider } from "./contexts/MusicContext";
import { Profile } from "./pages/Profile";
import NotFound from "./pages/NotFound";

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
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><QuizCreator /></ProtectedRoute>} />
            <Route path="/my-quizzes" element={<ProtectedRoute><MyQuizzesExplorer /></ProtectedRoute>} />
            <Route path="/quiz-permissions/:quizId" element={<ProtectedRoute><QuizPermissions /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/browse-quizzes" element={<ProtectedRoute><QuizBrowser /></ProtectedRoute>} />
            <Route path="/music-library" element={<ProtectedRoute><MusicLibrary /></ProtectedRoute>} />
            <Route path="/quiz/:id/customize" element={<ProtectedRoute><QuizCustomizer /></ProtectedRoute>} />
            <Route path="/quiz/:id/take" element={<ProtectedRoute><QuizTaker /></ProtectedRoute>} />
            <Route path="/profile/:username?" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/quiz/:id" element={<ProtectedRoute><QuizTaker /></ProtectedRoute>} />
            <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/leaderboard/:id" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/my-quizzes-explorer" element={<ProtectedRoute><MyQuizzesExplorer /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <MusicPlayerAdvanced />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
    </MusicProvider>
  </ThemeProvider>
);

export default App;
