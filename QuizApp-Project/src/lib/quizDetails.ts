import { Quiz, QuizFolder } from '../types/quiz';
import { StorageService } from './storage';
import { getRecursiveQuestionCount, resolveRecursiveQuestions } from './recursiveQuizResolver';

export interface QuizDetailInfo {
  id: string;
  title: string;
  description?: string;
  creator: string;
  createdAt: number;
  isPublic: boolean;
  isMultiQuiz: boolean;
  
  // Question Information
  totalQuestions: number;
  questionLimit: number | null;
  directQuestions: number; // Only direct questions (for multi-quiz)
  
  // Multi-Quiz Specific
  sourceQuizCount: number; // Number of source quizzes
  sourceDetails?: Array<{
    quizId: string;
    title: string;
    minQuestions: number;
    maxQuestions: number;
    fixedCount: boolean;
    sectionName?: string;
    totalAvailable: number;
  }>;
  
  // Settings
  hasTimeConstraints: boolean;
  totalTimeLimit?: number;
  perQuestionTimeLimit?: number;
  allowReview: boolean;
  preserveOrder: boolean;
  
  // Access Control
  accessLevel: 'public' | 'private' | 'shared';
  sharedWith?: string[];
  accessCode?: string;
  
  // Folder Information
  folderPath?: string;
  folderName?: string;
  
  // Attempt Information
  attemptCount?: number;
  lastAttempted?: number;
  bestScore?: number;
  
  // Media
  hasMedia: boolean;
  mediaCount: number;
  
  // Validation Status
  isValid: boolean;
  validationIssues: string[];
}

/**
 * Comprehensive quiz detail resolver for both single and multi-quiz types
 * Works across all pages and components for consistent quiz information
 */
export class QuizDetailResolver {
  private storage: StorageService;
  private cache: Map<string, QuizDetailInfo> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(storage: StorageService) {
    this.storage = storage;
  }

  /**
   * Get comprehensive details for a single quiz
   */
  async getQuizDetails(quizId: string, userId?: string): Promise<QuizDetailInfo | null> {
    // Check cache first
    const cached = this.getCachedDetails(quizId);
    if (cached) {
      return cached;
    }

    try {
      const quiz = await this.storage.getQuizById(quizId);
      if (!quiz) {
        return null;
      }

      const details = await this.buildQuizDetails(quiz, userId);
      this.setCachedDetails(quizId, details);
      return details;
      
    } catch (error) {
      console.error(`Error getting quiz details for ${quizId}:`, error);
      return null;
    }
  }

