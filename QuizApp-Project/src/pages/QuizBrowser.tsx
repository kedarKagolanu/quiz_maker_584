import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder, QuizAttempt } from "@/types/quiz";
import { FileText, Folder, Lock, Globe, Clock, User, Play, Filter } from "lucide-react";
import { PageDescription } from "@/components/PageDescription";
import { toast } from "sonner";

type FilterType = 'all' | 'public' | 'private' | 'my-quizzes' | 'attempted' | 'folder';

export const QuizBrowser: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      const [quizzesData, foldersData, attemptsData] = await Promise.all([
        storage.getQuizzes(),
        storage.getFolders(),
        storage.getUserAttempts(user.id)
      ]);

      setQuizzes(quizzesData);
      setFolders(foldersData);
      setAttempts(attemptsData);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load data:", error);
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
          filtered = quizzes.filter(q => q.folderPath === folderPath);
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

  const handleQuizClick = (quiz: Quiz) => {
    // Go to customizer first, then to quiz
    navigate(`/quiz/${quiz.id}/customize`);
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

            {/* Folder Filter */}
            {folders.length > 0 && (
              <div>
                <TerminalLine prefix=">" className="text-terminal-accent mb-2">
                  Filter by Folder:
                </TerminalLine>
                <div className="ml-6 flex flex-wrap gap-2">
                  <TerminalButton
                    onClick={() => {
                      setActiveFilter('folder');
                      setSelectedFolder(null);
                    }}
                    className={activeFilter === 'folder' && !selectedFolder ? 'bg-terminal-accent/20' : ''}
                  >
                    No Folder
                  </TerminalButton>
                  
                  {folders.map(folder => (
                    <TerminalButton
                      key={folder.id}
                      onClick={() => {
                        setActiveFilter('folder');
                        setSelectedFolder(folder.id);
                      }}
                      className={activeFilter === 'folder' && selectedFolder === folder.id ? 'bg-terminal-accent/20' : ''}
                    >
                      <Folder className="w-4 h-4 mr-1" />
                      {folder.name}
                    </TerminalButton>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div>
          <TerminalLine prefix="#" className="mb-3">
            Results ({filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'es' : ''})
          </TerminalLine>

          <div className="ml-6 space-y-3">
            {filteredQuizzes.length === 0 ? (
              <TerminalLine prefix="-" className="text-terminal-dim">
                No quizzes found with current filter
              </TerminalLine>
            ) : (
              filteredQuizzes.map(quiz => {
                const stats = getQuizStats(quiz);
                
                return (
                  <div
                    key={quiz.id}
                    onClick={() => handleQuizClick(quiz)}
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
                          <span>{quiz.questions.length} questions</span>
                          
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
                            handleQuizClick(quiz);
                          }}
                          className="text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Customize & Take
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