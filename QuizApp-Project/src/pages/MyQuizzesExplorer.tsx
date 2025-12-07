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
import { EnhancedFolderNavigation } from "@/components/EnhancedFolderNavigation";

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
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'details' | 'list'>('details');
  
  // Get recursive question counts for all quizzes
  const { questionCounts } = useRecursiveQuestionCounts(quizzes);

  // Copy/Cut/Paste functionality state (declared early to avoid reference issues)
  const [clipboard, setClipboard] = useState<{ id: string, type: 'quiz' | 'folder', operation: 'copy' | 'cut' } | null>(null);

  // Drag and drop functionality
  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'quiz' | 'folder' } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, itemId: string, itemType: 'quiz' | 'folder' } | null>(null);

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

  // Helper function to get parent path (declared early)
  const getParentPath = (path: string): string => {
    if (!path) return '';
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
  };

  // Callback functions (declared early to avoid dependency issues)
  const handleDelete = React.useCallback(async (quizId: string) => {
    if (confirm("Delete this quiz?")) {
      await storage.deleteQuiz(quizId);
      await loadData();
      toast.success("Quiz deleted!");
    }
  }, [loadData]);

  const navigateToFolder = React.useCallback((folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
  }, [currentPath]);

  // Copy/Cut/Paste functionality
  const handleCopy = React.useCallback((itemId: string, itemType: 'quiz' | 'folder') => {
    setClipboard({ id: itemId, type: itemType, operation: 'copy' });
    toast.success(`${itemType === 'quiz' ? 'Quiz' : 'Folder'} copied to clipboard`);
  }, []);

  const handleCut = React.useCallback((itemId: string, itemType: 'quiz' | 'folder') => {
    setClipboard({ id: itemId, type: itemType, operation: 'cut' });
    toast.success(`${itemType === 'quiz' ? 'Quiz' : 'Folder'} cut to clipboard`);
  }, []);

  const handlePaste = React.useCallback(async (targetPath?: string) => {
    if (!clipboard) {
      toast.error('Clipboard is empty');
      return;
    }

    const finalTargetPath = targetPath || currentPath;

    try {
      if (clipboard.type === 'quiz') {
        const quiz = quizzes.find(q => q.id === clipboard.id);
        if (!quiz) {
          toast.error('Original quiz not found');
          setClipboard(null);
          return;
        }

        if (clipboard.operation === 'copy') {
          // Create a copy of the quiz
          const newQuiz = {
            ...quiz,
            id: Date.now().toString(),
            title: `${quiz.title} (Copy)`,
            folderPath: finalTargetPath || undefined,
            createdAt: Date.now()
          };
          await storage.saveQuiz(newQuiz);
          toast.success(`Quiz copied to ${finalTargetPath || 'root folder'}!`);
        } else {
          // Move the quiz (cut operation)
          const updatedQuiz = { ...quiz, folderPath: finalTargetPath || undefined };
          await storage.updateQuiz(updatedQuiz);
          toast.success(`Quiz moved to ${finalTargetPath || 'root folder'}!`);
          setClipboard(null); // Clear clipboard after cut
        }
      } else {
        const folder = folders.find(f => f.id === clipboard.id);
        if (!folder) {
          toast.error('Original folder not found');
          setClipboard(null);
          return;
        }

        if (clipboard.operation === 'copy') {
          // Create a copy of the folder
          const newFolder = {
            ...folder,
            id: Date.now().toString(),
            name: `${folder.name} (Copy)`,
            parentPath: finalTargetPath || undefined,
            createdAt: Date.now()
          };
          await storage.saveFolder(newFolder);
          toast.success(`Folder copied to ${finalTargetPath || 'root folder'}!`);
        } else {
          // Move the folder (cut operation)
          const updatedFolder = { ...folder, parentPath: finalTargetPath || undefined };
          await storage.updateFolder(updatedFolder);
          toast.success(`Folder moved to ${finalTargetPath || 'root folder'}!`);
          setClipboard(null); // Clear clipboard after cut
        }
      }

      await loadData();
    } catch (error) {
      handleError(error, { userMessage: "Failed to paste item" });
    }
  }, [clipboard, currentPath, quizzes, folders, loadData]);

  // Enhanced folder moving functionality (declared before handleMoveToParent)
  const handleMoveItem = async (itemId: string, itemType: 'quiz' | 'folder', targetPath: string) => {
    try {
      if (itemType === 'quiz') {
        const quiz = quizzes.find(q => q.id === itemId);
        if (!quiz) {
          toast.error('Quiz not found');
          return;
        }
        
        const updatedQuiz = { ...quiz, folderPath: targetPath || undefined };
        await storage.updateQuiz(updatedQuiz);
        toast.success(`Quiz moved to ${targetPath || 'root folder'}!`);
      } else {
        const folder = folders.find(f => f.id === itemId);
        if (!folder) {
          toast.error('Folder not found');
          return;
        }
        
        const updatedFolder = { ...folder, parentPath: targetPath || undefined };
        await storage.updateFolder(updatedFolder);
        toast.success(`Folder "${folder.name}" moved to ${targetPath || 'root folder'}!`);
      }
      await loadData();
    } catch (error) {
      handleError(error, { userMessage: "Failed to move item" });
      await loadData();
    }
  };

  // Navigate to parent folder
  const handleMoveToParent = React.useCallback(async (itemId: string, itemType: 'quiz' | 'folder') => {
    const parentPath = getParentPath(currentPath);
    await handleMoveItem(itemId, itemType, parentPath);
  }, [currentPath, handleMoveItem]);

  // Get current items (declared early for keyboard shortcuts)
  const currentSubfolders = getCurrentSubfolders();
  const currentQuizzes = getCurrentFolderQuizzes();

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

  const handleDeleteFolder = React.useCallback(async (folderId: string, folderName: string) => {
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
  }, [currentPath, quizzes, folders, loadData]);

  const handleRenameFolder = async (folderId: string) => {
    if (!renameFolderValue.trim()) {
      setShowRenameFolder(null);
      return;
    }
    
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
      toast.success(`Folder renamed to "${validation.data}"!`);
    } catch (error) {
      handleError(error, { userMessage: "Failed to rename folder" });
    }
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, itemId: string, itemType: 'quiz' | 'folder') => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      itemId,
      itemType
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDragStart = (e: React.DragEvent, itemId: string, itemType: 'quiz' | 'folder') => {
    setDraggedItem({ id: itemId, type: itemType });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${itemType}:${itemId}`);
    
    // Add visual feedback
    setTimeout(() => {
      const element = e.target as HTMLElement;
      element.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.target as HTMLElement;
    element.style.opacity = '1';
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(targetPath);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop target if we're actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropTarget(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    setDropTarget(null);
    
    if (!draggedItem) return;
    
    // Calculate the correct target path for folder drops
    let finalTargetPath = targetPath;
    
    // If targetPath equals currentPath, we're dropping into the current folder background
    if (targetPath === currentPath) {
      finalTargetPath = currentPath;
    } else {
      // We're dropping into a specific subfolder
      // The targetPath is the folder name, we need to construct full path
      finalTargetPath = currentPath ? `${currentPath}/${targetPath}` : targetPath;
    }
    
    // Prevent dropping item into itself
    if (draggedItem.type === 'folder') {
      const draggedFolder = folders.find(f => f.id === draggedItem.id);
      if (draggedFolder && finalTargetPath.includes(draggedFolder.name)) {
        toast.error("Cannot move folder into itself or its subfolder");
        return;
      }
    }
    
    // Prevent moving to same location
    if (draggedItem.type === 'quiz') {
      const quiz = quizzes.find(q => q.id === draggedItem.id);
      if (quiz && (quiz.folderPath || '') === finalTargetPath) {
        return; // Already in target location
      }
    } else {
      const folder = folders.find(f => f.id === draggedItem.id);
      if (folder && (folder.parentPath || '') === finalTargetPath) {
        return; // Already in target location
      }
    }
    
    await handleMoveItem(draggedItem.id, draggedItem.type, finalTargetPath);
    setDraggedItem(null);
  };

  // Global keyboard shortcuts
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only process if we're in the file manager and not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' && selectedItem) {
        e.preventDefault();
        const [type, id] = selectedItem.split('-');
        if (type === 'quiz') {
          handleDelete(id);
        } else if (type === 'folder') {
          const folder = folders.find(f => f.id === id);
          if (folder) handleDeleteFolder(id, folder.name);
        }
      } else if (e.key === 'F2' && selectedItem) {
        e.preventDefault();
        const [type, id] = selectedItem.split('-');
        if (type === 'folder') {
          const folder = folders.find(f => f.id === id);
          if (folder) {
            setRenameFolderValue(folder.name);
            setShowRenameFolder(id);
          }
        }
      } else if (e.key === 'Enter' && selectedItem) {
        e.preventDefault();
        const [type, id] = selectedItem.split('-');
        if (type === 'quiz') {
          navigate(`/quiz/${id}`);
        } else if (type === 'folder') {
          const folder = folders.find(f => f.id === id);
          if (folder) navigateToFolder(folder.name);
        }
      } else if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        if (selectedItem) {
          const [type, id] = selectedItem.split('-');
          handleCopy(id, type as 'quiz' | 'folder');
        }
      } else if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        if (selectedItem) {
          const [type, id] = selectedItem.split('-');
          handleCut(id, type as 'quiz' | 'folder');
        }
      } else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        if (clipboard) {
          // Check if item already exists in current folder
          if (clipboard.type === 'quiz') {
            const existingQuiz = currentQuizzes.find(q => 
              clipboard.operation === 'copy' ? 
                q.title === `${quizzes.find(qz => qz.id === clipboard.id)?.title} (Copy)` :
                q.id === clipboard.id
            );
            if (!existingQuiz) {
              handlePaste();
            } else {
              toast.info(`${clipboard.type} already exists in this folder`);
            }
          } else {
            const existingFolder = currentSubfolders.find(f => 
              clipboard.operation === 'copy' ? 
                f.name === `${folders.find(fd => fd.id === clipboard.id)?.name} (Copy)` :
                f.id === clipboard.id
            );
            if (!existingFolder) {
              handlePaste();
            } else {
              toast.info(`${clipboard.type} already exists in this folder`);
            }
          }
        }
      } else if (e.key === 'Backspace' && selectedItem) {
        e.preventDefault();
        const [type, id] = selectedItem.split('-');
        handleMoveToParent(id, type as 'quiz' | 'folder');
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedItem, clipboard, currentQuizzes, currentSubfolders, quizzes, folders, handlePaste, handleCopy, handleCut, handleDelete, handleDeleteFolder, handleMoveToParent, navigate, navigateToFolder, setRenameFolderValue, setShowRenameFolder]);

  // Keep the local handler for the component focus
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // This is now just for component focus, actual handling is done globally
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
    
    // Update the folder itself
    const updatedFolder = { ...folder, isPublic };
    if (storage.updateFolder) {
      await storage.updateFolder(updatedFolder);
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
    
    // Update ALL child folders regardless of their current visibility
    for (const childFolder of allChildFolders) {
      const updatedChildFolder = { ...childFolder, isPublic };
      if (storage.updateFolder) {
        await storage.updateFolder(updatedChildFolder);
      }
    }
    
    // Find ALL quizzes in this folder and ALL its subfolders
    const allAffectedQuizzes = quizzes.filter((q) => {
      if (!q.folderPath) return false;
      return q.folderPath === folderPath || q.folderPath.startsWith(folderPath + '/');
    });
    
    // Update ALL quizzes regardless of their current visibility
    for (const quiz of allAffectedQuizzes) {
      const updatedQuiz = { ...quiz, isPublic };
      await storage.updateQuiz(updatedQuiz);
    }
  };

  return (
    <Terminal title="my-quizzes-explorer">
      <div className="flex flex-col h-full" onKeyDown={handleKeyDown} tabIndex={0}>
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
        <div 
          className={`flex-1 border border-terminal-accent/30 rounded overflow-hidden ${dropTarget === currentPath ? 'border-green-500 bg-green-500/10' : ''}`}
          onDragOver={(e) => handleDragOver(e, currentPath)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, currentPath)}
        >
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
                    } ${dropTarget === folder.name ? 'bg-green-500/20 border-green-500' : ''}`}
                    onClick={() => setSelectedItem(`folder-${folder.id}`)}
                    onDoubleClick={() => navigateToFolder(folder.name)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, folder.name)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder.name)}
                    onContextMenu={(e) => handleContextMenu(e, folder.id, 'folder')}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {showRenameFolder === folder.id ? (
                          <input
                            type="text"
                            value={renameFolderValue}
                            onChange={(e) => setRenameFolderValue(e.target.value)}
                            onBlur={() => handleRenameFolder(folder.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRenameFolder(folder.id);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setShowRenameFolder(null);
                                setRenameFolderValue("");
                              }
                            }}
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
                    draggable
                    onDragStart={(e) => handleDragStart(e, quiz.id, 'quiz')}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => handleContextMenu(e, quiz.id, 'quiz')}
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
                  } ${dropTarget === folder.name ? 'bg-green-500/20 border-green-500' : ''}`}
                  onClick={() => setSelectedItem(`folder-${folder.id}`)}
                  onDoubleClick={() => navigateToFolder(folder.name)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, folder.name)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.name)}
                  onContextMenu={(e) => handleContextMenu(e, folder.id, 'folder')}
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
                  draggable
                  onDragStart={(e) => handleDragStart(e, quiz.id, 'quiz')}
                  onDragEnd={handleDragEnd}
                  onContextMenu={(e) => handleContextMenu(e, quiz.id, 'quiz')}
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

        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-2">
            <TerminalButton onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </TerminalButton>
            {clipboard && (
              <TerminalButton onClick={() => handlePaste()} className="bg-green-600 hover:bg-green-700">
                📋 Paste {clipboard.type} ({clipboard.operation})
              </TerminalButton>
            )}
          </div>
          
          <div className="text-xs text-terminal-dim">
            <span className="font-semibold">Shortcuts:</span> 
            Del (Delete) | F2 (Rename) | Enter (Open) | Ctrl+C (Copy) | Ctrl+X (Cut) | Ctrl+V (Paste) | Backspace (Move to Parent)
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-terminal border border-terminal-accent rounded shadow-lg py-2 z-50"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 text-xs text-terminal-dim border-b border-terminal-accent/30 mb-1">
              {contextMenu.itemType === 'quiz' ? 'Quiz Options' : 'Folder Options'}
            </div>
            
            <button
              onClick={() => {
                handleCopy(contextMenu.itemId, contextMenu.itemType);
                handleCloseContextMenu();
              }}
              className="w-full px-3 py-1 text-left hover:bg-terminal-accent/20 text-sm"
            >
              📋 Copy
            </button>
            
            <button
              onClick={() => {
                handleCut(contextMenu.itemId, contextMenu.itemType);
                handleCloseContextMenu();
              }}
              className="w-full px-3 py-1 text-left hover:bg-terminal-accent/20 text-sm"
            >
              ✂️ Cut
            </button>
            
            {currentPath && (
              <button
                onClick={() => {
                  handleMoveToParent(contextMenu.itemId, contextMenu.itemType);
                  handleCloseContextMenu();
                }}
                className="w-full px-3 py-1 text-left hover:bg-terminal-accent/20 text-sm"
              >
                ⬆️ Move to Parent
              </button>
            )}
            
            <hr className="my-1 border-terminal-accent/30" />
            
            {contextMenu.itemType === 'folder' && (
              <button
                onClick={() => {
                  const folder = folders.find(f => f.id === contextMenu.itemId);
                  if (folder) {
                    setRenameFolderValue(folder.name);
                    setShowRenameFolder(contextMenu.itemId);
                  }
                  handleCloseContextMenu();
                }}
                className="w-full px-3 py-1 text-left hover:bg-terminal-accent/20 text-sm"
              >
                ✏️ Rename
              </button>
            )}
            
            <button
              onClick={() => {
                if (contextMenu.itemType === 'quiz') {
                  handleDelete(contextMenu.itemId);
                } else {
                  const folder = folders.find(f => f.id === contextMenu.itemId);
                  if (folder) handleDeleteFolder(contextMenu.itemId, folder.name);
                }
                handleCloseContextMenu();
              }}
              className="w-full px-3 py-1 text-left hover:bg-red-500/20 text-sm text-red-400"
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>
    </Terminal>
  );
};
