import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder, QuizAttempt } from "@/types/quiz";
import { FileText, Folder, Lock, Globe, Clock, User, Play, Filter, Settings } from "lucide-react";
import { PageDescription } from "@/components/PageDescription";
import { toast } from "sonner";
import { useRecursiveQuestionCounts } from "@/hooks/useRecursiveQuestionCount";

type FilterType = 'all' | 'public' | 'private' | 'my-quizzes' | 'attempted' | 'folder';

export const QuizBrowser: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('folder');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentFolderPath, setCurrentFolderPath] = useState<string>("");
  const [folderContents, setFolderContents] = useState<{quizzes: Quiz[], subfolders: QuizFolder[]}>({quizzes: [], subfolders: []});
  const [loading, setLoading] = useState(true);
  
  // Get recursive question counts for all quizzes
  const { questionCounts } = useRecursiveQuestionCounts(quizzes);

  // Calculate folder quiz counts dynamically
  const getFolderQuizCount = (folderPath: string, isRecursive: boolean = true): number => {
    if (isRecursive) {
      // Count all quizzes in this folder and its subfolders
      return quizzes.filter(quiz => 
        quiz.folderPath?.startsWith(folderPath + '/') || 
        quiz.folderPath === folderPath
      ).length;
    } else {
      // Count only direct quizzes in this folder
      return quizzes.filter(quiz => quiz.folderPath === folderPath).length;
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadData();
  }, [user, navigate]);

  useEffect(() => {
    applyFilter();
  }, [quizzes, activeFilter, selectedFolder, attempts]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [allQuizzes, allFolders, attemptsData] = await Promise.all([
        storage.getQuizzes(),
        storage.getFolders(),
        storage.getUserAttempts(user.id)
      ]);

      // Get all accessible quizzes (public + user's own + shared quizzes) - exactly like Dashboard
      const accessibleQuizzes = allQuizzes.filter(
        (q) => q.isPublic || q.creator === user.id || q.sharedWith?.includes(user.id)
      );

      // Get all accessible folders (public + user's own + shared folders) - exactly like Dashboard
      const accessibleFolders = allFolders.filter(
        (f) => f.isPublic || f.creator === user.id || f.sharedWith?.includes(user.id)
      );

      setQuizzes(accessibleQuizzes);
      setFolders(accessibleFolders);
      setAttempts(attemptsData);
      setLoading(false);
    } catch (error) {

      toast.error("Failed to load quizzes");
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (!user) return;

    let filtered = quizzes;

    switch (activeFilter) {
      case 'public':
        filtered = quizzes.filter(q => q.isPublic);
        break;
      
      case 'private':
        filtered = quizzes.filter(q => 
          !q.isPublic && 
          (q.creator === user.id || q.sharedWith?.includes(user.id) || q.accessCode)
        );
        break;
      
      case 'my-quizzes':
        filtered = quizzes.filter(q => q.creator === user.id);
        break;
      
      case 'attempted':
        const attemptedQuizIds = new Set(attempts.map(a => a.quizId));
        filtered = quizzes.filter(q => attemptedQuizIds.has(q.id));
        break;
      
      case 'folder':
        if (selectedFolder) {
          const folderPath = getFolderPath(selectedFolder);
          setCurrentFolderPath(folderPath);
          // Get both quizzes and subfolders for this folder
          const folderQuizzes = quizzes.filter(q => q.folderPath === folderPath);
          const subfolders = folders.filter(f => f.parentPath === folderPath);
          setFolderContents({quizzes: folderQuizzes, subfolders});
          filtered = folderQuizzes;
        } else {
          // Show independent quizzes (no folder path)
          setCurrentFolderPath("");
          const independentQuizzes = quizzes.filter(q => !q.folderPath || q.folderPath === '');
          const rootFolders = folders.filter(f => !f.parentPath || f.parentPath === '');
          setFolderContents({quizzes: independentQuizzes, subfolders: rootFolders});
          filtered = independentQuizzes;
        }
        break;
      
      default: // 'all'
        filtered = quizzes.filter(q => 
          q.isPublic || 
          q.creator === user.id || 
          q.sharedWith?.includes(user.id)
        );
        break;
    }

    setFilteredQuizzes(filtered);
  };

  const handleFolderClick = (folder: QuizFolder) => {
    setActiveFilter('folder');
    setSelectedFolder(folder.id);
  };

  const navigateToParentFolder = () => {
    if (currentFolderPath) {
      const parentPath = currentFolderPath.includes('/') 
        ? currentFolderPath.split('/').slice(0, -1).join('/')
        : '';
      
      if (parentPath) {
        const parentFolder = folders.find(f => getFolderPath(f.id) === parentPath);
        if (parentFolder) {
          setSelectedFolder(parentFolder.id);
        }
      } else {
        setSelectedFolder(null);
      }
    }
  };

  const getFolderPath = (folderId: string): string => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return '';
    
    if (folder.parentPath) {
      return `${folder.parentPath}/${folder.name}`;
    }
    return folder.name;
  };

  const getFolderName = (folderId: string): string => {
    const folder = folders.find(f => f.id === folderId);
    return folder?.name || 'Unknown Folder';
  };

  const getQuizStats = (quiz: Quiz) => {
    const myAttempts = attempts.filter(a => a.quizId === quiz.id);
    const bestScore = myAttempts.length > 0 ? Math.max(...myAttempts.map(a => a.score)) : null;
    
    return {
      attempts: myAttempts.length,
      bestScore,
      isCreator: quiz.creator === user?.id,
      hasAccess: quiz.isPublic || quiz.creator === user?.id || quiz.sharedWith?.includes(user?.id || '')
    };
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "No limit";
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const handleQuizClick = (quiz: Quiz, customize: boolean = false) => {
    if (customize) {
      // Both buttons now go to the same customize page
      navigate(`/quiz/${quiz.id}/customize`);
    } else {
      // Quick start goes directly to taking the quiz
      navigate(`/quiz/${quiz.id}/take`);
    }
  };

  if (loading) {
    return (
      <Terminal title="loading quizzes...">
        <TerminalLine prefix=">">Loading available quizzes...</TerminalLine>
      </Terminal>
    );
  }

  return (
    <Terminal title="quiz browser">
      <div className="space-y-6">
        {/* Filter Controls */}
        <div>
          <TerminalLine prefix="#" className="mb-3">Filter Quizzes</TerminalLine>
          
          <div className="ml-6 space-y-3">
            <div className="flex flex-wrap gap-2">
              <TerminalButton
                onClick={() => setActiveFilter('all')}
                className={activeFilter === 'all' ? 'bg-terminal-accent/20' : ''}
              >
                <Globe className="w-4 h-4 mr-1" />
                All Available
              </TerminalButton>
              
              <TerminalButton
                onClick={() => setActiveFilter('public')}
                className={activeFilter === 'public' ? 'bg-terminal-accent/20' : ''}
              >
                <Globe className="w-4 h-4 mr-1" />
                Public
              </TerminalButton>
              
              <TerminalButton
                onClick={() => setActiveFilter('private')}
                className={activeFilter === 'private' ? 'bg-terminal-accent/20' : ''}
              >
                <Lock className="w-4 h-4 mr-1" />
                Private/Shared
              </TerminalButton>
              
              <TerminalButton
                onClick={() => setActiveFilter('my-quizzes')}
                className={activeFilter === 'my-quizzes' ? 'bg-terminal-accent/20' : ''}
              >
                <User className="w-4 h-4 mr-1" />
                My Quizzes
              </TerminalButton>
              
              <TerminalButton
                onClick={() => setActiveFilter('attempted')}
                className={activeFilter === 'attempted' ? 'bg-terminal-accent/20' : ''}
              >
                <Clock className="w-4 h-4 mr-1" />
                Attempted
              </TerminalButton>
            </div>

            {/* Root Folder Filter - Show only root folders */}
            {folders.filter(f => !f.parentPath || f.parentPath === '').length > 0 && (
              <div>
                <TerminalLine prefix=">" className="text-terminal-accent mb-2">
                  Browse Root Folders:
                </TerminalLine>
                <div className="ml-6 flex flex-wrap gap-2">
                  <TerminalButton
                    onClick={() => {
                      setActiveFilter('folder');
                      setSelectedFolder(null);
                    }}
                    className={activeFilter === 'folder' && !selectedFolder ? 'bg-terminal-accent/20' : ''}
                  >
                    Independent Quizzes
                  </TerminalButton>
                  
                  {folders.filter(f => !f.parentPath || f.parentPath === '').map(folder => (
                    <TerminalButton
                      key={folder.id}
                      onClick={() => {
                        setActiveFilter('folder');
                        setSelectedFolder(folder.id);
                      }}
                      className={activeFilter === 'folder' && selectedFolder === folder.id ? 'bg-terminal-accent/20' : ''}
                    >
                      <Folder className="w-4 h-4 mr-1" />
                      {folder.name} ({getFolderQuizCount(getFolderPath(folder.id))} quiz{getFolderQuizCount(getFolderPath(folder.id)) !== 1 ? 'zes' : ''})
                    </TerminalButton>
                  ))}
                </div>
                <div className="ml-6 text-xs text-terminal-dim mt-2">
                  Note: "Independent Quizzes" shows quizzes not in any folder. Click a folder to see its contents.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <TerminalLine prefix="#">
              {activeFilter === 'folder' ? 
                `Browsing: ${currentFolderPath || 'Root'}` : 
                `Results (${filteredQuizzes.length} quiz${filteredQuizzes.length !== 1 ? 'es' : ''})`
              }
            </TerminalLine>
            
            {activeFilter === 'folder' && currentFolderPath && (
              <TerminalButton 
                onClick={navigateToParentFolder}
                className="text-xs bg-gray-600/20 hover:bg-gray-600/30"
              >
                ↰ Parent Folder
              </TerminalButton>
            )}
          </div>

          <div className="ml-6 space-y-3">
            {/* Show folders when browsing */}
            {activeFilter === 'folder' && folderContents.subfolders.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-terminal-bright flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Folders ({folderContents.subfolders.length})
                </div>
                {folderContents.subfolders.map(folder => (
                  <div
                    key={folder.id}
                    onClick={() => handleFolderClick(folder)}
                    className="p-3 border border-blue-500/30 rounded cursor-pointer hover:border-blue-500/60 transition-colors bg-blue-500/5"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-blue-400" />
                      <span className="text-terminal-bright font-semibold">{folder.name}</span>
                      <span className="text-xs text-terminal-dim">
                        ({getFolderQuizCount(getFolderPath(folder.id))} quiz{getFolderQuizCount(getFolderPath(folder.id)) !== 1 ? 'es' : ''})
                      </span>
                    </div>
                    {folder.description && (
                      <p className="text-terminal-foreground text-sm mt-1 ml-6">{folder.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Show quizzes */}
            {filteredQuizzes.length > 0 && activeFilter === 'folder' && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-terminal-bright flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Quizzes ({filteredQuizzes.length})
                </div>
              </div>
            )}
            
            {filteredQuizzes.length === 0 && (activeFilter !== 'folder' || folderContents.subfolders.length === 0) ? (
              <TerminalLine prefix="-" className="text-terminal-dim">
                No {activeFilter === 'folder' ? 'content' : 'quizzes'} found with current filter
              </TerminalLine>
            ) : (
              filteredQuizzes.map(quiz => {
                const stats = getQuizStats(quiz);
                
                return (
                  <div
                    key={quiz.id}
                    onClick={() => handleQuizClick(quiz, false)}
                    className="p-4 border border-terminal-accent/30 rounded cursor-pointer hover:border-terminal-accent/60 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-terminal-accent" />
                          <span className="text-terminal-bright font-semibold">{quiz.title}</span>
                          
                          {/* Quiz Status Icons */}
                          <div className="flex gap-1">
                            {quiz.isPublic ? (
                              <Globe className="w-4 h-4 text-terminal-dim" title="Public Quiz" />
                            ) : (
                              <Lock className="w-4 h-4 text-terminal-dim" title="Private Quiz" />
                            )}
                            
                            {stats.isCreator && (
                              <User className="w-4 h-4 text-terminal-accent" title="Your Quiz" />
                            )}
                          </div>
                        </div>
                        
                        {quiz.desc && (
                          <p className="text-terminal-foreground text-sm mb-2">{quiz.desc}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-xs text-terminal-dim">
                          <span>{questionCounts.get(quiz.id) || quiz.questions?.length || 0} questions{quiz.multiQuizSources ? " (including sources)" : ""}</span>
                          
                          {quiz.timeLimit && (
                            <span>
                              <Clock className="w-3 h-3 inline mr-1" />
                              {formatTime(quiz.timeLimit)}
                            </span>
                          )}
                          
                          {quiz.folderPath && (
                            <span>
                              <Folder className="w-3 h-3 inline mr-1" />
                              {quiz.folderPath}
                            </span>
                          )}
                          
                          {stats.attempts > 0 && (
                            <span className="text-terminal-accent">
                              Attempted {stats.attempts} time{stats.attempts !== 1 ? 's' : ''}
                              {stats.bestScore !== null && ` • Best: ${stats.bestScore}%`}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <TerminalButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuizClick(quiz, false);
                          }}
                          className="text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Quick Start
                        </TerminalButton>
                        <TerminalButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuizClick(quiz, true);
                          }}
                          className="text-xs bg-terminal-accent/20 hover:bg-terminal-accent/30"
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Customize & Start
                        </TerminalButton>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="pt-4">
          <TerminalButton onClick={() => navigate("/dashboard")}>
            back to dashboard
          </TerminalButton>
        </div>
      </div>
      
      {/* Page Description */}
      <div className="mt-6 p-4 border border-terminal-accent/30 rounded bg-terminal-accent/10">
        <div className="text-terminal-bright font-semibold mb-3 flex items-center gap-2">
          🔍 Quiz Browser Guide
        </div>
        <div className="text-xs text-terminal-foreground space-y-1">
          <div><strong>🌐 Public Library:</strong> Browse all available quizzes on the platform</div>
          <div><strong>🎯 Smart Filters:</strong> Filter by your quizzes, attempts, or shared content</div>
          <div><strong>📁 Folder Search:</strong> Find quizzes organized in specific folders</div>
          <div><strong>🎫 Access Codes:</strong> Enter private quiz codes for exclusive content</div>
          <div><strong>⚙️ Custom Settings:</strong> Adjust quiz parameters before starting</div>
          <div><strong>🚀 Quick Access:</strong> Direct links to launch with preferred settings</div>
          <div><strong>📊 Statistics:</strong> View difficulty ratings and completion data</div>
        </div>
      </div>
    </Terminal>
  );
};
