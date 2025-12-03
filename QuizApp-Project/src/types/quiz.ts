export interface QuizQuestion {
  q: string; // question text
  o: string[]; // options
  a: number; // correct answer index
  l?: boolean; // has LaTeX (optional)
}

export interface MediaItem {
  type: 'img' | 'audio'; // Use 'img' to match media tag format [img:1]
  data: string; // base64 data with data: prefix
  name: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge'; // individual image size
  id?: string; // unique identifier for media merging
}

export type ResourceRole = 'creator' | 'admin' | 'editor' | 'viewer';
export type EditMode = 'no_edits' | 'pull_requests';
export type EditRequestStatus = 'pending' | 'approved' | 'rejected';

export interface Quiz {
  id: string;
  title: string;
  desc?: string;
  questions: QuizQuestion[];
  creator: string;
  createdAt: number;
  isPublic: boolean;
  timeLimit?: number; // total quiz time limit in seconds
  perQuestionTimeLimit?: number; // time limit per question in seconds (Mode 3)
  randomize: boolean;
  media?: MediaItem[]; // uploaded images/audio
  layout?: 'default' | 'split'; // default: vertical, split: question left, options right
  folderPath?: string; // folder path like "Math/Algebra" or empty for root
  sharedWith?: string[]; // user IDs who can access this quiz
  forkedFrom?: string; // original quiz ID if this is a fork
  accessCode?: string; // unique code to access public quiz
  editMode?: EditMode; // whether edits are accepted
  questionLimit?: number; // limit number of questions from this quiz when randomizing
  customQuizSources?: CustomQuizSource[]; // for multi-quiz compositions
  imageSize?: 'small' | 'medium' | 'large' | 'xlarge'; // size of images in quiz
  multiQuizSources?: {
    sources: Array<{
      quizId: string;
      minQuestions: number;
      maxQuestions: number;
      fixedCount: boolean;
      sectionName?: string; // Custom name for this section (defaults to quiz title)
    }>;
    metadata?: {
      sources: Array<{
        sourceQuizId: string;
        sourceTitle: string;
        questionCount: number;
      }>;
      generatedAt: number;
      totalQuestions: number;
    };
    hasManualQuestions: boolean;
    preserveQuizOrder?: boolean; // NEW: keep questions in quiz groups vs fully random
  }; // for multi-quiz mode metadata
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
