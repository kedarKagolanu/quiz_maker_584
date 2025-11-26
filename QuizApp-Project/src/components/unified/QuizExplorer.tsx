import React, { useState, useEffect } from 'react';
import { Quiz, QuizFolder } from '@/types/quiz';
import { QuizDetailInfo, QuizDetailResolver } from '@/lib/quizDetails';
import { QuizCard } from './QuizCard';
import { storage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, Folder, FolderOpen, Home, Search, Filter, Grid, List } from 'lucide-react';

interface QuizExplorerProps {
  mode?: 'browse' | 'dashboard' | 'picker';
  showActions?: boolean;
  onQuizSelect?: (quizId: string, details: QuizDetailInfo) => void;
  onQuizPlay?: (quizId: string) => void;
  onQuizEdit?: (quizId: string) => void;
  onQuizCustomize?: (quizId: string) => void;
  onQuizShare?: (quizId: string) => void;
  onQuizDelete?: (quizId: string) => void;
  initialFolder?: string;
  showValidationFilter?: boolean;
}

export const QuizExplorer: React.FC<QuizExplorerProps> = ({
  mode = 'browse',
  showActions = true,
  onQuizSelect,
  onQuizPlay,
  onQuizEdit,
  onQuizCustomize,
  onQuizShare,
  onQuizDelete,
  initialFolder = '',
  showValidationFilter = false
}) => {
  const { user } = useAuth();
  const [currentFolder, setCurrentFolder] = useState(initialFolder);
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [quizDetails, setQuizDetails] = useState<Map<string, QuizDetailInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterValid, setFilterValid] = useState<'all' | 'valid' | 'invalid'>('all');
  const [filterType, setFilterType] = useState<'all' | 'single' | 'multi'>('all');
  
  const [quizDetailResolver] = useState(() => new QuizDetailResolver(storage));

  useEffect(() => {
    if (user) {
      loadFolderContents();
    }
  }, [user, currentFolder]);

  const loadFolderContents = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get accessible quizzes and folders
      const quizDetailsWithQuiz = await quizDetailResolver.getAccessibleQuizzes(user.id, currentFolder);
      const folderTree = await quizDetailResolver.getFolderTreeWithDetails(user.id);
      
      // Filter folders for current path
      const currentFolders = folderTree
        .filter(({ folder }) => (folder.parentPath || '') === currentFolder)
        .map(({ folder }) => folder);
      
      // Create details map
      const detailsMap = new Map<string, QuizDetailInfo>();
      quizDetailsWithQuiz.forEach(({ quiz, ...details }) => {
        detailsMap.set(quiz.id, details);
      });
      
      setFolders(currentFolders);
      setQuizDetails(detailsMap);
      
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentFolder(folderPath);
  };

  const getFilteredQuizzes = () => {
    let filtered = Array.from(quizDetails.values());
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(quiz => 
        quiz.title.toLowerCase().includes(term) ||
        quiz.description?.toLowerCase().includes(term)
      );
    }
    
    // Filter by validation
    if (filterValid !== 'all') {
      filtered = filtered.filter(quiz => 
        filterValid === 'valid' ? quiz.isValid : !quiz.isValid
      );
    }
    
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(quiz => 
        filterType === 'multi' ? quiz.isMultiQuiz : !quiz.isMultiQuiz
      );
    }
    
    return filtered;
  };

  const getBreadcrumbs = () => {
    if (!currentFolder) return [{ name: 'Root', path: '' }];
    
    const parts = currentFolder.split('/');
    const breadcrumbs = [{ name: 'Root', path: '' }];
    
    for (let i = 0; i < parts.length; i++) {
      const path = parts.slice(0, i + 1).join('/');
      breadcrumbs.push({
        name: parts[i],
        path
      });
    }
    
    return breadcrumbs;
  };

  const handleQuizAction = (action: string, quizId: string) => {
    const details = quizDetails.get(quizId);
    if (!details) return;

    switch (action) {
      case 'select':
        onQuizSelect?.(quizId, details);
        break;
      case 'play':
        onQuizPlay?.(quizId);
        break;
      case 'edit':
        onQuizEdit?.(quizId);
        break;
      case 'customize':
        onQuizCustomize?.(quizId);
        break;
      case 'share':
        onQuizShare?.(quizId);
        break;
      case 'delete':
        onQuizDelete?.(quizId);
        break;
    }
  };

  const filteredQuizzes = getFilteredQuizzes();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-terminal-dim">Loading quizzes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-terminal-dim">
          {getBreadcrumbs().map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-4 h-4" />}
              <button
                onClick={() => navigateToFolder(crumb.path)}
                className="flex items-center gap-1 hover:text-terminal-bright transition-colors"
              >
                {idx === 0 ? <Home className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 rounded hover:bg-terminal-accent/20 text-terminal-dim transition-colors"
            title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-terminal-dim" />
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-terminal border border-terminal-accent rounded text-terminal-bright placeholder-terminal-dim focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {showValidationFilter && (
          <select
            value={filterValid}
            onChange={(e) => setFilterValid(e.target.value as any)}
            className="bg-terminal border border-terminal-accent rounded px-3 py-2 text-terminal-bright focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Quizzes</option>
            <option value="valid">Valid Only</option>
            <option value="invalid">Issues Only</option>
          </select>
        )}

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="bg-terminal border border-terminal-accent rounded px-3 py-2 text-terminal-bright focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="single">Single Quiz</option>
          <option value="multi">Multi-Quiz</option>
        </select>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-terminal-bright">📁 Folders</h3>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {folders.map((folder) => {
              const folderPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
              return (
                <button
                  key={folder.id}
                  onClick={() => navigateToFolder(folderPath)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-terminal-accent hover:bg-terminal-accent/10 transition-colors text-left"
                >
                  <FolderOpen className="w-6 h-6 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-terminal-bright truncate">{folder.name}</div>
                    <div className="text-xs text-terminal-dim">
                      {folder.description || 'Folder'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quizzes */}
      {filteredQuizzes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-terminal-bright">
            📚 Quizzes ({filteredQuizzes.length})
          </h3>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {filteredQuizzes.map((details) => (
              <QuizCard
                key={details.id}
                details={details}
                variant={viewMode === 'grid' ? 'card' : 'list'}
                showActions={showActions}
                onPlay={mode === 'picker' ? undefined : (id) => handleQuizAction('play', id)}
                onEdit={onQuizEdit ? (id) => handleQuizAction('edit', id) : undefined}
                onCustomize={onQuizCustomize ? (id) => handleQuizAction('customize', id) : undefined}
                onShare={onQuizShare ? (id) => handleQuizAction('share', id) : undefined}
                onDelete={onQuizDelete ? (id) => handleQuizAction('delete', id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {folders.length === 0 && filteredQuizzes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📂</div>
          <h3 className="text-lg font-medium text-terminal-bright mb-2">
            {searchTerm ? 'No quizzes found' : 'This folder is empty'}
          </h3>
          <p className="text-terminal-dim">
            {searchTerm 
              ? `No quizzes match "${searchTerm}"`
              : 'There are no quizzes or folders in this location'
            }
          </p>
        </div>
      )}
    </div>
  );
};
