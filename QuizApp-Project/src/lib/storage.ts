import { Quiz, QuizAttempt, User } from "@/types/quiz";

const STORAGE_KEYS = {
  USERS: "quiz_users",
  QUIZZES: "quiz_quizzes",
  ATTEMPTS: "quiz_attempts",
  CURRENT_USER: "quiz_current_user",
};

export const storage = {
  // Users
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },
  saveUser: (user: User) => {
    const users = storage.getUsers();
    users.push(user);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  // Quizzes
  getQuizzes: (): Quiz[] => {
    const data = localStorage.getItem(STORAGE_KEYS.QUIZZES);
    return data ? JSON.parse(data) : [];
  },
  saveQuiz: (quiz: Quiz) => {
    const quizzes = storage.getQuizzes();
    quizzes.push(quiz);
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
  },
  getQuizById: (id: string): Quiz | null => {
    const quizzes = storage.getQuizzes();
    return quizzes.find((q) => q.id === id) || null;
  },

  // Attempts
  getAttempts: (): QuizAttempt[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    return data ? JSON.parse(data) : [];
  },
  saveAttempt: (attempt: QuizAttempt) => {
    const attempts = storage.getAttempts();
    attempts.push(attempt);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
  },
  getUserAttempts: (userId: string): QuizAttempt[] => {
    return storage.getAttempts().filter((a) => a.userId === userId);
  },
  getQuizAttempts: (quizId: string): QuizAttempt[] => {
    return storage.getAttempts().filter((a) => a.quizId === quizId);
  },
};
