export interface QuizQuestion {
  q: string; // question text
  o: string[]; // options
  a: number; // correct answer index
  l?: boolean; // has LaTeX (optional)
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

export interface User {
  id: string;
  username: string;
  password: string; // In production, this would be hashed
  createdAt: number;
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  totalTime: number;
  completedAt: number;
}
