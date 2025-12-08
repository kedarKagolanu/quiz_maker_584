/**
 * @fileoverview Quiz Type Definitions
 * @description Core TypeScript interfaces and types for the Quiz Application
 * @author Quiz Application Team
 * @version 2.0.0
 */

/**
 * Quiz Question Interface
 * @interface QuizQuestion
 * @description Represents a single quiz question with multiple choice answers
 */
export interface QuizQuestion {
  /** Question text - supports plain text and LaTeX expressions */
  q: string;
  
  /** Array of possible answer options */
  o: string[];
  
  /** Index of the correct answer in the options array (0-based) */
  a: number;
  
  /** Optional flag indicating if the question contains LaTeX expressions */
  l?: boolean;
}

/**
 * Media Item Interface
 * @interface MediaItem
 * @description Represents a media file (image or audio) attached to a quiz
 */
export interface MediaItem {
  /** Media type - 'img' matches media tag format [img:1] */
  type: 'img' | 'audio';
  
  /** Base64 encoded data with data: prefix (e.g., "data:image/png;base64,...") */
  data: string;
  
  /** Original filename of the media */
  name: string;
  
  /** Display size for images - affects rendering in quiz interface */
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  
  /** Unique identifier for media merging and deduplication */
  id?: string;
}

export type ResourceRole = 'creator' | 'admin' | 'editor' | 'viewer';
export type EditMode = 'no_edits' | 'pull_requests';
export type EditRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * Main Quiz Interface
 * @interface Quiz
 * @description Core quiz entity with all configuration options and metadata
 */
export interface Quiz {
  /** Unique identifier for the quiz */
  id: string;
  
  /** Quiz title/name */
  title: string;
  
  /** Optional quiz description */
  desc?: string;
  
  /** Array of quiz questions */
  questions: QuizQuestion[];
  
  /** User ID of the quiz creator */
  creator: string;
  
  /** Creation timestamp (Unix timestamp in milliseconds) */
  createdAt: number;
  
  /** Public/private visibility flag */
  isPublic: boolean;
  
  /** Total time limit for entire quiz in seconds */
  timeLimit?: number;
  
  /** Time limit per individual question in seconds (Mode 3 timing) */
  perQuestionTimeLimit?: number;
  
  /** Whether to randomize question order */
  randomize: boolean;
  
  /** Uploaded media files (images/audio) */
  media?: MediaItem[];
  
  /** Quiz layout mode - default: vertical, split: question left/options right */
  layout?: 'default' | 'split';
  
  /** Folder path for organization (e.g., "Math/Algebra" or empty for root) */
  folderPath?: string;
  
  /** Array of user IDs who have access to this quiz */
  sharedWith?: string[];
  
  /** Original quiz ID if this quiz was forked from another */
  forkedFrom?: string;
  
  /** Unique access code for sharing public quizzes */
  accessCode?: string;
  
  /** Edit mode configuration for collaborative editing */
  editMode?: EditMode;
  
  /** Maximum number of questions to use from this quiz in randomization */
  questionLimit?: number;
  
  /** Legacy: Custom quiz sources for multi-quiz compositions */
  customQuizSources?: CustomQuizSource[];
  
  /** Default image size for all images in this quiz */
  imageSize?: 'small' | 'medium' | 'large' | 'xlarge';
  
  /** Array of tags for categorization and search (e.g., ["GATE", "Computer Science", "Easy"]) */
  tags?: string[];
  
  /** 
   * Multi-quiz composition configuration
   * Allows combining questions from multiple source quizzes
   */
  multiQuizSources?: {
    /** Source quiz configurations */
    sources: Array<{
      /** Source quiz identifier */
      quizId: string;
      /** Minimum questions to take from this source */
      minQuestions: number;
      /** Maximum questions to take from this source */
      maxQuestions: number;
      /** Whether to use exact count between min/max */
      fixedCount: boolean;
      /** Custom section name (defaults to source quiz title) */
      sectionName?: string;
    }>;
    
    /** Runtime metadata about the generated multi-quiz */
    metadata?: {
      /** Information about each source quiz used */
      sources: Array<{
        sourceQuizId: string;
        sourceTitle: string;
        questionCount: number;
      }>;
      /** When this multi-quiz was last generated */
      generatedAt: number;
      /** Total number of questions in the generated quiz */
      totalQuestions: number;
    };
    
    /** Whether this multi-quiz also contains manually created questions */
    hasManualQuestions: boolean;
    
    /** Whether to preserve quiz groupings vs full randomization */
    preserveQuizOrder?: boolean;
  };
}

export interface QuizFolder {
  id: string;
  name: string;
  parentPath?: string; // parent folder path, undefined for root folders
  createdAt: number;
  creator: string;
  isPublic: boolean;
  sharedWith?: string[]; // user IDs who can access this folder
  accessCode?: string; // unique code to access public folder
  editMode?: EditMode; // whether edits are accepted
  totalQuizzes?: number; // computed: total quizzes in this folder and subfolders
  directQuizzes?: number; // computed: quizzes directly in this folder
  totalFolders?: number; // computed: total subfolders count
  tags?: string[]; // array of tags for folder categorization and search
}

export interface QuizPermission {
  id: string;
  quizId: string;
  userId: string;
  role: ResourceRole;
  grantedBy?: string;
  grantedAt: number;
}

export interface FolderPermission {
  id: string;
  folderId: string;
  userId: string;
  role: ResourceRole;
  grantedBy?: string;
  grantedAt: number;
}

export interface EditRequest {
  id: string;
  resourceType: 'quiz' | 'folder';
  resourceId: string;
  requestedBy: string;
  requestedAt: number;
  status: EditRequestStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  changes: any; // JSON object with proposed changes
  message?: string;
  reviewMessage?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: number[];
  timeTaken: number[]; // time per question in seconds
  totalTime: number;
  score: number;
  completedAt: number;
}

export interface MusicFile {
  name: string;
  url: string;
}

export interface User {
  id: string;
  username: string;
  password: string; // In production, this would be hashed
  createdAt: number;
  musicFiles?: MusicFile[];
  bookmarkedQuizzes?: string[]; // quiz IDs
  bookmarkedFolders?: string[]; // folder IDs
}

export interface CustomQuizSource {
  quizId: string;
  minQuestions: number;
  maxQuestions: number;
  fixedCount?: boolean; // if true, must get exact number between min-max
}

export interface LeaderboardEntry {
  username: string;
  userId?: string;
  score: number;
  totalTime: number;
  completedAt: number;
}

// Chat system types
export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  creator: string;
  members: string[]; // user IDs
  createdAt: number;
  isPrivate: boolean;
  accessCode?: string; // for joining private groups
  type: 'group' | 'direct'; // direct for 1-on-1 chats
}

export interface ChatMessage {
  id: string;
  groupId: string;
  userId: string;
  username: string;
  content: string;
  type: 'text' | 'quiz_share' | 'link' | 'folder_share';
  quizId?: string; // for quiz sharing messages or folder ID for folder shares
  timestamp: number;
}

export interface SharedQuiz {
  id: string;
  quizId: string;
  groupId: string;
  sharedBy: string;
  sharedAt: number;
  message?: string;
}
