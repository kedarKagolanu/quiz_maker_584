import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizAttempt, User, QuizFolder } from "@/types/quiz";
import { Trophy, FileText, History, User as UserIcon, Upload, Loader2, Music } from "lucide-react";
import { toast } from "sonner";
import { quizSchema, folderNameSchema, validateInput } from "@/lib/validation";
import { handleError } from "@/lib/errorHandler";

export const Profile: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userQuizzes, setUserQuizzes] = useState<Quiz[]>([]);
  const [userAttempts, setUserAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);

  // Check if database is configured
  const isDatabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  useEffect(() => {
    if (!currentUser) {
      navigate("/");
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        
        // Load user data - find by username or show current user
        const users = await storage.getUsers();
        const targetUser = username 
          ? users.find((u) => u.username === username)
          : users.find((u) => u.id === currentUser.id);
        
        if (!targetUser) {
          navigate("/dashboard");
          return;
        }
        
        setProfileUser(targetUser);
        
        // Load user's quizzes
        const quizzes = await storage.getUserQuizzes(targetUser.id);
        setUserQuizzes(quizzes);
        
        // Load user's attempts
        const attempts = await storage.getUserAttempts(targetUser.id);
        setUserAttempts(attempts);
      } catch (error) {
        handleError(error, { userMessage: "Failed to load profile" });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser, username, navigate]);

  if (loading || !profileUser) {
    return (
      <Terminal title="loading profile...">
        <TerminalLine prefix="~">Loading user profile...</TerminalLine>
      </Terminal>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const avgScore = userAttempts.length > 0
    ? (userAttempts.reduce((acc, a) => acc + a.score, 0) / userAttempts.length).toFixed(1)
    : "N/A";

  // Get quiz details for attempts
  const getQuizTitle = async (quizId: string) => {
    const quiz = await storage.getQuizById(quizId);
    return quiz?.title || "Unknown Quiz";
  };

  const handleMigrateLocalStorage = async () => {
    if (!isDatabaseConfigured) {
      toast.error("Database not configured. Please set up a database backend first.");
      return;
    }

    if (!isOwnProfile) {
      toast.error("You can only migrate your own data.");
      return;
    }

    try {
      setMigrating(true);
      
      // Get all localStorage data
      const localUsers: User[] = JSON.parse(localStorage.getItem("users") || "[]");
      const localQuizzes: Quiz[] = JSON.parse(localStorage.getItem("quizzes") || "[]");
      const localAttempts: QuizAttempt[] = JSON.parse(localStorage.getItem("attempts") || "[]");
      const localFolders: QuizFolder[] = JSON.parse(localStorage.getItem("folders") || "[]");
      
      let migratedCount = 0;

      // Migrate current user's quizzes
      const userQuizzesToMigrate = localQuizzes.filter(q => q.creator === currentUser?.id);
      for (const quiz of userQuizzesToMigrate) {
        try {
          // Validate quiz before migration
          const validation = validateInput(quizSchema, quiz);
          if (validation.success === false) {
            console.warn(`Skipping invalid quiz ${quiz.id}:`, validation.error);
            continue;
          }
          await storage.saveQuiz(quiz);
          migratedCount++;
        } catch (error) {
          handleError(error, { 
            userMessage: `Failed to migrate quiz: ${quiz.title}`,
            logToConsole: true,
            showToast: false
          });
        }
      }

      // Migrate current user's attempts
      const userAttemptsToMigrate = localAttempts.filter(a => a.userId === currentUser?.id);
      for (const attempt of userAttemptsToMigrate) {
        try {
          await storage.saveAttempt(attempt);
          migratedCount++;
        } catch (error) {
          handleError(error, { 
            userMessage: `Failed to migrate attempt`,
            logToConsole: true,
            showToast: false
          });
        }
      }

      // Migrate current user's folders
      const userFoldersToMigrate = localFolders.filter(f => f.creator === currentUser?.id);
      for (const folder of userFoldersToMigrate) {
        try {
          // Validate folder name
          const validation = validateInput(folderNameSchema, folder.name);
          if (validation.success === false) {
            console.warn(`Skipping invalid folder ${folder.id}:`, validation.error);
            continue;
          }
          await storage.saveFolder(folder);
          migratedCount++;
        } catch (error) {
          handleError(error, { 
            userMessage: `Failed to migrate folder: ${folder.name}`,
            logToConsole: true,
            showToast: false
          });
        }
      }

      // Reload profile data
      const quizzes = await storage.getUserQuizzes(currentUser.id);
      setUserQuizzes(quizzes);
      
      const attempts = await storage.getUserAttempts(currentUser.id);
      setUserAttempts(attempts);

      toast.success(`Successfully migrated ${migratedCount} items to database!`, {
        description: "Your localStorage data has been uploaded to the backend."
      });
    } catch (error) {
      handleError(error, { userMessage: "Failed to migrate data. Please try again." });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Terminal title={`profile - ${profileUser.username}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-terminal-accent/20 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-terminal-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-terminal-bright">{profileUser.username}</h1>
              <p className="text-sm text-terminal-dim">
                Member since {new Date(profileUser.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isOwnProfile && isDatabaseConfigured && (
              <TerminalButton 
                onClick={handleMigrateLocalStorage}
                disabled={migrating}
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    migrating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    migrate localStorage
                  </>
                )}
              </TerminalButton>
            )}
            {isOwnProfile && (
              <TerminalButton onClick={() => navigate("/dashboard")}>
                dashboard
              </TerminalButton>
            )}
            <TerminalButton onClick={() => navigate(-1)}>back</TerminalButton>
          </div>
        </div>

        {/* Stats */}
        <div>
          <TerminalLine prefix="#">Statistics</TerminalLine>
          <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="border border-terminal-accent/30 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-terminal-accent" />
                <span className="text-terminal-dim">Quizzes Created</span>
              </div>
              <p className="text-3xl font-bold text-terminal-bright">{userQuizzes.length}</p>
            </div>
            <div className="border border-terminal-accent/30 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-5 h-5 text-terminal-accent" />
                <span className="text-terminal-dim">Attempts</span>
              </div>
              <p className="text-3xl font-bold text-terminal-bright">{userAttempts.length}</p>
            </div>
            <div className="border border-terminal-accent/30 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-terminal-accent" />
                <span className="text-terminal-dim">Average Score</span>
              </div>
              <p className="text-3xl font-bold text-terminal-bright">{avgScore}%</p>
            </div>
          </div>
        </div>

        {/* Created Quizzes */}
        <div>
          <TerminalLine prefix="#">Created Quizzes</TerminalLine>
          {userQuizzes.length === 0 ? (
            <TerminalLine prefix="-" className="ml-6 text-terminal-dim">
              No quizzes created yet
            </TerminalLine>
          ) : (
            <div className="ml-6 space-y-2 mt-2">
              {userQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center justify-between border border-terminal-accent/30 p-3 rounded"
                >
                  <div>
                    <div className="text-terminal-bright">{quiz.title}</div>
                    <div className="text-sm text-terminal-dim">
                      {quiz.questions.length} questions • {quiz.isPublic ? "Public" : "Private"}
                      {quiz.folderPath && ` • ${quiz.folderPath}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <TerminalButton onClick={() => navigate(`/quiz/${quiz.id}`)}>
                      start
                    </TerminalButton>
                    {isOwnProfile && (
                      <TerminalButton onClick={() => navigate(`/create?edit=${quiz.id}`)}>
                        edit
                      </TerminalButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Music Library */}
        {isOwnProfile && (
          <div>
            <TerminalLine prefix="#">Music Library</TerminalLine>
            {(!profileUser.musicFiles || profileUser.musicFiles.length === 0) ? (
              <TerminalLine prefix="-" className="ml-6 text-terminal-dim">
                No music files uploaded yet. Upload music when creating or editing a quiz.
              </TerminalLine>
            ) : (
              <div className="ml-6 space-y-2 mt-2">
                {profileUser.musicFiles.map((music, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border border-terminal-accent/30 p-3 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 text-terminal-accent" />
                      <div>
                        <div className="text-terminal-bright">{music.name}</div>
                        <div className="text-xs text-terminal-dim">Audio file</div>
                      </div>
                    </div>
                    <audio controls className="max-w-xs">
                      <source src={music.url} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quiz Attempts History */}
        <div>
          <TerminalLine prefix="#">Quiz Attempt History</TerminalLine>
          {userAttempts.length === 0 ? (
            <TerminalLine prefix="-" className="ml-6 text-terminal-dim">
              No attempts recorded
            </TerminalLine>
          ) : (
            <div className="ml-6 space-y-2 mt-2 max-h-96 overflow-y-auto">
              {userAttempts
                .sort((a, b) => b.completedAt - a.completedAt)
                .map((attempt) => (
                  <AttemptCard key={attempt.id} attempt={attempt} />
                ))}
            </div>
          )}
        </div>
      </div>
    </Terminal>
  );
};

const AttemptCard: React.FC<{ attempt: QuizAttempt }> = ({ attempt }) => {
  const navigate = useNavigate();
  const [quizTitle, setQuizTitle] = useState<string>("Loading...");

  useEffect(() => {
    const loadQuiz = async () => {
      const quiz = await storage.getQuizById(attempt.quizId);
      setQuizTitle(quiz?.title || "Unknown Quiz");
    };
    loadQuiz();
  }, [attempt.quizId]);

  return (
    <div className="border border-terminal-accent/30 p-3 rounded">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-terminal-bright">{quizTitle}</div>
          <div className="text-sm text-terminal-dim mt-1">
            Score: {attempt.score.toFixed(1)}% • Time: {Math.floor(attempt.totalTime / 60)}m{" "}
            {Math.round(attempt.totalTime % 60)}s • {new Date(attempt.completedAt).toLocaleString()}
          </div>
        </div>
        <TerminalButton onClick={() => navigate(`/results/${attempt.id}`)}>
          view details
        </TerminalButton>
      </div>
    </div>
  );
};
