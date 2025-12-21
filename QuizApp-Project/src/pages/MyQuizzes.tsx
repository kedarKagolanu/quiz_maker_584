import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton, TerminalInput } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder } from "@/types/quiz";
import { toast } from "sonner";
import { Copy, Edit, Trash2, Folder, FolderOpen, ChevronRight, Send, Globe, Lock } from "lucide-react";
import { QuizQuestionCount } from "@/components/QuizQuestionCount";
import { handleError } from "@/lib/errorHandler";
import { CachedStorageDriver } from "@/lib/cache/CachedStorageDriver";
import { offlineManager } from "@/lib/offlineManager";

export const MyQuizzes: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineDataAvailable, setOfflineDataAvailable] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showRenameFolder, setShowRenameFolder] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");

  // EMERGENCY: Cache bypass for testing
  const loadDataBypassCache = async () => {
    if (!user) return;
    
    console.log('🚨 BYPASSING CACHE - Loading fresh data from database');
    
    try {
      // Clear all cache first
      if (storage instanceof CachedStorageDriver) {
        storage.clearCache();
        console.log('🧹 Cache cleared');
      }
      
      // Force fresh database calls
      const userQuizzes = await storage.getUserQuizzes(user.id);
      const userFolders = await storage.getUserFolders?.(user.id) || [];
      
      console.log('📊 Fresh data from DB:', {
        quizzesCount: userQuizzes.length,
        foldersCount: userFolders.length,
        sampleQuiz: userQuizzes[0] ? {
          id: userQuizzes[0].id,
          title: userQuizzes[0].title,
          isPublic: userQuizzes[0].isPublic,
          folderPath: userQuizzes[0].folderPath
        } : null,
        sampleFolder: userFolders[0] ? {
          id: userFolders[0].id,
          name: userFolders[0].name,
          isPublic: userFolders[0].isPublic
        } : null
      });
      
      setQuizzes(userQuizzes);
      setFolders(userFolders);
      
      toast.success(`Fresh data loaded: ${userQuizzes.length} quizzes, ${userFolders.length} folders`);
    } catch (error) {
      console.error('❌ Failed to load fresh data:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadData();
  }, [user, navigate, currentPath]);

  const loadData = async () => {
    if (!user) return;
    
    const loadingToastId = toast.loading("Loading your quizzes and folders...", { id: 'my-quizzes-loading' });
    
    try {
      const online = await offlineManager.isOnline();
      setIsOffline(!online);
      
      if (!online) {
        // Offline mode - load cached data
        const cachedQuizzes = await offlineManager.getCachedQuizzes();
        const userCachedQuizzes = cachedQuizzes
          .filter(cached => cached.creator === user.id)
          .map(cached => ({
            id: cached.id,
            title: cached.title,
            description: cached.description,
            questions: cached.questions,
            creator: cached.creator,
            isPublic: cached.isPublic,
            tags: cached.tags,
            folderPath: cached.folderPath,
            createdAt: new Date(cached.cachedAt).toISOString()
          }));
        
        setQuizzes(userCachedQuizzes);
        setOfflineDataAvailable(userCachedQuizzes.length > 0);
        
        // Load cached folders
        const cachedFolders = await offlineManager.getCachedFolders();
        const folderData = cachedFolders.map(cached => ({
          id: cached.id,
          name: cached.name,
          parentPath: cached.parentPath,
          description: cached.description,
          tags: cached.tags,
          createdAt: new Date(cached.cachedAt).toISOString(),
          isPublic: false // Default for cached folders
        }));
        setFolders(folderData);
        
        toast.success(`Offline mode: ${userCachedQuizzes.length} quizzes, ${folderData.length} folders`, { id: loadingToastId });
        return;
      }
      
      // Online mode - load fresh data and cache it
      const userQuizzes = await storage.getUserQuizzes(user.id);
      setQuizzes(userQuizzes);
      
      // Cache quizzes for offline use
      await offlineManager.cacheQuizzes(userQuizzes);
      
      const userFolders = await storage.getUserFolders(user.id);
      setFolders(userFolders);
      
      // Cache folders for offline use
      for (const folder of userFolders) {
        await offlineManager.cacheFolder(folder);
      }
      
      toast.success(`Loaded ${userQuizzes.length} quizzes and ${userFolders.length} folders`, { id: 'my-quizzes-loading' });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load your quizzes. Please try again.", { id: 'my-quizzes-loading' });
    }
  };

  const getCurrentFolderQuizzes = () => {
    return quizzes.filter((q) => (q.folderPath || "") === currentPath);
  };

  const getCurrentSubfolders = () => {
    return folders.filter((f) => (f.parentPath || "") === currentPath);
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    
    console.log('🗂️ Creating folder:', {
      name: newFolderName.trim(),
      parentPath: currentPath,
      willBeCreatedIn: currentPath ? currentPath : "Root"
    });
    
    const folder: QuizFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
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
      
      const location = currentPath ? `in "${currentPath}"` : "in Root";
      toast.success(`Folder "${folder.name}" created ${location}!`);
      
      console.log('✅ Folder created successfully:', folder);
    } catch (error) {
      console.error('❌ Failed to create folder:', error);
      toast.error('Failed to create folder');
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
      
      // Delete all quizzes in folder
      for (const q of quizzesInFolder) {
        await storage.deleteQuiz(q.id);
      }
      
      // Delete all subfolders
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
    await storage.renameFolder(folderId, renameFolderValue.trim());
    setShowRenameFolder(null);
    setRenameFolderValue("");
    await loadData();
    toast.success("Folder renamed!");
  };

  const handleMoveQuiz = async (targetPath: string) => {
    if (!selectedQuiz) return;
    
    const updatedQuiz = { ...selectedQuiz, folderPath: targetPath || undefined };
    await storage.updateQuiz(updatedQuiz);
    setShowMoveDialog(false);
    setSelectedQuiz(null);
    await loadData();
    toast.success("Quiz moved!");
  };

  const handleCopyJSON = (quiz: Quiz) => {
    const jsonData = JSON.stringify(quiz.questions, null, 2);
    navigator.clipboard.writeText(jsonData);
    toast.success("Quiz JSON copied to clipboard!");
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      await storage.deleteQuiz(quizId);
      await loadData();
      toast.success("Quiz deleted successfully!");
    }
  };

  const openFolder = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
  };

  const goBack = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    return currentPath.split("/");
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

  const getAllFolderPaths = (excludeQuizPath?: string): string[] => {
    const paths = ["Root"];
    
    const addFolderPaths = (parentPath: string) => {
      const subfolders = folders.filter((f) => (f.parentPath || "") === parentPath);
      subfolders.forEach((f) => {
        const fullPath = parentPath ? `${parentPath}/${f.name}` : f.name;
        if (fullPath !== excludeQuizPath) {
          paths.push(fullPath);
          addFolderPaths(fullPath);
        }
      });
    };
    
    addFolderPaths("");
    return paths;
  };

  if (!user) return null;

  const currentQuizzes = getCurrentFolderQuizzes();
  const currentSubfolders = getCurrentSubfolders();

  return (
    <Terminal title="my-quizzes">
      <TerminalLine>Quizzes you have created</TerminalLine>
      
      {/* DEBUG SECTION - Shows what's happening */}
      <div className="mt-4 p-4 bg-red-500 text-white rounded">
        <div className="text-lg font-bold">🚨 DEBUG INFO</div>
        <div>User: {user?.email} {isOffline ? '📱 OFFLINE' : '🌐 ONLINE'}</div>
        <div>Current Path: "{currentPath}"</div>
        <div>Total Quizzes: {quizzes.length}</div>
        <div>Total Folders: {folders.length}</div>
        <div>Current Folder Quizzes: {currentQuizzes.length}</div>
        <div>Current Subfolders: {currentSubfolders.length}</div>
        <div>Show New Folder: {showNewFolder ? 'YES' : 'NO'}</div>
        <div>Show Move Dialog: {showMoveDialog ? 'YES' : 'NO'}</div>
        <div>Show Rename: {showRenameFolder ? showRenameFolder : 'NONE'}</div>
        {isOffline && (
          <div className="text-yellow-400 font-bold">
            📱 OFFLINE MODE: {offlineDataAvailable ? 'Using cached data' : 'No cached data available'}
          </div>
        )}
        <div className="mt-2">
          <button 
            onClick={loadDataBypassCache}
            className="bg-yellow-500 text-black px-2 py-1 rounded mr-2"
          >
            FORCE RELOAD DATA
          </button>
          <button 
            onClick={() => {
              console.log('🔍 Full debug data:', {
                user,
                currentPath,
                quizzes,
                folders,
                currentQuizzes,
                currentSubfolders
              });
            }}
            className="bg-blue-500 text-white px-2 py-1 rounded"
          >
            CONSOLE LOG ALL DATA
          </button>
        </div>
      </div>

      {/* Breadcrumb navigation */}
      <div className="mt-4 flex items-center gap-2 text-sm p-2 bg-green-500 text-black rounded">
        <strong>BREADCRUMBS:</strong>
        <button
          onClick={() => setCurrentPath("")}
          className="text-blue-800 hover:underline font-bold"
        >
          Root
        </button>
        {getBreadcrumbs().map((crumb, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={() => setCurrentPath(getBreadcrumbs().slice(0, idx + 1).join("/"))}
              className="text-blue-800 hover:underline font-bold"
            >
              {crumb}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {/* Action buttons - ENHANCED VISIBILITY */}
        <div className="flex gap-2 flex-wrap p-4 bg-yellow-500 text-black rounded">
          <div className="w-full font-bold text-lg mb-2">ACTION BUTTONS:</div>
          
          <button 
            onClick={loadDataBypassCache}
            className="bg-red-600 text-white px-4 py-2 rounded font-bold"
          >
            🚨 BYPASS CACHE
          </button>
          
          <TerminalButton 
            onClick={() => {
              console.log('🎯 Creating new quiz in folder:', currentPath || 'Root');
              const folderParam = currentPath ? `?folder=${encodeURIComponent(currentPath)}` : '';
              navigate(`/create-quiz${folderParam}`);
            }}
            className="bg-terminal-accent hover:bg-terminal-bright text-terminal font-bold"
          >
            📝 new quiz{currentPath && (
              <span className="text-terminal-dim ml-2">in "{currentPath}"</span>
            )}
          </TerminalButton>
          
          <button 
            onClick={() => setShowNewFolder(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded font-bold"
          >
            📁 NEW FOLDER
          </button>
          
          {currentPath && (
            <button 
              onClick={goBack}
              className="bg-purple-600 text-white px-4 py-2 rounded font-bold"
            >
              ← BACK UP
            </button>
          )}
        </div>

        {/* New folder input */}
        {showNewFolder && (
          <div className="border border-terminal-accent/30 p-3 rounded space-y-2">
            <div className="text-sm text-terminal-dim mb-2">
              Creating folder in: <span className="text-terminal-accent">
                {currentPath ? currentPath : "Root"}
              </span>
            </div>
            <TerminalInput
              label="folder name:"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
              placeholder="Enter folder name..."
            />
            <div className="flex gap-2">
              <TerminalButton onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                create in {currentPath ? currentPath : "Root"}
              </TerminalButton>
              <TerminalButton onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}>cancel</TerminalButton>
            </div>
          </div>
        )}

        {/* FOLDERS SECTION */}
        <div className="bg-blue-500 text-white p-4 rounded">
          <div className="text-lg font-bold">📁 FOLDERS ({currentSubfolders.length}):</div>
          {currentSubfolders.length === 0 ? (
            <div className="text-yellow-200">No folders in this location</div>
          ) : (
            <div className="space-y-2 mt-2">
              {currentSubfolders.map((folder, index) => (
                <div key={folder.id} className="bg-white text-black p-2 rounded">
                  <strong>#{index + 1}: {folder.name}</strong> 
                  <span className="ml-2 text-sm">
                    (ID: {folder.id}, Public: {folder.isPublic ? 'YES' : 'NO'})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subfolders - ORIGINAL BUT ENHANCED */}
        {currentSubfolders.map((folder) => (
          <div key={folder.id} className="border-4 border-blue-500 bg-blue-100 p-4 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => openFolder(folder.name)}>
                <FolderOpen className="w-6 h-6 text-terminal-accent" />
                {showRenameFolder === folder.id ? (
                  <input
                    type="text"
                    value={renameFolderValue}
                    onChange={(e) => setRenameFolderValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameFolder(folder.id);
                      if (e.key === 'Escape') {
                        setShowRenameFolder(null);
                        setRenameFolderValue("");
                      }
                    }}
                    className="bg-terminal border border-terminal-accent text-terminal-foreground px-2 py-1 rounded"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-terminal-bright text-lg">{folder.name}</span>
                    <div className="flex items-center gap-1 ml-3">
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
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <TerminalButton
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const newVisibility = !folder.isPublic;
                      await updateFolderVisibilityRecursive(folder, newVisibility);
                      await loadData();
                      toast.success(`Folder and all contents ${newVisibility ? 'made public' : 'made private'} recursively`);
                    } catch (error) {
                      console.error('Error updating folder visibility:', error);
                      toast.error("Failed to update folder visibility");
                    }
                  }}
                  size="sm"
                  variant="secondary"
                  title={folder.isPublic ? "Make Private (Recursive)" : "Make Public (Recursive)"}
                >
                  {folder.isPublic ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                </TerminalButton>
                <TerminalButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRenameFolder(folder.id);
                    setRenameFolderValue(folder.name);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </TerminalButton>
                <TerminalButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id, folder.name);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </TerminalButton>
              </div>
            </div>
          </div>
        ))}

        {/* QUIZZES SECTION */}
        <div className="bg-green-500 text-white p-4 rounded">
          <div className="text-lg font-bold">📚 QUIZZES ({currentQuizzes.length}):</div>
          {currentQuizzes.length === 0 ? (
            <div className="text-yellow-200">No quizzes in this location</div>
          ) : (
            <div className="space-y-2 mt-2">
              {currentQuizzes.map((quiz, index) => (
                <div key={quiz.id} className="bg-white text-black p-2 rounded">
                  <strong>#{index + 1}: {quiz.title}</strong> 
                  <span className="ml-2 text-sm">
                    (ID: {quiz.id.substring(0, 8)}..., Public: {quiz.isPublic ? 'YES' : 'NO'}, 
                    Folder: {quiz.folderPath || 'ROOT'})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EMPTY STATE */}
        {currentQuizzes.length === 0 && currentSubfolders.length === 0 && (
          <div className="bg-red-500 text-white p-6 rounded text-center">
            <div className="text-2xl font-bold mb-2">🚨 FOLDER IS EMPTY</div>
            <div className="text-lg">
              {currentPath ? `"${currentPath}" folder contains no items` : "You haven't created any quizzes yet"}
            </div>
            <div className="mt-4 text-sm">
              <div>• Use "📝 NEW QUIZ" button to create a quiz</div>
              <div>• Use "📁 NEW FOLDER" button to create a folder</div>
            </div>
          </div>
        )}

        {/* Quizzes - ORIGINAL BUT ENHANCED */}
        {currentQuizzes.length > 0 && currentQuizzes.map((quiz) => (
            <div key={quiz.id} className="border-4 border-green-500 bg-green-100 p-4 rounded space-y-2">
              <div className="text-terminal-bright text-lg">{quiz.title}</div>
              <div className="text-sm text-terminal-dim space-y-1">
                <div>Questions: <QuizQuestionCount quiz={quiz} showSourceInfo={false} /></div>
                <div className="flex items-center gap-2">
                  <span>Visibility:</span>
                  <div className="flex items-center gap-1">
                    {quiz.isPublic ? (
                      <>
                        <Globe className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-terminal-dim" />
                        <span className="text-terminal-dim">Private</span>
                      </>
                    )}
                  </div>
                </div>
                {quiz.timeLimit && <div>Time Limit: {quiz.timeLimit}s</div>}
                <div>Randomize: {quiz.randomize ? "Yes" : "No"}</div>
                <div>Created: {quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString() : 'Unknown'}</div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <TerminalButton 
                  onClick={async () => {
                    try {
                      const updatedQuiz = { ...quiz, isPublic: !quiz.isPublic };
                      await storage.updateQuiz(updatedQuiz);
                      await loadData();
                      toast.success(`Quiz ${updatedQuiz.isPublic ? 'made public' : 'made private'}`);
                    } catch (error) {
                      handleError(error, { userMessage: "Failed to update quiz visibility" });
                    }
                  }}
                  variant="secondary"
                  title={quiz.isPublic ? "Make Private" : "Make Public"}
                >
                  {quiz.isPublic ? (
                    <>
                      <Lock className="w-4 h-4 inline mr-1" />
                      make private
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 inline mr-1" />
                      make public
                    </>
                  )}
                </TerminalButton>
                <TerminalButton onClick={() => navigate(`/quiz/${quiz.id}`)}>preview</TerminalButton>
                <TerminalButton onClick={() => navigate(`/leaderboard/${quiz.id}`)}>leaderboard</TerminalButton>
                <TerminalButton onClick={() => navigate(`/create-quiz?edit=${quiz.id}`)}>
                  <Edit className="w-4 h-4 inline mr-1" />edit
                </TerminalButton>
                <TerminalButton onClick={() => navigate(`/quiz/${quiz.id}/advanced?mode=edit`)}>
                  🔧 advanced
                </TerminalButton>
                <TerminalButton onClick={() => handleCopyJSON(quiz)}>
                  <Copy className="w-4 h-4 inline mr-1" />copy JSON
                </TerminalButton>
                <TerminalButton
                  onClick={() => {
                    setSelectedQuiz(quiz);
                    setShowMoveDialog(true);
                  }}
                >
                  📁 move
                </TerminalButton>
                {quiz.editMode === 'pull_requests' && quiz.creator !== user?.id && (
                  <TerminalButton onClick={() => navigate(`/request-access?type=quiz&id=${quiz.id}`)}>
                    <Send className="w-4 h-4 inline mr-1" />send edit request
                  </TerminalButton>
                )}
                <TerminalButton onClick={() => handleDeleteQuiz(quiz.id)}>
                  <Trash2 className="w-4 h-4 inline mr-1" />delete
                </TerminalButton>
              </div>
            </div>
          ))
        )}

        {/* Back to dashboard at bottom */}
        <div className="flex gap-3 pt-6 border-t border-terminal-accent/30 mt-6">
          <TerminalButton onClick={() => navigate("/dashboard")}>
            ← BACK TO DASHBOARD
          </TerminalButton>
        </div>
      </div>

      {/* Move quiz dialog */}
      {showMoveDialog && selectedQuiz && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
            <TerminalLine prefix="#">Move Quiz: {selectedQuiz.title}</TerminalLine>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {getAllFolderPaths(selectedQuiz.folderPath).map((path) => (
                <button
                  key={path}
                  onClick={() => handleMoveQuiz(path === "Root" ? "" : path)}
                  className="w-full text-left p-2 border border-terminal-accent/30 rounded hover:bg-terminal-accent/20 transition-colors"
                >
                  {path === "Root" ? "📁 Root" : `📁 ${path}`}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <TerminalButton onClick={() => {
                setShowMoveDialog(false);
                setSelectedQuiz(null);
              }}>cancel</TerminalButton>
            </div>
          </div>
        </div>
      )}
    </Terminal>
  );
};
