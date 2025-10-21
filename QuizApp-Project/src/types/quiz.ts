export interface QuizQuestion {
  q: string; // question text
  o: string[]; // options
  a: number; // correct answer index
  l?: boolean; // has LaTeX (optional)
}

export interface MediaItem {
  type: 'image' | 'audio';
  data: string; // base64 data
  name: string;
}

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
}

export interface QuizFolder {
  id: string;
  name: string;
  parentPath?: string; // parent folder path, undefined for root folders
  createdAt: number;
  creator: string;
  isPublic: boolean;
  sharedWith?: string[]; // user IDs who can access this folder
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
}

export interface LeaderboardEntry {
  username: string;
  userId?: string;
  score: number;
  totalTime: number;
  completedAt: number;
}
