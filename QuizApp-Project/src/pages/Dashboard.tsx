import React, { useEffect, useState } from "react";
import { getDisplayQuestionCounts } from "@/lib/recursiveQuizResolver";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { CacheMonitor } from "@/components/CacheMonitor";
import { useCacheWarming } from "@/hooks/useCacheWarming";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder } from "@/types/quiz";
import { ChevronRight, ChevronDown, Folder, FileText, Send, MessageCircle, Music, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { ThemeSelector } from "@/components/ThemeSelector";
import { MusicUploader } from "@/components/MusicUploader";
import { useTheme } from "@/contexts/ThemeContext";
import { PageDescription } from "@/components/PageDescription";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Theme Hammer component - Nuclear theme testing
const ThemeHammer: React.FC = () => {
  const { mode, preset, gradientEnabled, brightness, toggleMode, setPreset, toggleGradient, setBrightness } = useTheme();
  
  // Removed excessive logging - only log on changes, not every 2 seconds
  useEffect(() => {
    if (import.meta.env.DEV) {

    }
  }, [mode, preset, gradientEnabled, brightness]);
  
  return (
    <div className="fixed top-4 right-4 z-50 max-w-xs">
      <div className="theme-hammer bg-black/90 border border-white/30 p-3 rounded text-white text-xs">
        <div className="font-bold mb-2 text-yellow-300">🔨 THEME HAMMER</div>
        <div className="space-y-2">
          <div>
            <button onClick={() => setPreset('terminal')} className="mr-1 px-2 py-1 bg-green-600 rounded shadow-md hover:shadow-lg transition-shadow">Terminal</button>
            <button onClick={() => setPreset('ocean')} className="mr-1 px-2 py-1 bg-blue-600 rounded shadow-md hover:shadow-lg transition-shadow">Ocean</button>
            <button onClick={() => setPreset('white')} className="mr-1 px-2 py-1 bg-gray-100 text-black rounded shadow-md hover:shadow-lg transition-shadow">White</button>
            <button onClick={() => setPreset('sunset')} className="px-2 py-1 bg-orange-600 rounded shadow-md hover:shadow-lg transition-shadow">Sunset</button>
          </div>
          <div>
            <button onClick={toggleMode} className="mr-1 px-2 py-1 bg-gray-600 rounded shadow-md hover:shadow-lg transition-shadow">
              {mode === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button onClick={toggleGradient} className="px-2 py-1 bg-purple-600 rounded shadow-md hover:shadow-lg transition-shadow">
              Grad: {gradientEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="text-xs">
            <label className="block text-cyan-300 mb-1">Brightness: {brightness}%</label>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={brightness}
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
        <div className="mt-2 text-green-300">Current: {preset}-{mode}</div>
      </div>
    </div>
  );
};

// Emergency test component
const EmergencyTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any>({});
  
  useEffect(() => {
    const runTests = async () => {
      const results: any = { timestamp: new Date().toISOString() };
      
      try {
        const users = await storage.getUsers();
        results.users = { count: users.length, success: true };
      } catch (error: any) {
        results.users = { success: false, error: error.message };
      }
      
      try {
        const quizzes = await storage.getQuizzes();
        results.quizzes = { count: quizzes.length, success: true };
      } catch (error: any) {
        results.quizzes = { success: false, error: error.message };
      }
      
      setTestResults(results);
    };
    
    runTests();
  }, []);
  
  return (
    <div className="fixed bottom-4 left-4 bg-red-900 border border-red-600 p-3 rounded z-50 text-xs max-w-sm">
      <div className="text-red-100 font-bold mb-2">🚨 Emergency Test</div>
      <div className="space-y-1 text-red-200">
        <div>Users: {testResults.users?.success ? `✅ ${testResults.users.count}` : `❌ ${testResults.users?.error?.substring(0, 30)}...`}</div>
        <div>Quizzes: {testResults.quizzes?.success ? `✅ ${testResults.quizzes.count}` : `❌ ${testResults.quizzes?.error?.substring(0, 30)}...`}</div>
      </div>
    </div>
  );
};

// Temporary full debug component
const FullDebugPanel: React.FC = () => {
  const { user } = useAuth();
  const { mode, preset, gradientEnabled } = useTheme();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkEverything = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        supabaseConfigured: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
        theme: { mode, preset, gradientEnabled },
        cssVars: {
          background: getComputedStyle(document.documentElement).getPropertyValue('--background'),
          terminalAccent: getComputedStyle(document.documentElement).getPropertyValue('--terminal-accent'),
        },
        user: user ? { id: user.id, username: user.username } : null,
        errors: []
      };

      try {
        const users = await storage.getUsers();
        const quizzes = await storage.getQuizzes();
        const groups = await storage.getChatGroups?.() || [];
        
        info.storage = {
          users: users.length,
          quizzes: quizzes.length,
          groups: groups.length
        };
      } catch (error: any) {
        info.errors.push(`Storage Error: ${error.message}`);
      }

      setDebugInfo(info);
      setIsLoading(false);
    };

    checkEverything();
  }, [user, mode, preset, gradientEnabled]);

  if (isLoading) return <div className="fixed top-4 right-4 bg-terminal border border-terminal-accent p-2 rounded z-50 text-xs text-terminal-bright">Loading...</div>;

  return (
    <div className="fixed top-4 right-4 bg-terminal border border-terminal-accent p-3 rounded z-50 text-xs max-w-md max-h-96 overflow-y-auto">
      <div className="text-terminal-bright font-bold mb-2">🔍 Debug Panel</div>
      <div className="space-y-1">
        <div>Supabase: {debugInfo.supabaseConfigured ? '✅' : '❌'}</div>
        <div>Theme: {debugInfo.theme.preset}-{debugInfo.theme.mode}</div>
        <div>CSS Vars: {debugInfo.cssVars.terminalAccent ? '✅' : '❌'}</div>
        <div>User: {debugInfo.user ? '✅ ' + debugInfo.user.username : '❌'}</div>
        {debugInfo.storage && (
          <div>Storage: {debugInfo.storage.users}u, {debugInfo.storage.quizzes}q, {debugInfo.storage.groups}g</div>
        )}
        {debugInfo.errors.map((e: string, i: number) => (
          <div key={i} className="text-red-300">{e}</div>
        ))}
      </div>
    </div>
  );
};