  /**
   * Get details for multiple quizzes efficiently
   */
  async getMultipleQuizDetails(
    quizIds: string[], 
    userId?: string
  ): Promise<Map<string, QuizDetailInfo>> {
    const results = new Map<string, QuizDetailInfo>();
    
    // Separate cached and uncached quizzes
    const uncachedIds: string[] = [];
    for (const id of quizIds) {
      const cached = this.getCachedDetails(id);
      if (cached) {
        results.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    }

    // Fetch uncached quizzes in parallel
    if (uncachedIds.length > 0) {
      const promises = uncachedIds.map(async (id) => {
        try {
          const quiz = await this.storage.getQuizById(id);
          if (quiz) {
            const details = await this.buildQuizDetails(quiz, userId);
            this.setCachedDetails(id, details);
            return { id, details };
          }
        } catch (error) {
          console.error(`Error fetching details for quiz ${id}:`, error);
        }
        return null;
      });

      const fetchedResults = await Promise.all(promises);
      fetchedResults.forEach(result => {
        if (result) {
          results.set(result.id, result.details);
        }
      });
    }

    return results;
  }

  /**
   * Get filtered and accessible quizzes for a user
   */
  async getAccessibleQuizzes(
    userId: string,
    folderPath?: string
  ): Promise<Array<QuizDetailInfo & { quiz: Quiz }>> {
    try {
      const allQuizzes = await this.storage.getQuizzes();
      
      // Filter accessible quizzes
      const accessibleQuizzes = allQuizzes.filter(q => 
        q.isPublic || q.creator === userId || q.sharedWith?.includes(userId)
      );

      // Filter by folder if specified
      const filteredQuizzes = folderPath !== undefined 
        ? accessibleQuizzes.filter(q => (q.folderPath || '') === folderPath)
        : accessibleQuizzes;

      // Get details for all filtered quizzes
      const quizIds = filteredQuizzes.map(q => q.id);
      const detailsMap = await this.getMultipleQuizDetails(quizIds, userId);

      // Combine quiz objects with their details
      const results = filteredQuizzes
        .map(quiz => {
          const details = detailsMap.get(quiz.id);
          return details ? { ...details, quiz } : null;
        })
        .filter((item): item is QuizDetailInfo & { quiz: Quiz } => item !== null);

      return results;
      
    } catch (error) {
      console.error('Error getting accessible quizzes:', error);
      return [];
    }
  }

  /**
   * Get folder tree with quiz counts and details
   */
  async getFolderTreeWithDetails(
    userId: string
  ): Promise<Array<{
    folder: QuizFolder;
    quizCount: number;
    totalQuestions: number;
    subfolderCount: number;
  }>> {
    try {
      const [allFolders, allQuizzes] = await Promise.all([
        this.storage.getFolders(),
        this.storage.getQuizzes()
      ]);

      // Filter accessible folders and quizzes
      const accessibleFolders = allFolders.filter(f =>
        f.isPublic || f.creator === userId || f.sharedWith?.includes(userId)
      );
      
      const accessibleQuizzes = allQuizzes.filter(q =>
        q.isPublic || q.creator === userId || q.sharedWith?.includes(userId)
      );

      // Get quiz details efficiently
      const quizIds = accessibleQuizzes.map(q => q.id);
      const detailsMap = await this.getMultipleQuizDetails(quizIds, userId);

      // Build folder tree with counts
      const folderDetails = await Promise.all(
        accessibleFolders.map(async (folder) => {
          const folderPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
          
          // Count quizzes in this folder
          const folderQuizzes = accessibleQuizzes.filter(q => q.folderPath === folderPath);
          const quizCount = folderQuizzes.length;
          
          // Calculate total questions in folder
          let totalQuestions = 0;
          for (const quiz of folderQuizzes) {
            const details = detailsMap.get(quiz.id);
            if (details) {
              totalQuestions += details.totalQuestions;
            }
          }
          
          // Count subfolders
          const subfolderCount = accessibleFolders.filter(f => 
            f.parentPath === folderPath
          ).length;

          return {
            folder,
            quizCount,
            totalQuestions,
            subfolderCount
          };
        })
      );

      return folderDetails;
      
    } catch (error) {
      console.error('Error getting folder tree with details:', error);
      return [];
    }
  }

  /**
   * Validate quiz configuration and return issues
   */
  async validateQuiz(quiz: Quiz, userId?: string): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Basic validation
      if (!quiz.title?.trim()) {
        issues.push('Quiz title is required');
      }

      if (!quiz.multiQuizSources) {
        // Single quiz validation
        if (!quiz.questions || quiz.questions.length === 0) {
          issues.push('Quiz must have at least one question');
        }
      } else {
        // Multi-quiz validation
        if (!quiz.multiQuizSources.sources || quiz.multiQuizSources.sources.length === 0) {
          issues.push('Multi-quiz must have at least one source');
        } else {
          // Validate each source
          for (let i = 0; i < quiz.multiQuizSources.sources.length; i++) {
            const source = quiz.multiQuizSources.sources[i];
            
            if (!source.quizId) {
              issues.push(`Source ${i + 1}: Quiz selection is required`);
              continue;
            }

            // Get recursive question count for validation
            const sourceQuiz = await this.storage.getQuizById(source.quizId);
            if (!sourceQuiz) {
              issues.push(`Source ${i + 1}: Selected quiz not found`);
              continue;
            }

            const sourceDetails = await this.getQuizDetails(source.quizId, userId);
            if (!sourceDetails) {
              issues.push(`Source ${i + 1}: Unable to load quiz details`);
              continue;
            }

            const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
            const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0;

            if (minQuestions < 1) {
              issues.push(`Source ${i + 1}: Minimum questions must be at least 1`);
            }

            if (maxQuestions < 1) {
              issues.push(`Source ${i + 1}: Maximum questions must be at least 1`);
            }

            if (minQuestions > maxQuestions) {
              issues.push(`Source ${i + 1}: Minimum (${minQuestions}) cannot be greater than maximum (${maxQuestions})`);
            }

            if (minQuestions > sourceDetails.totalQuestions) {
              issues.push(`Source ${i + 1}: Minimum (${minQuestions}) exceeds available questions (${sourceDetails.totalQuestions}) in "${sourceDetails.title}"`);
            }

            if (maxQuestions > sourceDetails.totalQuestions) {
              issues.push(`Source ${i + 1}: Maximum (${maxQuestions}) exceeds available questions (${sourceDetails.totalQuestions}) in "${sourceDetails.title}"`);
            }

            if (source.fixedCount && minQuestions !== maxQuestions) {
              issues.push(`Source ${i + 1}: Fixed count mode requires minimum and maximum to be equal`);
            }
          }
        }
      }

      // Time validation
      if (quiz.timeLimit && quiz.timeLimit < 1) {
        issues.push('Time limit must be at least 1 minute');
      }

      if (quiz.perQuestionTimeLimit && quiz.perQuestionTimeLimit < 5) {
        issues.push('Per-question time limit must be at least 5 seconds');
      }

    } catch (error) {
      console.error('Error validating quiz:', error);
      issues.push('Validation error occurred');
    }

