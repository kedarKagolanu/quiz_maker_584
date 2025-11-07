import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizAttempt, User } from "@/types/quiz";
import { Users, FileText, Trophy, Activity, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandler";

export const Admin: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuizzes: 0,
    totalAttempts: 0,
    avgScore: 0,
    publicQuizzes: 0,
    privateQuizzes: 0,
  });
  const [selectedView, setSelectedView] = useState<'overview' | 'users' | 'quizzes'>('overview');

  useEffect(() => {
    // Check if using database backend (not localStorage)
    const isUsingDatabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!isUsingDatabase) {
      toast.error("Admin dashboard is only available when using database backend");
      navigate("/");
      return;
    }

    if (!user) {
      navigate("/");
      return;
    }

    // Check if user has admin role
    if (!isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
      return;
    }

    loadData();
  }, [user, isAdmin, navigate]);

  const loadData = async () => {
    try {
      const [allUsers, allQuizzes, allAttempts] = await Promise.all([
        storage.getUsers(),
        storage.getQuizzes(),
        storage.getAttempts(),
      ]);

      setUsers(allUsers);
      setQuizzes(allQuizzes);
      setAttempts(allAttempts);

      const publicQuizzes = allQuizzes.filter((q) => q.isPublic).length;
      const avgScore = allAttempts.length > 0
        ? allAttempts.reduce((sum, a) => sum + a.score, 0) / allAttempts.length
        : 0;

      setStats({
        totalUsers: allUsers.length,
        totalQuizzes: allQuizzes.length,
        totalAttempts: allAttempts.length,
        avgScore: Math.round(avgScore * 100) / 100,
        publicQuizzes,
        privateQuizzes: allQuizzes.length - publicQuizzes,
      });
    } catch (error) {
      handleError(error, { 
        userMessage: "Failed to load admin data. You may not have admin permissions." 
      });
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    
    try {
      await storage.deleteQuiz(quizId);
      await loadData();
      toast.success("Quiz deleted");
    } catch (error) {
      handleError(error, { userMessage: "Failed to delete quiz" });
    }
  };

  const getQuizCreatorName = (creatorId: string) => {
    const creator = users.find((u) => u.id === creatorId);
    return creator?.username || "Unknown";
  };

  const getUserAttemptCount = (userId: string) => {
    return attempts.filter((a) => a.userId === userId).length;
  };

  const getUserAvgScore = (userId: string) => {
    const userAttempts = attempts.filter((a) => a.userId === userId);
    if (userAttempts.length === 0) return 0;
    const avg = userAttempts.reduce((sum, a) => sum + a.score, 0) / userAttempts.length;
    return Math.round(avg * 100) / 100;
  };

  return (
    <Terminal title="admin-dashboard">
      <TerminalLine className="text-terminal-bright">
        🔐 Admin Dashboard
      </TerminalLine>
      <TerminalLine className="text-terminal-dim">
        System administration and analytics
      </TerminalLine>

      <div className="flex gap-2 my-6">
        <TerminalButton
          onClick={() => setSelectedView('overview')}
          className={selectedView === 'overview' ? 'bg-terminal-accent' : ''}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Overview
        </TerminalButton>
        <TerminalButton
          onClick={() => setSelectedView('users')}
          className={selectedView === 'users' ? 'bg-terminal-accent' : ''}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Users ({stats.totalUsers})
        </TerminalButton>
        <TerminalButton
          onClick={() => setSelectedView('quizzes')}
          className={selectedView === 'quizzes' ? 'bg-terminal-accent' : ''}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Quizzes ({stats.totalQuizzes})
        </TerminalButton>
      </div>

      {selectedView === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="border border-terminal-accent/30 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-terminal-accent" />
                <span className="text-terminal-dim text-sm">Total Users</span>
              </div>
              <div className="text-2xl font-bold text-terminal-bright">{stats.totalUsers}</div>
            </div>

            <div className="border border-terminal-accent/30 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-terminal-accent" />
                <span className="text-terminal-dim text-sm">Total Quizzes</span>
              </div>
              <div className="text-2xl font-bold text-terminal-bright">{stats.totalQuizzes}</div>
              <div className="text-xs text-terminal-dim mt-1">
                {stats.publicQuizzes} public / {stats.privateQuizzes} private
              </div>
            </div>

            <div className="border border-terminal-accent/30 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-terminal-accent" />
                <span className="text-terminal-dim text-sm">Total Attempts</span>
              </div>
              <div className="text-2xl font-bold text-terminal-bright">{stats.totalAttempts}</div>
              <div className="text-xs text-terminal-dim mt-1">
                Avg score: {stats.avgScore}%
              </div>
            </div>
          </div>

          <div className="border border-terminal-accent/30 rounded p-4 mt-4">
            <h3 className="text-terminal-bright font-semibold mb-3">Recent Activity</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attempts.slice(0, 10).map((attempt) => {
                const quiz = quizzes.find((q) => q.id === attempt.quizId);
                const user = users.find((u) => u.id === attempt.userId);
                return (
                  <div key={attempt.id} className="text-sm text-terminal-foreground border-l-2 border-terminal-accent/50 pl-3">
                    <span className="text-terminal-bright">{user?.username || 'Unknown'}</span>
                    {' completed '}
                    <span className="text-terminal-accent">{quiz?.title || 'Unknown Quiz'}</span>
                    {' with '}
                    <span className={attempt.score >= 70 ? 'text-green-400' : 'text-red-400'}>
                      {attempt.score}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedView === 'users' && (
        <div className="space-y-2">
          <div className="border border-terminal-accent/30 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-terminal-accent/10">
                <tr className="text-left">
                  <th className="p-3 text-terminal-bright">Username</th>
                  <th className="p-3 text-terminal-bright">Created</th>
                  <th className="p-3 text-terminal-bright">Attempts</th>
                  <th className="p-3 text-terminal-bright">Avg Score</th>
                  <th className="p-3 text-terminal-bright">Quizzes</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const userQuizCount = quizzes.filter((q) => q.creator === u.id).length;
                  return (
                    <tr key={u.id} className="border-t border-terminal-accent/30 hover:bg-terminal-accent/5">
                      <td className="p-3 text-terminal-foreground">{u.username}</td>
                      <td className="p-3 text-terminal-dim">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-terminal-foreground">{getUserAttemptCount(u.id)}</td>
                      <td className="p-3 text-terminal-foreground">{getUserAvgScore(u.id)}%</td>
                      <td className="p-3 text-terminal-foreground">{userQuizCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedView === 'quizzes' && (
        <div className="space-y-2">
          <div className="border border-terminal-accent/30 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-terminal-accent/10">
                <tr className="text-left">
                  <th className="p-3 text-terminal-bright">Title</th>
                  <th className="p-3 text-terminal-bright">Creator</th>
                  <th className="p-3 text-terminal-bright">Questions</th>
                  <th className="p-3 text-terminal-bright">Visibility</th>
                  <th className="p-3 text-terminal-bright">Attempts</th>
                  <th className="p-3 text-terminal-bright">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((quiz) => {
                  const quizAttempts = attempts.filter((a) => a.quizId === quiz.id).length;
                  return (
                    <tr key={quiz.id} className="border-t border-terminal-accent/30 hover:bg-terminal-accent/5">
                      <td className="p-3 text-terminal-foreground">{quiz.title}</td>
                      <td className="p-3 text-terminal-dim">{getQuizCreatorName(quiz.creator)}</td>
                      <td className="p-3 text-terminal-foreground">{quiz.questions.length}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          quiz.isPublic 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {quiz.isPublic ? 'Public' : 'Private'}
                        </span>
                      </td>
                      <td className="p-3 text-terminal-foreground">{quizAttempts}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          title="Delete quiz"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <TerminalButton onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </TerminalButton>
      </div>
    </Terminal>
  );
};