interface FolderTree {
  folder: QuizFolder | null;
  quizzes: Quiz[];
  subFolders: FolderTree[];
}

export const Dashboard: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [availableFolderTree, setAvailableFolderTree] = useState<FolderTree | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [showAccessCodeInput, setShowAccessCodeInput] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [questionCounts, setQuestionCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading dashboard...');
  const [showCacheMonitor, setShowCacheMonitor] = useState(false);

  // Warm up cache automatically
  useCacheWarming();

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const loadData = async () => {
      try {
        setLoadingMessage('Loading quizzes...');
        const allQuizzes = await storage.getQuizzes();
        
        setLoadingMessage('Loading folders...');
        const allFolders = await storage.getFolders();
      
      // User's own quizzes
      setMyQuizzes(allQuizzes.filter((q) => q.creator === user.id));
      
      // Get all accessible quizzes (public + user's own + shared quizzes + access code quizzes)
      const accessibleQuizzes = allQuizzes.filter(
        (q) => q.isPublic || q.creator === user.id || q.sharedWith?.includes(user.id)
      );
      
      // Get all accessible folders (public + user's own + shared folders + access code folders)
      const accessibleFolders = allFolders.filter(
        (f) => f.isPublic || f.creator === user.id || f.sharedWith?.includes(user.id)
      );

      // Calculate folder statistics
      const foldersWithStats = accessibleFolders.map(folder => {
        const folderPath = getFullPath(folder);
        const directQuizzes = accessibleQuizzes.filter(q => q.folderPath === folderPath).length;
        const subFolders = accessibleFolders.filter(f => f.parentPath === folderPath).length;
        
        // Calculate total quizzes recursively
        const calculateTotalQuizzes = (path: string): number => {
          const direct = accessibleQuizzes.filter(q => q.folderPath === path).length;
          const subFolderPaths = accessibleFolders.filter(f => f.parentPath === path).map(f => getFullPath(f));
          const subTotal = subFolderPaths.reduce((sum, subPath) => sum + calculateTotalQuizzes(subPath), 0);
          return direct + subTotal;
        };

        return {
          ...folder,
          directQuizzes,
          totalQuizzes: calculateTotalQuizzes(folderPath),
          totalFolders: subFolders
        };
      });
      
      setLoadingMessage('Building folder tree...');
      // Build hierarchical folder tree with quizzes properly organized
      const tree = buildFolderTree(accessibleQuizzes, foldersWithStats);
      setAvailableFolderTree(tree);
      
      setLoadingMessage('Calculating question counts...');
      // Use simple question counts instead of recursive analysis to prevent performance issues
      const simpleQuestionCounts = new Map();
      accessibleQuizzes.forEach(quiz => {
        // For multi-quiz, use a simple estimation to avoid expensive recursive calls
        if (quiz.multiQuizSources && quiz.multiQuizSources.length > 0) {
          // Estimate based on sources count - don't do expensive recursive resolution
          simpleQuestionCounts.set(quiz.id, quiz.multiQuizSources.length * 10); // Rough estimate
        } else {
          simpleQuestionCounts.set(quiz.id, quiz.questions?.length || 0);
        }
      });
      setQuestionCounts(simpleQuestionCounts);
      
      setLoadingMessage('Loading user statistics...');
      const userAttempts = await storage.getUserAttempts(user.id);
      setAttempts(userAttempts);
      
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Error loading data. Please refresh the page.');
        // Force dismiss loading toast on error
        toast.dismiss('dashboard-loading');
      } finally {
        setIsLoading(false);
        // Ensure loading toast is dismissed when loading completes
        setTimeout(() => {
          toast.dismiss('dashboard-loading');
        }, 100); // Small delay to ensure state update completes
      }
    };
    loadData();
  }, [user, navigate]);

  const buildFolderTree = (quizzes: Quiz[], folders: QuizFolder[]): FolderTree => {
    // Root level - quizzes without folder path (independent quizzes only)
    const rootQuizzes = quizzes.filter(q => !q.folderPath || q.folderPath === '');
    
    // Root level folders - folders without parent path (root folders only)
    const rootFolders = folders.filter(f => !f.parentPath || f.parentPath === '');
    
    // Recursively build subfolder tree
    const buildSubTree = (parentPath: string): FolderTree[] => {
      const childFolders = folders.filter(f => f.parentPath === parentPath);
      
      return childFolders.map(folder => {
        const fullPath = getFullPath(folder);
        return {
          folder,
          quizzes: quizzes.filter(q => q.folderPath === fullPath),
          subFolders: buildSubTree(fullPath)
        };
      });
    };
    
    // Build root tree
    const rootSubFolders = rootFolders.map(folder => {
      const fullPath = getFullPath(folder);
      return {
        folder,
        quizzes: quizzes.filter(q => q.folderPath === fullPath),
        subFolders: buildSubTree(fullPath)
      };
    });
    
    return {
      folder: null, // Root
      quizzes: rootQuizzes,
      subFolders: rootSubFolders
    };
  };

  const getFullPath = (folder: QuizFolder): string => {
    return folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderFolderTree = (tree: FolderTree, depth: number = 0): React.ReactNode => {
    const folderId = tree.folder?.id || 'root';
    const isExpanded = expandedFolders.has(folderId);
    const indent = depth * 20;

    return (
      <div key={folderId}>
        {tree.folder && (
          <div 
            className="flex items-center gap-2 p-2 hover:bg-terminal-accent/10 cursor-pointer rounded"
            style={{ marginLeft: `${indent}px` }}
            onClick={() => toggleFolder(folderId)}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Folder className="w-4 h-4 text-terminal-accent" />
            <span className="text-terminal-bright">{tree.folder.name}</span>
            <span className="text-xs text-terminal-dim">
              ({tree.folder?.totalQuizzes || tree.quizzes.length} quiz{(tree.folder?.totalQuizzes || tree.quizzes.length) !== 1 ? 'zes' : ''}
              {tree.folder?.totalFolders ? `, ${tree.folder.totalFolders} folder${tree.folder.totalFolders !== 1 ? 's' : ''}` : ''})
            </span>
          </div>
        )}

        {isExpanded && (
          <>
            {/* Render quizzes in this folder */}
            {tree.quizzes.map(quiz => (
              <div 
                key={quiz.id}
                className="flex items-center justify-between border border-terminal-accent/30 p-3 rounded"
                style={{ marginLeft: `${indent + 32}px` }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-terminal-accent" />
                  <div>
                    <div className="text-terminal-bright font-medium">{quiz.title}</div>
                    <div className="text-sm text-terminal-dim">
                      {questionCounts.get(quiz.id) || quiz.questions?.length || 0} questions{quiz.multiQuizSources ? " (multi-quiz)" : ""} • {quiz.isPublic ? "Public" : "Shared"}
                    </div>
                    {/* Quiz Tags */}
                    {quiz.tags && quiz.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {quiz.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="bg-terminal-accent/20 text-terminal-accent px-2 py-0 rounded text-xs border border-terminal-accent/30"
                          >
                            🏷️ {tag}
                          </span>
                        ))}
                        {quiz.tags.length > 3 && (
                          <span className="text-xs text-terminal-dim">+{quiz.tags.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <TerminalButton onClick={() => navigate(`/quiz/${quiz.id}/customize`)}>
                    customize & take
                  </TerminalButton>
                  <TerminalButton onClick={() => navigate(`/quiz/${quiz.id}`)}>
                    take now
                  </TerminalButton>
                  <TerminalButton onClick={() => navigate(`/leaderboard/${quiz.id}`)}>
                    leaderboard
                  </TerminalButton>
                </div>
              </div>
            ))}

            {/* Render subfolders */}
            {tree.subFolders.map(subTree => renderFolderTree(subTree, depth + 1))}
          </>
        )}
      </div>
    );
  };

  const handleAccessCode = async () => {
    if (!accessCodeInput.trim()) return;
    
    const quiz = await storage.getQuizByAccessCode(accessCodeInput.trim());
    const folder = await storage.getFolderByAccessCode(accessCodeInput.trim());
    
    if (quiz) {
      setAccessCodeInput("");
      setShowAccessCodeInput(false);
      navigate(`/quiz/${quiz.id}`);
      toast.success(`Access granted to quiz: ${quiz.title}`);
    } else if (folder) {
      setAccessCodeInput("");
      setShowAccessCodeInput(false);
      // Reload data after accessing folder
      const allQuizzes = await storage.getQuizzes();
      const allFolders = await storage.getFolders();
      
      // User's own quizzes
      setMyQuizzes(allQuizzes.filter((q) => q.creator === user?.id));
      
      // Get all accessible quizzes (user's own + public quizzes + shared quizzes)
      const accessibleQuizzes = allQuizzes.filter(
        (q) => q.isPublic || q.creator === user?.id || q.sharedWith?.includes(user?.id || '')
      );
      
      // Get all accessible folders (user's own + public folders + shared folders)
      const accessibleFolders = allFolders.filter(
        (f) => f.isPublic || f.creator === user?.id || f.sharedWith?.includes(user?.id || '')
      );
      
      // Build hierarchical folder tree with quizzes properly organized
      const tree = buildFolderTree(accessibleQuizzes, accessibleFolders);
      setAvailableFolderTree(tree);
      
      toast.success(`Access granted to folder: ${folder.name}`);
    } else {
      toast.error("Invalid access code");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user) return null;

  // Use toast loading instead of full page loading
  React.useEffect(() => {
    if (isLoading && loadingMessage) {
      // Show loading toast with 5-second auto-dismiss as fallback
      toast.loading(loadingMessage, { 
        id: 'dashboard-loading',
        duration: 5000 // Auto-dismiss after 5 seconds
      });
    } else {
      // Ensure toast is dismissed when loading completes
      toast.dismiss('dashboard-loading');
    }
  }, [isLoading, loadingMessage]);

  // Additional safety mechanism to force dismiss after 6 seconds
  React.useEffect(() => {
    if (isLoading) {
      const fallbackTimeout = setTimeout(() => {
        toast.dismiss('dashboard-loading');
        console.log('🧹 Force dismissed dashboard loading toast after 6 seconds');
      }, 6000);
      
      return () => clearTimeout(fallbackTimeout);
    }
  }, [isLoading]);

  return (
    <Terminal title={`dashboard - ${user.username}`}>
      {/* Debug components hidden - uncomment for debugging */}
      {/* <FullDebugPanel /> */}
      <ThemeHammer />
      {/* <EmergencyTest /> */}
      <div className="flex items-center justify-between mb-4">
        <TerminalLine prefix="~">Welcome back, {user.username}!</TerminalLine>
        <TerminalButton 
          onClick={() => setShowCacheMonitor(!showCacheMonitor)}
          variant="secondary"
          size="sm"
        >
          📊 {showCacheMonitor ? 'Hide' : 'Show'} Cache
        </TerminalButton>
      </div>

      {/* Cache Monitor */}
      {showCacheMonitor && (
        <CacheMonitor className="mb-6" />
      )}

      <div className="space-y-4">
        <TerminalButton onClick={() => navigate(`/profile/${user.username}`)}>
          view profile
        </TerminalButton>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <TerminalLine prefix="#">Actions</TerminalLine>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3 ml-6">
            <TerminalButton onClick={() => navigate("/ai-generator")} className="flex items-center justify-center bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/50 text-purple-300 hover:text-purple-200">
              <Wand2 className="w-4 h-4 mr-2" />
              🤖 AI quiz generator
            </TerminalButton>
            <TerminalButton onClick={() => navigate("/create")} className="flex items-center justify-center">
              manual quiz creation
            </TerminalButton>
            <TerminalButton onClick={() => navigate("/my-quizzes")} className="flex items-center justify-center">
              my quizzes ({myQuizzes.length})
            </TerminalButton>
            <TerminalButton onClick={() => navigate("/browse-quizzes")} className="flex items-center justify-center">
              <FileText className="w-4 h-4 mr-2" />browse quizzes
            </TerminalButton>
            <TerminalButton onClick={() => navigate("/chat")} className="flex items-center justify-center">
              <MessageCircle className="w-4 h-4 mr-2" />chat groups
            </TerminalButton>
            <TerminalButton onClick={() => navigate("/music-library")} className="flex items-center justify-center">
              <Music className="w-4 h-4 mr-2" />music library
            </TerminalButton>
            <TerminalButton onClick={() => setShowAccessCodeInput(true)} className="flex items-center justify-center">
              <Send className="w-4 h-4 mr-2" />access code
            </TerminalButton>
            <TerminalButton onClick={handleLogout} className="flex items-center justify-center">
              logout
            </TerminalButton>
          </div>
        </div>

        <ThemeSelector />

        <div>
          <TerminalLine prefix="#">Statistics</TerminalLine>
          <div className="ml-6 space-y-1">
            <TerminalLine prefix="-">Quizzes Created: {myQuizzes.length}</TerminalLine>
            <TerminalLine prefix="-">Quizzes Attempted: {attempts.length}</TerminalLine>
            <TerminalLine prefix="-">
              Average Score: {attempts.length > 0 ? (attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length).toFixed(1) : "N/A"}%
            </TerminalLine>
          </div>
        </div>

        <div>
          <TerminalLine prefix="#">Available Quizzes & Folders</TerminalLine>
          <div className="ml-6 text-sm text-terminal-dim mb-2">
            Showing your quizzes and all public quizzes from other users
          </div>
          {availableFolderTree && (availableFolderTree.quizzes.length > 0 || availableFolderTree.subFolders.length > 0) ? (
            <div className="ml-6 space-y-2 mt-2">
              {renderFolderTree(availableFolderTree)}
            </div>
          ) : (
            <TerminalLine prefix="-" className="ml-6 text-terminal-dim">
              No quizzes available
            </TerminalLine>
          )}
        </div>
      </div>

      {/* Access code dialog */}
      {showAccessCodeInput && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
            <TerminalLine prefix="#">Enter Access Code</TerminalLine>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAccessCode();
                  if (e.key === 'Escape') {
                    setShowAccessCodeInput(false);
                    setAccessCodeInput("");
                  }
                }}
                className="w-full bg-terminal border border-terminal-accent text-terminal-foreground px-3 py-2 rounded uppercase"
                placeholder="QUIZ-CODE"
                autoFocus
              />
              <div className="flex gap-2">
                <TerminalButton onClick={handleAccessCode}>submit</TerminalButton>
                <TerminalButton onClick={() => {
                  setShowAccessCodeInput(false);
                  setAccessCodeInput("");
                }}>cancel</TerminalButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </Terminal>
  );
};
