import { Quiz, QuizAttempt, User, QuizFolder } from "@/types/quiz";

/**
 * Storage Driver Interface
 * Defines the contract for all storage implementations (localStorage, backend DB, etc.)
 */
export interface IStorageDriver {
  // User operations
  getUsers(): Promise<User[]>;
  saveUser(user: User): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  setCurrentUser(user: User | null): Promise<void>;
  
  // Quiz operations
  getQuizzes(): Promise<Quiz[]>;
  saveQuiz(quiz: Quiz): Promise<void>;
  getQuizById(id: string): Promise<Quiz | null>;
  updateQuiz(quiz: Quiz): Promise<void>;
  deleteQuiz(id: string): Promise<void>;
  
  // Attempt operations
  getAttempts(): Promise<QuizAttempt[]>;
  saveAttempt(attempt: QuizAttempt): Promise<void>;
  getUserAttempts(userId: string): Promise<QuizAttempt[]>;
  getQuizAttempts(quizId: string): Promise<QuizAttempt[]>;
  
  // Folder operations
  getFolders(): Promise<QuizFolder[]>;
  saveFolder(folder: QuizFolder): Promise<void>;
  updateFolder(folder: QuizFolder): Promise<void>;
  deleteFolder(id: string): Promise<void>;
  renameFolder(id: string, newName: string): Promise<void>;
  
  // Media operations (for future backend storage)
  saveMedia?(data: string, type: 'image' | 'audio', name: string): Promise<string>; // Returns URL/ID
  getMedia?(id: string): Promise<string>; // Returns base64 or URL
  deleteMedia?(id: string): Promise<void>;
}
