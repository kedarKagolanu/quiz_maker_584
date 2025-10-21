import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MusicPlayerAdvanced } from "@/components/MusicPlayerAdvanced";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { QuizCreator } from "./pages/QuizCreator";
import { QuizTaker } from "./pages/QuizTaker";
import { Results } from "./pages/Results";
import { Leaderboard } from "./pages/Leaderboard";
import { MyQuizzes } from "./pages/MyQuizzes";
import { MyQuizzesExplorer } from "./pages/MyQuizzesExplorer";
import { Admin } from "./pages/Admin";
import { Profile } from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><QuizCreator /></ProtectedRoute>} />
            <Route path="/my-quizzes" element={<ProtectedRoute><MyQuizzesExplorer /></ProtectedRoute>} />
            <Route path="/profile/:userId?" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/quiz/:id" element={<ProtectedRoute><QuizTaker /></ProtectedRoute>} />
            <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/leaderboard/:id" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <MusicPlayerAdvanced />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
