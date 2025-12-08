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
  Copy, Edit, Trash2, Folder, FolderOpen, ChevronRight, ChevronDown, Home,
  FolderPlus, FilePlus, Share2, Clock, FileText, Lock, Globe, Tag
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
  
  // Copy/Cut/Paste functionality
  const [clipboard, setClipboard] = useState<{
    itemId: string;
    itemType: 'quiz' | 'folder';
    operation: 'copy' | 'cut';
  } | null>(null);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{
    id: string;
    type: 'quiz' | 'folder';
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ 
    x: number; 
    y: number; 
    itemId: string; 
    itemType: 'quiz' | 'folder' 
  } | null>(null);
  
  // Folder tag editing
  const [showEditFolderTags, setShowEditFolderTags] = useState<string | null>(null);
  const [editFolderTagsValue, setEditFolderTagsValue] = useState("");
  
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

  // Copy/Cut/Paste functions
  const handleCopy = (itemId: string, itemType: 'quiz' | 'folder') => {
    setClipboard({ itemId, itemType, operation: 'copy' });
    toast.success(`${itemType} copied to clipboard`);
  };

  const handleCut = (itemId: string, itemType: 'quiz' | 'folder') => {
    setClipboard({ itemId, itemType, operation: 'cut' });
    toast.success(`${itemType} cut to clipboard`);
  };

  const handlePaste = async () => {
    if (!clipboard) return;

    try {
      if (clipboard.itemType === 'quiz') {
        const quiz = quizzes.find(q => q.id === clipboard.itemId);
        if (!quiz) {
          toast.error('Quiz not found');
          return;
        }

        if (clipboard.operation === 'copy') {
          // Create a copy of the quiz in current folder
          const newQuiz: Quiz = {
            ...quiz,
            id: Date.now().toString(),
            title: `${quiz.title} (copy)`,
            folderPath: currentPath || undefined,
            createdAt: Date.now(),
          };
          await storage.saveQuiz(newQuiz);
          toast.success('Quiz copied successfully');
        } else {
          // Move quiz to current folder
          const updatedQuiz = { ...quiz, folderPath: currentPath || undefined };
          await storage.updateQuiz(updatedQuiz);
          toast.success('Quiz moved successfully');
          setClipboard(null); // Clear clipboard after cut operation
        }
      } else {
        const folder = folders.find(f => f.id === clipboard.itemId);
        if (!folder) {
          toast.error('Folder not found');
          return;
        }

        if (clipboard.operation === 'copy') {
          // Create a copy of the folder
          const newFolder: QuizFolder = {
            ...folder,
            id: Date.now().toString(),
            name: `${folder.name} (copy)`,
            parentPath: currentPath || undefined,
            createdAt: Date.now(),
          };
          await storage.saveFolder(newFolder);
          toast.success('Folder copied successfully');
        } else {
          // Move folder to current location
          const updatedFolder = { ...folder, parentPath: currentPath || undefined };
          await storage.updateFolder(updatedFolder);
          toast.success('Folder moved successfully');
          setClipboard(null); // Clear clipboard after cut operation
        }
      }

      await loadData();
    } catch (error) {
      handleError(error, { userMessage: 'Failed to paste item' });
    }
  };

  // Drag and Drop functions
  const handleDragStart = (e: React.DragEvent, itemId: string, itemType: 'quiz' | 'folder') => {
    setDraggedItem({ id: itemId, type: itemType });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    setDropTarget(targetPath);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedItem) return;

    try {
      if (draggedItem.type === 'quiz') {
        const quiz = quizzes.find(q => q.id === draggedItem.id);
        if (!quiz) return;

        const updatedQuiz = { ...quiz, folderPath: targetPath || undefined };
        await storage.updateQuiz(updatedQuiz);
        toast.success('Quiz moved successfully');
      } else {
        const folder = folders.find(f => f.id === draggedItem.id);
        if (!folder) return;

        const updatedFolder = { ...folder, parentPath: targetPath || undefined };
        await storage.updateFolder(updatedFolder);
        toast.success('Folder moved successfully');
      }

      await loadData();
    } catch (error) {
      handleError(error, { userMessage: 'Failed to move item' });
    }
  };

  // Context menu functions
  const handleContextMenu = (e: React.MouseEvent, itemId: string, itemType: 'quiz' | 'folder') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, itemId, itemType });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Global event listeners
  React.useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Copy: Ctrl+C
      if (e.ctrlKey && e.key === 'c' && selectedItem) {
        const [type, id] = selectedItem.split('-');
        handleCopy(id, type as 'quiz' | 'folder');
      }
      // Cut: Ctrl+X  
      if (e.ctrlKey && e.key === 'x' && selectedItem) {
        const [type, id] = selectedItem.split('-');
        handleCut(id, type as 'quiz' | 'folder');
      }
      // Paste: Ctrl+V
      if (e.ctrlKey && e.key === 'v' && clipboard) {
        handlePaste();
      }
      // Delete: Delete key
      if (e.key === 'Delete' && selectedItem) {
        const [type, id] = selectedItem.split('-');
        if (type === 'quiz') {
          handleDelete(id);
        } else {
          const folder = folders.find(f => f.id === id);
          if (folder) handleDeleteFolder(id, folder.name);
        }
      }
      // Rename: F2
      if (e.key === 'F2' && selectedItem) {
        const [type, id] = selectedItem.split('-');
        if (type === 'folder') {
          const folder = folders.find(f => f.id === id);
          if (folder) {
            setRenameFolderValue(folder.name);
            setShowRenameFolder(id);
          }
        }
      }
      // Edit tags: F3
      if (e.key === 'F3' && selectedItem) {
        const [type, id] = selectedItem.split('-');
        if (type === 'folder') {
          const folder = folders.find(f => f.id === id);
          if (folder) {
            setEditFolderTagsValue((folder.tags || []).join(', '));
            setShowEditFolderTags(id);
          }
        }
      }
    };

    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [selectedItem, clipboard, folders]);

  // Folder tag editing functions
  const handleEditFolderTags = async (folderId: string) => {
    if (editFolderTagsValue.trim() === '') {
      setShowEditFolderTags(null);
      return;
    }

    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;

      const tags = editFolderTagsValue
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates

      const updatedFolder = { ...folder, tags };
      await storage.updateFolder(updatedFolder);
      
      setShowEditFolderTags(null);
      setEditFolderTagsValue("");
      await loadData();
      toast.success('Folder tags updated!');
    } catch (error) {
      handleError(error, { userMessage: "Failed to update folder tags" });
    }
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

        {/* Edit Folder Tags Dialog */}
        {showEditFolderTags && (
          <div className="mb-4 p-3 border border-terminal-accent/50 rounded bg-terminal-accent/5">
            <TerminalInput
              label="folder tags (comma separated):"
              value={editFolderTagsValue}
              onChange={(e) => setEditFolderTagsValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEditFolderTags(showEditFolderTags)}
              placeholder="tag1, tag2, tag3"
            />
            <div className="flex gap-2 mt-2">
              <TerminalButton onClick={() => handleEditFolderTags(showEditFolderTags)}>
                Save Tags
              </TerminalButton>
              <TerminalButton onClick={() => {
                setShowEditFolderTags(null);
                setEditFolderTagsValue("");
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
                          title="Rename (F2)"
                        >
                          <Edit className="w-4 h-4 text-terminal-foreground" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditFolderTagsValue((folder.tags || []).join(', '));
                            setShowEditFolderTags(folder.id);
                          }}
                          className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
                          title="Edit Tags (F3)"
                        >
                          <Tag className="w-4 h-4 text-terminal-foreground" />
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
            
            <hr className="my-1 border-terminal-accent/30" />
            
            {contextMenu.itemType === 'folder' && (
              <>
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
                
                <button
                  onClick={() => {
                    const folder = folders.find(f => f.id === contextMenu.itemId);
                    if (folder) {
                      setEditFolderTagsValue((folder.tags || []).join(', '));
                      setShowEditFolderTags(contextMenu.itemId);
                    }
                    handleCloseContextMenu();
                  }}
                  className="w-full px-3 py-1 text-left hover:bg-terminal-accent/20 text-sm"
                >
                  🏷️ Edit Tags
                </button>
                
                <hr className="my-1 border-terminal-accent/30" />
              </>
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

        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-2">
            <TerminalButton onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </TerminalButton>
            {clipboard && (
              <TerminalButton onClick={() => handlePaste()} className="bg-green-600 hover:bg-green-700">
                📋 Paste {clipboard.itemType} ({clipboard.operation})
              </TerminalButton>
            )}
          </div>
          
          <div className="text-xs text-terminal-dim">
            <span className="font-semibold">Shortcuts:</span> 
            Del (Delete) | F2 (Rename) | F3 (Edit Tags) | Enter (Open) | Ctrl+C (Copy) | Ctrl+X (Cut) | Ctrl+V (Paste)
          </div>
        </div>
      </div>
    </Terminal>
  );
};