    return issues;
  }

  /**
   * Build comprehensive quiz details
   */
  private async buildQuizDetails(quiz: Quiz, userId?: string): Promise<QuizDetailInfo> {
    try {
      // Get recursive question count
      const recursiveInfo = await getRecursiveQuestionCount(quiz, this.storage);
      const totalQuestions = recursiveInfo.totalQuestions;
      
      // Determine if multi-quiz
      const isMultiQuiz = !!quiz.multiQuizSources;
      const directQuestions = quiz.questions?.length || 0;
      
      // Build source details for multi-quiz
      let sourceDetails: QuizDetailInfo['sourceDetails'];
      let sourceQuizCount = 0;
      
      if (isMultiQuiz && quiz.multiQuizSources?.sources) {
        sourceQuizCount = quiz.multiQuizSources.sources.length;
        sourceDetails = [];
        
        for (const source of quiz.multiQuizSources.sources) {
          try {
            const sourceQuiz = await this.storage.getQuizById(source.quizId);
            if (sourceQuiz) {
              const sourceInfo = await getRecursiveQuestionCount(sourceQuiz, this.storage);
              sourceDetails.push({
                quizId: source.quizId,
                title: sourceQuiz.title,
                minQuestions: typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0,
                maxQuestions: typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0,
                fixedCount: source.fixedCount || false,
                sectionName: source.sectionName,
                totalAvailable: sourceInfo.totalQuestions
              });
            }
          } catch (error) {
            console.error(`Error loading source quiz ${source.quizId}:`, error);
          }
        }
      }
      
      // Media information
      const mediaCount = quiz.media?.length || 0;
      const hasMedia = mediaCount > 0 || this.hasQuestionMedia(quiz.questions || []);
      
      // Time constraints
      const hasTimeConstraints = !!(quiz.timeLimit || quiz.perQuestionTimeLimit);
      
      // Validation
      const validationIssues = await this.validateQuiz(quiz, userId);
      const isValid = validationIssues.length === 0;
      
      // Access level
      let accessLevel: 'public' | 'private' | 'shared' = 'private';
      if (quiz.isPublic) {
        accessLevel = 'public';
      } else if (quiz.sharedWith && quiz.sharedWith.length > 0) {
        accessLevel = 'shared';
      }

      // Attempt information (if userId provided)
      let attemptCount: number | undefined;
      let lastAttempted: number | undefined;
      let bestScore: number | undefined;
      
      if (userId) {
        try {
          const attempts = await this.storage.getUserAttempts(userId);
          const quizAttempts = attempts.filter(a => a.quizId === quiz.id);
          attemptCount = quizAttempts.length;
          
          if (quizAttempts.length > 0) {
            lastAttempted = Math.max(...quizAttempts.map(a => a.completedAt));
            bestScore = Math.max(...quizAttempts.map(a => a.score));
          }
        } catch (error) {
          console.error(`Error loading attempts for quiz ${quiz.id}:`, error);
        }
      }

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        creator: quiz.creator,
        createdAt: quiz.createdAt,
        isPublic: quiz.isPublic,
        isMultiQuiz,
        
        totalQuestions,
        questionLimit: quiz.questionLimit || null,
        directQuestions,
        
        sourceQuizCount,
        sourceDetails,
        
        hasTimeConstraints,
        totalTimeLimit: quiz.timeLimit,
        perQuestionTimeLimit: quiz.perQuestionTimeLimit,
        allowReview: quiz.allowReview !== false,
        preserveOrder: quiz.multiQuizSources?.preserveQuizOrder || false,
        
        accessLevel,
        sharedWith: quiz.sharedWith,
        accessCode: quiz.accessCode,
        
        folderPath: quiz.folderPath,
        folderName: this.extractFolderName(quiz.folderPath),
        
        attemptCount,
        lastAttempted,
        bestScore,
        
        hasMedia,
        mediaCount,
        
        isValid,
        validationIssues
      };
      
    } catch (error) {
      console.error(`Error building quiz details for ${quiz.id}:`, error);
      throw error;
    }
  }

  /**
   * Cache management
   */
  private getCachedDetails(quizId: string): QuizDetailInfo | null {
    const expiry = this.cacheExpiry.get(quizId);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(quizId);
      this.cacheExpiry.delete(quizId);
      return null;
    }
    return this.cache.get(quizId) || null;
  }

  private setCachedDetails(quizId: string, details: QuizDetailInfo): void {
    this.cache.set(quizId, details);
    this.cacheExpiry.set(quizId, Date.now() + this.CACHE_DURATION);
  }

  /**
   * Clear cache for specific quiz or all quizzes
   */
  clearCache(quizId?: string): void {
    if (quizId) {
      this.cache.delete(quizId);
      this.cacheExpiry.delete(quizId);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Helper methods
   */
  private hasQuestionMedia(questions: any[]): boolean {
    return questions.some(q => 
      q.image || q.audio || 
      (q.options && q.options.some((opt: any) => opt.image || opt.audio))
    );
  }

  private extractFolderName(folderPath?: string): string | undefined {
    if (!folderPath) return undefined;
    const parts = folderPath.split('/');
    return parts[parts.length - 1];
  }
}

// Export singleton instance
export const quizDetailResolver = new QuizDetailResolver(
  // This will be injected from the calling component
  {} as StorageService
);