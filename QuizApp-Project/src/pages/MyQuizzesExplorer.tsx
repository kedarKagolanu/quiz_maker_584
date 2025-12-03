import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton, TerminalInput } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder } from "@/types/quiz";
import { toast } from "sonner";
import { folderNameSchema, validateInput } from "@/lib/validation";
import { handleError } from "@/lib/errorHandler";
import { 
  Copy, Edit, Trash2, Folder, FolderOpen, ChevronRight, Home,
  FolderPlus, FilePlus, Share2, Clock, FileText, Lock, Globe
} from "lucide-react";
import { useRecursiveQuestionCounts } from "@/hooks/useRecursiveQuestionCount";

export const MyQuizzesExplorer: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showRenameFolder, setShowRenameFolder] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'details' | 'list'>('details');
  
  // Get recursive question counts for all quizzes
  const { questionCounts } = useRecursiveQuestionCounts(quizzes);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadData();
  }, [user, navigate, currentPath]);

  const loadData = async () => {
    const allQuizzes = await storage.getQuizzes();
    const userQuizzes = allQuizzes.filter((q) => q.creator === user?.id);
    setQuizzes(userQuizzes);
    
    const allFolders = await storage.getFolders();
    const userFolders = allFolders.filter((f) => f.creator === user?.id);
    setFolders(userFolders);
  };

  const getCurrentFolderQuizzes = () => {
    return quizzes.filter((q) => (q.folderPath || "") === currentPath);
  };

  const getCurrentSubfolders = () => {
    return folders.filter((f) => (f.parentPath || "") === currentPath);
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    
    // Validate folder name
    const validation = validateInput(folderNameSchema, newFolderName.trim());
    if (validation.success === false) {
      toast.error(validation.error);
      return;
    }
    
    const folder: QuizFolder = {
      id: Date.now().toString(),
      name: validation.data,
      parentPath: currentPath || undefined,
      createdAt: Date.now(),
      creator: user.id,
      isPublic: true,
    };
    
    try {
      await storage.saveFolder(folder);
      setNewFolderName("");
      setShowNewFolder(false);
      await loadData();
      toast.success("Folder created!");
    } catch (error) {
      handleError(error, { userMessage: "Failed to create folder" });
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    const quizzesInFolder = quizzes.filter((q) => q.folderPath?.startsWith(folderPath));
    const subfoldersInFolder = folders.filter((f) => f.parentPath?.startsWith(folderPath));
    
    if (quizzesInFolder.length > 0 || subfoldersInFolder.length > 0) {
      if (!confirm(`This folder contains ${quizzesInFolder.length} quiz(es) and ${subfoldersInFolder.length} subfolder(s). All will be deleted. Continue?`)) {
        return;
      }
      
      for (const q of quizzesInFolder) {
        await storage.deleteQuiz(q.id);
      }
      
      for (const f of subfoldersInFolder) {
        await storage.deleteFolder(f.id);
      }
    }
    
    await storage.deleteFolder(folderId);
    await loadData();
    toast.success("Folder deleted!");
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!renameFolderValue.trim()) return;
    
    // Validate folder name
    const validation = validateInput(folderNameSchema, renameFolderValue.trim());
    if (validation.success === false) {
      toast.error(validation.error);
      return;
    }
    
    try {
      await storage.renameFolder(folderId, validation.data);
      setShowRenameFolder(null);
      setRenameFolderValue("");
      await loadData();
      toast.success("Folder renamed!");
    } catch (error) {
      handleError(error, { userMessage: "Failed to rename folder" });
    }
  };

  const handleDelete = async (quizId: string) => {
    if (confirm("Delete this quiz?")) {
      await storage.deleteQuiz(quizId);
      await loadData();
      toast.success("Quiz deleted!");
    }
  };

  const handleDuplicate = async (quiz: Quiz) => {
    const newQuiz: Quiz = {
      ...quiz,
      id: Date.now().toString(),
      title: `${quiz.title} (copy)`,
      createdAt: Date.now(),
    };
    await storage.saveQuiz(newQuiz);
    await loadData();
    toast.success("Quiz duplicated!");
  };

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const navigateToRoot = () => {
    setCurrentPath("");
  };

  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    return currentPath.split("/");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (quiz: Quiz) => {
    const count = questionCounts.get(quiz.id) || quiz.questions?.length || 0;
    const suffix = quiz.multiQuizSources ? " (including sources)" : "";
    return `${count} questions${suffix}`;
  };

  // Recursive function to update folder and all its contents
  const updateFolderVisibilityRecursive = async (folder: QuizFolder, isPublic: boolean) => {
    const folderPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
    
    console.log('🔄 Starting recursive folder visibility update:', {
      folder: folderPath,
      newVisibility: isPublic,
      hasUpdateFolderMethod: !!storage.updateFolder
    });
    
    // Update the folder itself
    const updatedFolder = { ...folder, isPublic };
    if (storage.updateFolder) {
      await storage.updateFolder(updatedFolder);
      console.log('✅ Updated main folder:', folder.name, 'to', isPublic ? 'PUBLIC' : 'PRIVATE');
    } else {
      throw new Error('updateFolder method not available in storage driver');
    }
    
    // Helper function to check if a path is within our target folder
    const isInFolder = (itemPath: string, targetFolderPath: string) => {
      if (!itemPath || !targetFolderPath) return false;
      return itemPath.startsWith(targetFolderPath + '/') || itemPath === targetFolderPath;
    };
    
    // Find ALL child folders recursively - not just direct children
    const allChildFolders = folders.filter((f) => {
      if (!f.parentPath) return false;
      const childFolderPath = f.parentPath + '/' + f.name;
      return isInFolder(childFolderPath, folderPath) || f.parentPath === folderPath;
    });
    
    console.log('📁 Found ALL child folders:', allChildFolders.map(f => ({ 
      name: f.name, 
      parentPath: f.parentPath,
      fullPath: f.parentPath ? `${f.parentPath}/${f.name}` : f.name,
      currentVisibility: f.isPublic ? 'PUBLIC' : 'PRIVATE'
    })));
    
    // Update ALL child folders regardless of their current visibility
    for (const childFolder of allChildFolders) {
      const updatedChildFolder = { ...childFolder, isPublic };
      if (storage.updateFolder) {
        await storage.updateFolder(updatedChildFolder);
        const childPath = childFolder.parentPath ? `${childFolder.parentPath}/${childFolder.name}` : childFolder.name;
        console.log('✅ Updated child folder:', childPath, 'from', childFolder.isPublic ? 'PUBLIC' : 'PRIVATE', 'to', isPublic ? 'PUBLIC' : 'PRIVATE');
      }
    }
    
    // Find ALL quizzes in this folder and ALL its subfolders
    const allAffectedQuizzes = quizzes.filter((q) => {
      if (!q.folderPath) return false;
      return q.folderPath === folderPath || q.folderPath.startsWith(folderPath + '/');
    });
    
    console.log('📚 Found ALL affected quizzes:', allAffectedQuizzes.map(q => ({ 
      title: q.title,
      folderPath: q.folderPath,
      currentVisibility: q.isPublic ? 'PUBLIC' : 'PRIVATE'
    })));
    
    // Update ALL quizzes regardless of their current visibility
    for (const quiz of allAffectedQuizzes) {
      const updatedQuiz = { ...quiz, isPublic };
      await storage.updateQuiz(updatedQuiz);
      console.log('✅ Updated quiz:', quiz.title, 'from', quiz.isPublic ? 'PUBLIC' : 'PRIVATE', 'to', isPublic ? 'PUBLIC' : 'PRIVATE');
    }
    
    console.log(`✅ Completed recursive folder visibility update:`, {
      folder: folderPath,
      newVisibility: isPublic ? 'PUBLIC' : 'PRIVATE',
      totalChildFoldersUpdated: allChildFolders.length,
      totalQuizzesUpdated: allAffectedQuizzes.length
    });
  };

  const currentSubfolders = getCurrentSubfolders();
  const currentQuizzes = getCurrentFolderQuizzes();

  return (
    <Terminal title="my-quizzes-explorer">
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-terminal-accent/30 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <TerminalButton onClick={navigateToRoot} className="p-2" title="Go to root">
              <Home className="w-4 h-4" />
            </TerminalButton>
            <TerminalButton onClick={navigateUp} disabled={!currentPath} className="p-2">
              ↑ Up
            </TerminalButton>
            <TerminalButton onClick={() => setShowNewFolder(true)} className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4" />
              New Folder
            </TerminalButton>
            <TerminalButton onClick={() => navigate("/create")} className="flex items-center gap-2">
              <FilePlus className="w-4 h-4" />
              New Quiz
            </TerminalButton>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'details' | 'list')}
              className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-1 rounded text-sm"
            >
              <option value="details">Details</option>
              <option value="list">List</option>
            </select>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm mb-4 text-terminal-dim">
          <button onClick={navigateToRoot} className="hover:text-terminal-bright transition-colors">
            <Home className="w-4 h-4" />
          </button>
          {getBreadcrumbs().map((crumb, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="w-4 h-4" />
              <button
                onClick={() => {
                  const parts = getBreadcrumbs().slice(0, index + 1);
                  setCurrentPath(parts.join("/"));
                }}
                className="hover:text-terminal-bright transition-colors"
              >
                {crumb}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* New Folder Dialog */}
        {showNewFolder && (
          <div className="mb-4 p-3 border border-terminal-accent/50 rounded bg-terminal-accent/5">
            <TerminalInput
              label="folder name:"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex gap-2 mt-2">
              <TerminalButton onClick={handleCreateFolder}>Create</TerminalButton>
              <TerminalButton onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}>Cancel</TerminalButton>
            </div>
          </div>
        )}

        {/* Explorer View */}
        <div className="flex-1 border border-terminal-accent/30 rounded overflow-hidden">
          {viewMode === 'details' ? (
            <table className="w-full text-sm">
              <thead className="bg-terminal-accent/10 sticky top-0">
                <tr className="text-left border-b border-terminal-accent/30">
                  <th className="p-3 text-terminal-bright font-semibold">Name</th>
                  <th className="p-3 text-terminal-bright font-semibold">Date Modified</th>
                  <th className="p-3 text-terminal-bright font-semibold">Type</th>
                  <th className="p-3 text-terminal-bright font-semibold">Size</th>
                  <th className="p-3 text-terminal-bright font-semibold">Visibility</th>
                  <th className="p-3 text-terminal-bright font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Folders */}
                {currentSubfolders.map((folder) => (
                  <tr
                    key={`folder-${folder.id}`}
                    className={`border-b border-terminal-accent/10 hover:bg-terminal-accent/5 cursor-pointer transition-colors ${
                      selectedItem === `folder-${folder.id}` ? 'bg-terminal-accent/10' : ''
                    }`}
                    onClick={() => setSelectedItem(`folder-${folder.id}`)}
                    onDoubleClick={() => navigateToFolder(folder.name)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {showRenameFolder === folder.id ? (
                          <input
                            type="text"
                            value={renameFolderValue}
                            onChange={(e) => setRenameFolderValue(e.target.value)}
                            onBlur={() => handleRenameFolder(folder.id)}
                            onKeyPress={(e) => e.key === 'Enter' && handleRenameFolder(folder.id)}
                            className="bg-terminal border border-terminal-accent text-terminal-foreground px-2 py-1 rounded"
                            autoFocus
                          />
                        ) : (
                          <>
                            <FolderOpen className="w-5 h-5 text-yellow-500" />
                            <span className="text-terminal-foreground">{folder.name}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-terminal-dim">{formatDate(folder.createdAt)}</td>
                    <td className="p-3 text-terminal-dim">Folder</td>
                    <td className="p-3 text-terminal-dim">—</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {folder.isPublic ? (
                          <>
                            <Globe className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-green-400">Public</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-terminal-dim" />
                            <span className="text-xs text-terminal-dim">Private</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const newVisibility = !folder.isPublic;
                              await updateFolderVisibilityRecursive(folder, newVisibility);
                              await loadData();
                              toast.success(`Folder and all contents ${newVisibility ? 'made public' : 'made private'} recursively`);
                            } catch (error) {
                              handleError(error, { userMessage: "Failed to update folder visibility" });
                            }
                          }}
                          className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
                          title={folder.isPublic ? "Make Private (Recursive)" : "Make Public (Recursive)"}
                        >
                          {folder.isPublic ? (
                            <Lock className="w-4 h-4 text-terminal-foreground" />
                          ) : (
                            <Globe className="w-4 h-4 text-terminal-foreground" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameFolderValue(folder.name);
                            setShowRenameFolder(folder.id);
                          }}
                          className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
                          title="Rename"
                        >
                          <Edit className="w-4 h-4 text-terminal-foreground" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id, folder.name);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Quizzes */}
                {currentQuizzes.map((quiz) => (
                  <tr
                    key={`quiz-${quiz.id}`}
                    className={`border-b border-terminal-accent/10 hover:bg-terminal-accent/5 cursor-pointer transition-colors ${
                      selectedItem === `quiz-${quiz.id}` ? 'bg-terminal-accent/10' : ''
                    }`}
                    onClick={() => setSelectedItem(`quiz-${quiz.id}`)}
                    onDoubleClick={() => navigate(`/quiz/${quiz.id}`)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-terminal-accent" />
                        <span className="text-terminal-foreground">{quiz.title}</span>
                      </div>
                    </td>
                    <td className="p-3 text-terminal-dim">{formatDate(quiz.createdAt)}</td>
                    <td className="p-3 text-terminal-dim">Quiz</td>
                    <td className="p-3 text-terminal-dim">{formatFileSize(quiz)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {quiz.isPublic ? (
                          <>
                            <Globe className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-green-400">Public</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs text-yellow-400">Private</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const updatedQuiz = { ...quiz, isPublic: !quiz.isPublic };
                              await storage.updateQuiz(updatedQuiz);
                              await loadData();
                              toast.success(`Quiz ${updatedQuiz.isPublic ? 'made public' : 'made private'}`);
                            } catch (error) {
                              handleError(error, { userMessage: "Failed to update quiz visibility" });
                            }
                          }}
                          className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
                          title={quiz.isPublic ? "Make Private" : "Make Public"}
                        >
                          {quiz.isPublic ? (
                            <Lock className="w-4 h-4 text-terminal-foreground" />
                          ) : (
                            <Globe className="w-4 h-4 text-terminal-foreground" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/create?edit=${quiz.id}`);
                          }}
                          className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-terminal-foreground" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/quiz-permissions/${quiz.id}`);
                          }}
                          className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
                          title="Manage Permissions"
                        >
                          <Share2 className="w-4 h-4 text-terminal-foreground" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(quiz);
                          }}
                          className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4 text-terminal-foreground" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(quiz.id);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {currentSubfolders.length === 0 && currentQuizzes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-terminal-dim">
                      This folder is empty
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="p-4 space-y-1">
              {currentSubfolders.map((folder) => (
                <div
                  key={`folder-${folder.id}`}
                  className={`flex items-center justify-between p-2 rounded hover:bg-terminal-accent/5 cursor-pointer transition-colors ${
                    selectedItem === `folder-${folder.id}` ? 'bg-terminal-accent/10' : ''
                  }`}
                  onClick={() => setSelectedItem(`folder-${folder.id}`)}
                  onDoubleClick={() => navigateToFolder(folder.name)}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-yellow-500" />
                    <span className="text-terminal-foreground">{folder.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameFolderValue(folder.name);
                        setShowRenameFolder(folder.id);
                      }}
                      className="p-1 hover:bg-terminal-accent/20 rounded"
                      title="Rename"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id, folder.name);
                      }}
                      className="p-1 hover:bg-red-500/20 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}

              {currentQuizzes.map((quiz) => (
                <div
                  key={`quiz-${quiz.id}`}
                  className={`flex items-center justify-between p-2 rounded hover:bg-terminal-accent/5 cursor-pointer transition-colors ${
                    selectedItem === `quiz-${quiz.id}` ? 'bg-terminal-accent/10' : ''
                  }`}
                  onClick={() => setSelectedItem(`quiz-${quiz.id}`)}
                  onDoubleClick={() => navigate(`/quiz/${quiz.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-terminal-accent" />
                    <span className="text-terminal-foreground">{quiz.title}</span>
                    <span className="text-xs text-terminal-dim">({questionCounts.get(quiz.id) || quiz.questions?.length || 0} questions{quiz.multiQuizSources ? " including sources" : ""})</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const updatedQuiz = { ...quiz, isPublic: !quiz.isPublic };
                          await storage.updateQuiz(updatedQuiz);
                          await loadData();
                          toast.success(`Quiz ${updatedQuiz.isPublic ? 'made public' : 'made private'}`);
                        } catch (error) {
                          handleError(error, { userMessage: "Failed to update quiz visibility" });
                        }
                      }}
                      className="p-1 hover:bg-terminal-accent/20 rounded"
                      title={quiz.isPublic ? "Make Private" : "Make Public"}
                    >
                      {quiz.isPublic ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/create?edit=${quiz.id}`);
                      }}
                      className="p-1 hover:bg-terminal-accent/20 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(quiz);
                      }}
                      className="p-1 hover:bg-terminal-accent/20 rounded"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(quiz.id);
                      }}
                      className="p-1 hover:bg-red-500/20 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <TerminalButton onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};
