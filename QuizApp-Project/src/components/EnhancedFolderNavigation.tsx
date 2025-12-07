import React, { useState, useRef } from 'react';
import { 
  Folder, FolderOpen, FileText, Edit, Trash2, Move, 
  ChevronRight, MoreHorizontal, Copy, Share2, Lock, Globe,
  FolderPlus, FilePlus, Search, Filter, Grid, List
} from "lucide-react";
import { Quiz, QuizFolder } from "@/types/quiz";
import { toast } from "sonner";

interface EnhancedFolderNavigationProps {
  folders: QuizFolder[];
  quizzes: Quiz[];
  currentPath: string;
  selectedItems: string[];
  onNavigateToFolder: (folderName: string) => void;
  onSelectItem: (itemId: string, multiSelect?: boolean) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string, folderName: string) => void;
  onMoveItems: (itemIds: string[], targetPath: string) => void;
  onCreateFolder: () => void;
  onCreateQuiz: () => void;
  onToggleFolderVisibility: (folder: QuizFolder) => void;
}

export const EnhancedFolderNavigation: React.FC<EnhancedFolderNavigationProps> = ({
  folders,
  quizzes,
  currentPath,
  selectedItems,
  onNavigateToFolder,
  onSelectItem,
  onRenameFolder,
  onDeleteFolder,
  onMoveItems,
  onCreateFolder,
  onCreateQuiz,
  onToggleFolderVisibility
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter items based on search
  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string, itemType: 'folder' | 'quiz') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ itemId, itemType }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetFolderId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(targetFolderId || 'root');
  };

  const handleDrop = (e: React.DragEvent, targetFolderId?: string) => {
    e.preventDefault();
    setDragOver(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const targetPath = targetFolderId 
        ? folders.find(f => f.id === targetFolderId)?.name || ''
        : '';
      
      if (data.itemId !== targetFolderId) {
        onMoveItems([data.itemId], targetPath);
        toast.success(`Moved ${data.itemType} successfully!`);
      }
    } catch (error) {
      toast.error('Failed to move item');
    }
  };

  // Bulk operations
  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    
    const confirmMessage = `Delete ${selectedItems.length} selected item(s)?`;
    if (confirm(confirmMessage)) {
      selectedItems.forEach(itemId => {
        const folder = folders.find(f => f.id === itemId);
        if (folder) {
          onDeleteFolder(folder.id, folder.name);
        }
        // Handle quiz deletion similarly
      });
      toast.success(`Deleted ${selectedItems.length} item(s)`);
    }
  };

  const handleBulkMove = () => {
    if (selectedItems.length === 0) return;
    setShowMoveDialog(true);
  };

  const startRename = (item: QuizFolder | Quiz, currentName: string) => {
    setRenamingId(item.id);
    setRenameValue(currentName);
  };

  const finishRename = (itemId: string) => {
    if (renameValue.trim() && renameValue !== '') {
      const folder = folders.find(f => f.id === itemId);
      if (folder) {
        onRenameFolder(itemId, renameValue.trim());
      }
    }
    setRenamingId(null);
    setRenameValue('');
  };

  // Context menu for right-click operations
  const handleContextMenu = (e: React.MouseEvent, item: QuizFolder | Quiz) => {
    e.preventDefault();
    // Future: implement context menu
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-3 bg-terminal-accent/5 rounded-lg border border-terminal-accent/20">
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateFolder}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>
          <button
            onClick={onCreateQuiz}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm transition-colors"
          >
            <FilePlus className="w-4 h-4" />
            New Quiz
          </button>
          
          {selectedItems.length > 0 && (
            <>
              <div className="w-px h-6 bg-terminal-accent/30" />
              <button
                onClick={handleBulkMove}
                className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded text-sm transition-colors"
              >
                <Move className="w-4 h-4" />
                Move ({selectedItems.length})
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedItems.length})
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-terminal-dim" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-terminal border border-terminal-accent/30 rounded text-sm focus:border-terminal-accent/60 focus:outline-none"
            />
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex border border-terminal-accent/30 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 ${viewMode === 'list' ? 'bg-terminal-accent/20 text-terminal-accent' : 'text-terminal-dim hover:text-terminal-foreground'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-terminal-accent/20 text-terminal-accent' : 'text-terminal-dim hover:text-terminal-foreground'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Items Display */}
      {viewMode === 'list' ? (
        <div className="space-y-1">
          {/* Folders */}
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              draggable
              onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDrop={(e) => handleDrop(e, folder.id)}
              onContextMenu={(e) => handleContextMenu(e, folder)}
              className={`group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                selectedItems.includes(folder.id) 
                  ? 'border-terminal-accent bg-terminal-accent/10' 
                  : 'border-terminal-accent/20 hover:border-terminal-accent/40 hover:bg-terminal-accent/5'
              } ${dragOver === folder.id ? 'border-blue-400 bg-blue-400/10' : ''}`}
              onClick={(e) => onSelectItem(folder.id, e.ctrlKey || e.metaKey)}
              onDoubleClick={() => onNavigateToFolder(folder.name)}
            >
              <FolderOpen className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                {renamingId === folder.id ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => finishRename(folder.id)}
                    onKeyPress={(e) => e.key === 'Enter' && finishRename(folder.id)}
                    className="bg-terminal border border-terminal-accent text-terminal-foreground px-2 py-1 rounded text-sm w-full"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-terminal-foreground font-medium truncate">{folder.name}</span>
                    <div className="flex items-center gap-1">
                      {folder.isPublic ? (
                        <Globe className="w-4 h-4 text-green-400" title="Public" />
                      ) : (
                        <Lock className="w-4 h-4 text-terminal-dim" title="Private" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(folder, folder.name);
                  }}
                  className="p-1.5 hover:bg-terminal-accent/20 rounded"
                  title="Rename"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFolderVisibility(folder);
                  }}
                  className="p-1.5 hover:bg-terminal-accent/20 rounded"
                  title={folder.isPublic ? "Make Private" : "Make Public"}
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder.id, folder.name);
                  }}
                  className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Quizzes */}
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              draggable
              onDragStart={(e) => handleDragStart(e, quiz.id, 'quiz')}
              onContextMenu={(e) => handleContextMenu(e, quiz)}
              className={`group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                selectedItems.includes(quiz.id) 
                  ? 'border-terminal-accent bg-terminal-accent/10' 
                  : 'border-terminal-accent/20 hover:border-terminal-accent/40 hover:bg-terminal-accent/5'
              }`}
              onClick={(e) => onSelectItem(quiz.id, e.ctrlKey || e.metaKey)}
            >
              <FileText className="w-5 h-5 text-terminal-accent flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-terminal-foreground font-medium truncate">{quiz.title}</span>
                  <span className="text-xs text-terminal-dim">({quiz.questions?.length || 0} questions)</span>
                  <div className="flex items-center gap-1">
                    {quiz.isPublic ? (
                      <Globe className="w-3 h-3 text-green-400" />
                    ) : (
                      <Lock className="w-3 h-3 text-terminal-dim" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(quiz.id);
                    toast.success('Quiz ID copied to clipboard');
                  }}
                  className="p-1.5 hover:bg-terminal-accent/20 rounded"
                  title="Copy Quiz ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              draggable
              onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDrop={(e) => handleDrop(e, folder.id)}
              className={`group aspect-square flex flex-col items-center justify-center gap-2 p-4 rounded-lg border transition-all cursor-pointer ${
                selectedItems.includes(folder.id) 
                  ? 'border-terminal-accent bg-terminal-accent/10' 
                  : 'border-terminal-accent/20 hover:border-terminal-accent/40 hover:bg-terminal-accent/5'
              } ${dragOver === folder.id ? 'border-blue-400 bg-blue-400/10' : ''}`}
              onClick={(e) => onSelectItem(folder.id, e.ctrlKey || e.metaKey)}
              onDoubleClick={() => onNavigateToFolder(folder.name)}
            >
              <FolderOpen className="w-8 h-8 text-yellow-400" />
              <span className="text-sm text-center text-terminal-foreground truncate w-full">{folder.name}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {folder.isPublic ? (
                  <Globe className="w-3 h-3 text-green-400" />
                ) : (
                  <Lock className="w-3 h-3 text-terminal-dim" />
                )}
              </div>
            </div>
          ))}

          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              draggable
              onDragStart={(e) => handleDragStart(e, quiz.id, 'quiz')}
              className={`group aspect-square flex flex-col items-center justify-center gap-2 p-4 rounded-lg border transition-all cursor-pointer ${
                selectedItems.includes(quiz.id) 
                  ? 'border-terminal-accent bg-terminal-accent/10' 
                  : 'border-terminal-accent/20 hover:border-terminal-accent/40 hover:bg-terminal-accent/5'
              }`}
              onClick={(e) => onSelectItem(quiz.id, e.ctrlKey || e.metaKey)}
            >
              <FileText className="w-8 h-8 text-terminal-accent" />
              <span className="text-sm text-center text-terminal-foreground truncate w-full">{quiz.title}</span>
              <span className="text-xs text-terminal-dim">({quiz.questions?.length || 0})</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredFolders.length === 0 && filteredQuizzes.length === 0 && (
        <div className="text-center py-12 text-terminal-dim">
          {searchTerm ? (
            <div>
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div>
              <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>This folder is empty</p>
              <p className="text-sm mt-2">Create a new folder or quiz to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};