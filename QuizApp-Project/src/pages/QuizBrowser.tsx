import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder, QuizAttempt } from "@/types/quiz";
import { FileText, Folder, Lock, Globe, Clock, User, Play, Filter, Settings, Search, SortAsc, SortDesc, Tag, Calendar, Star } from "lucide-react";
import { PageDescription } from "@/components/PageDescription";
import { toast } from "sonner";
import { useRecursiveQuestionCounts } from "@/hooks/useRecursiveQuestionCount";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

  // Enhanced search and filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'popularity' | 'difficulty'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Get recursive question counts for all quizzes
  const { questionCounts } = useRecursiveQuestionCounts(quizzes);

  // Calculate folder quiz counts dynamically (moved before useMemo to avoid initialization issues)
  const getFolderQuizCount = (folderPath: string, isRecursive: boolean = true): number => {
    return quizzes.filter(quiz => {
      if (!quiz.folderPath && !folderPath) return true;
      if (!quiz.folderPath || !folderPath) return false;
      
      if (isRecursive) {
        return quiz.folderPath === folderPath || quiz.folderPath.startsWith(folderPath + '/');
      } else {
        return quiz.folderPath === folderPath;
      }
    }).length;
  };

  // Get all unique tags from quizzes and folders in current context
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    const contextQuizzes = activeFilter === 'folder' ? folderContents.quizzes : filteredQuizzes;
    const contextFolders = activeFilter === 'folder' ? folderContents.subfolders : [];
    
    // Add tags from quizzes
    contextQuizzes.forEach(quiz => {
      if (quiz.tags) {
        quiz.tags.forEach(tag => tagSet.add(tag));
      }
    });
    
    // Add tags from folders
    contextFolders.forEach(folder => {
      if (folder.tags) {
        folder.tags.forEach(tag => tagSet.add(tag));
      }
    });
    
    return Array.from(tagSet).sort();
  }, [folderContents.quizzes, folderContents.subfolders, filteredQuizzes, activeFilter]);

  // Enhanced filtering and sorting logic for quizzes
  const processedQuizzes = useMemo(() => {
    let quizzesToProcess = activeFilter === 'folder' ? folderContents.quizzes : filteredQuizzes;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      quizzesToProcess = quizzesToProcess.filter(quiz => 
        quiz.title.toLowerCase().includes(query) ||
        quiz.desc?.toLowerCase().includes(query) ||
        quiz.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filters
    if (selectedTags.length > 0) {
      quizzesToProcess = quizzesToProcess.filter(quiz =>
        quiz.tags?.some(tag => selectedTags.includes(tag))
      );
    }

    // Apply difficulty filter (based on tags)
    if (difficultyFilter !== 'all') {
      quizzesToProcess = quizzesToProcess.filter(quiz =>
        quiz.tags?.some(tag => tag.toLowerCase().includes(difficultyFilter.toLowerCase()))
      );
    }

    // Apply sorting
    quizzesToProcess = [...quizzesToProcess].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'popularity':
          // Mock popularity based on question count for now
          const aQuestions = questionCounts[a.id] || a.questions?.length || 0;
          const bQuestions = questionCounts[b.id] || b.questions?.length || 0;
          comparison = aQuestions - bQuestions;
          break;
        case 'difficulty':
          // Difficulty based on tags (Easy < Medium < Hard)
          const getDifficultyScore = (quiz: Quiz) => {
            if (quiz.tags?.some(tag => tag.toLowerCase().includes('easy'))) return 1;
            if (quiz.tags?.some(tag => tag.toLowerCase().includes('medium'))) return 2;
            if (quiz.tags?.some(tag => tag.toLowerCase().includes('hard'))) return 3;
            return 2; // Default to medium
          };
          comparison = getDifficultyScore(a) - getDifficultyScore(b);
          break;
        default:
          comparison = a.createdAt - b.createdAt;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return quizzesToProcess;
  }, [folderContents.quizzes, filteredQuizzes, activeFilter, searchQuery, selectedTags, difficultyFilter, sortBy, sortOrder, questionCounts]);

  // Enhanced filtering logic for folders
  const processedFolders = useMemo(() => {
    // Get folders based on current mode
    let foldersToProcess: QuizFolder[] = [];
    
    if (activeFilter === 'folder') {
      // Folder browsing mode: show subfolders of current folder
      foldersToProcess = folderContents.subfolders;
    } else {
      // All Available mode: show all accessible folders (public + user's own)
      foldersToProcess = folders.filter(folder => 
        folder.isPublic || folder.creator === user?.id
      );
    }
    
    // Apply search filter to folders
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      foldersToProcess = foldersToProcess.filter(folder => 
        folder.name.toLowerCase().includes(query) ||
        folder.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filters to folders
    if (selectedTags.length > 0) {
      foldersToProcess = foldersToProcess.filter(folder =>
        folder.tags?.some(tag => selectedTags.includes(tag))
      );
    }

    // Apply sorting to folders
    foldersToProcess = [...foldersToProcess].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'popularity':
          // Popularity based on folder content count
          const aCount = getFolderQuizCount(a.name, false);
          const bCount = getFolderQuizCount(b.name, false);
          comparison = aCount - bCount;
          break;
        case 'difficulty':
          // Difficulty based on tags
          const getDifficultyScore = (folder: QuizFolder) => {
            if (folder.tags?.some(tag => tag.toLowerCase().includes('easy'))) return 1;
            if (folder.tags?.some(tag => tag.toLowerCase().includes('medium'))) return 2;
            if (folder.tags?.some(tag => tag.toLowerCase().includes('hard'))) return 3;
            return 2; // Default to medium
          };
          comparison = getDifficultyScore(a) - getDifficultyScore(b);
          break;
        default:
          comparison = a.createdAt - b.createdAt;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return foldersToProcess;
  }, [folderContents.subfolders, folders, activeFilter, searchQuery, selectedTags, sortBy, sortOrder, getFolderQuizCount, user?.id]);

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
      <div className="flex flex-col h-full">
        {/* Filter Controls */}
        <div className="mb-4">
          <TerminalLine prefix="#" className="mb-3">Filter Quizzes</TerminalLine>
          
          <div className="ml-6 space-y-3">
            {/* Search Bar */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-terminal-dim w-4 h-4" />
                <Input
                  placeholder="Search quizzes and folders by title, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-terminal border-terminal-accent text-terminal-foreground"
                />
              </div>
              <TerminalButton
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={showAdvancedFilters ? 'bg-terminal-accent/20' : ''}
              >
                <Filter className="w-4 h-4 mr-1" />
                Filters
              </TerminalButton>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border border-terminal-accent/20 rounded p-3 space-y-3 bg-terminal/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Sort By */}
                  <div>
                    <label className="text-xs text-terminal-dim mb-1 block">Sort By</label>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="bg-terminal border-terminal-accent text-terminal-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Date Created
                          </div>
                        </SelectItem>
                        <SelectItem value="title">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Title (A-Z)
                          </div>
                        </SelectItem>
                        <SelectItem value="popularity">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            Popularity
                          </div>
                        </SelectItem>
                        <SelectItem value="difficulty">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            Difficulty
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="text-xs text-terminal-dim mb-1 block">Order</label>
                    <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                      <SelectTrigger className="bg-terminal border-terminal-accent text-terminal-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">
                          <div className="flex items-center gap-2">
                            <SortDesc className="w-4 h-4" />
                            Descending
                          </div>
                        </SelectItem>
                        <SelectItem value="asc">
                          <div className="flex items-center gap-2">
                            <SortAsc className="w-4 h-4" />
                            Ascending
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Difficulty Filter */}
                  <div>
                    <label className="text-xs text-terminal-dim mb-1 block">Difficulty</label>
                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger className="bg-terminal border-terminal-accent text-terminal-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tag Filters */}
                {availableTags.length > 0 && (
                  <div>
                    <label className="text-xs text-terminal-dim mb-2 block">Filter by Tags</label>
                    <div className="flex flex-wrap gap-1">
                      {availableTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className={`cursor-pointer text-xs ${
                            selectedTags.includes(tag) 
                              ? 'bg-terminal-accent text-terminal-background' 
                              : 'hover:bg-terminal-accent/20'
                          }`}
                          onClick={() => {
                            setSelectedTags(prev => 
                              prev.includes(tag) 
                                ? prev.filter(t => t !== tag)
                                : [...prev, tag]
                            );
                          }}
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {selectedTags.length > 0 && (
                      <TerminalButton 
                        onClick={() => setSelectedTags([])}
                        className="mt-2 text-xs"
                      >
                        Clear Tag Filters
                      </TerminalButton>
                    )}
                  </div>
                )}
              </div>
            )}

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
                  `Results (${processedQuizzes.length} quiz${processedQuizzes.length !== 1 ? 'es' : ''})`
                }
              </TerminalLine>
            
            {/* Search and Filter Summary */}
            {(searchQuery || selectedTags.length > 0 || difficultyFilter !== 'all') && (
              <div className="text-sm text-terminal-dim ml-6">
                {searchQuery && (
                  <div>Search: "{searchQuery}" - Found {processedQuizzes.length} quiz{processedQuizzes.length !== 1 ? 'es' : ''} and {processedFolders.length} folder{processedFolders.length !== 1 ? 's' : ''}</div>
                )}
                {selectedTags.length > 0 && <div>Tags: {selectedTags.join(', ')}</div>}
                {difficultyFilter !== 'all' && <div>Difficulty: {difficultyFilter}</div>}
              </div>
            )}
            
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
            {/* Show folders */}
            {processedFolders.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-terminal-bright flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Folders ({processedFolders.length})
                  {processedFolders.length !== folderContents.subfolders.length && (
                    <span className="text-xs text-terminal-dim">
                      of {folderContents.subfolders.length} total
                    </span>
                  )}
                </div>
                {processedFolders.map(folder => (
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
                    
                    {/* Folder Tags */}
                    {folder.tags && folder.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 ml-6">
                        {folder.tags.map(tag => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs px-2 py-0 text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTags(prev => 
                                prev.includes(tag) 
                                  ? prev.filter(t => t !== tag)
                                  : [...prev, tag]
                              );
                              setShowAdvancedFilters(true);
                            }}
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Show quizzes */}
            {processedQuizzes.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-terminal-bright flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Quizzes ({processedQuizzes.length})
                  {processedQuizzes.length !== (activeFilter === 'folder' ? folderContents.quizzes.length : filteredQuizzes.length) && (
                    <span className="text-xs text-terminal-dim">
                      of {activeFilter === 'folder' ? folderContents.quizzes.length : filteredQuizzes.length} total
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {processedQuizzes.length === 0 ? (
              <TerminalLine prefix="-" className="text-terminal-dim">
                {(searchQuery || selectedTags.length > 0 || difficultyFilter !== 'all') ? 
                  'No quizzes match your search criteria' : 
                  `No ${activeFilter === 'folder' ? 'content' : 'quizzes'} found with current filter`
                }
              </TerminalLine>
            ) : (
              processedQuizzes.map(quiz => {
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
                        
                        {/* Quiz Tags */}
                        {quiz.tags && quiz.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {quiz.tags.map(tag => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs px-2 py-0 text-terminal-accent border-terminal-accent/30 hover:bg-terminal-accent/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTags(prev => 
                                    prev.includes(tag) 
                                      ? prev.filter(t => t !== tag)
                                      : [...prev, tag]
                                  );
                                  setShowAdvancedFilters(true);
                                }}
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
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
