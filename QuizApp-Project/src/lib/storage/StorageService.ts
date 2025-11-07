import { IStorageDriver } from "./IStorageDriver";
import { Quiz, QuizAttempt, User, QuizFolder } from "@/types/quiz";

/**
 * Storage Service
 * High-level service layer that provides business logic and uses the configured driver
 * This is the main interface applications should interact with
 */
export class StorageService {
  private driver: IStorageDriver;

  constructor(driver: IStorageDriver) {
    this.driver = driver;
  }

  /**
   * Change the storage driver at runtime
   * Useful for switching between localStorage and backend storage
   */
  setDriver(driver: IStorageDriver): void {
    this.driver = driver;
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return this.driver.getUsers();
  }

  async saveUser(user: User): Promise<void> {
    return this.driver.saveUser(user);
  }

  async getCurrentUser(): Promise<User | null> {
    return this.driver.getCurrentUser();
  }

  async setCurrentUser(user: User | null): Promise<void> {
    return this.driver.setCurrentUser(user);
  }

  // Quiz operations with business logic
  async getQuizzes(): Promise<Quiz[]> {
    return this.driver.getQuizzes();
  }

  async getPublicQuizzes(): Promise<Quiz[]> {
    const quizzes = await this.driver.getQuizzes();
    return quizzes.filter((q) => q.isPublic);
  }

  async getUserQuizzes(userId: string): Promise<Quiz[]> {
    const quizzes = await this.driver.getQuizzes();
    
    // Get permissions to include quizzes where user has been granted access
    let permittedQuizIds: string[] = [];
    if (this.driver.getQuizPermissions) {
      const allPermissions = await this.driver.getQuizPermissions('');
      permittedQuizIds = allPermissions
        .filter(p => p.userId === userId)
        .map(p => p.quizId);
    }
    
    return quizzes.filter(quiz =>
      quiz.creator === userId ||
      permittedQuizIds.includes(quiz.id)
    );
  }

  async getAccessibleQuizzes(userId: string): Promise<Quiz[]> {
    const quizzes = await this.driver.getQuizzes();
    
    // Get permissions to include quizzes where user has been granted access
    let permittedQuizIds: string[] = [];
    if (this.driver.getQuizPermissions) {
      const allPermissions = await this.driver.getQuizPermissions('');
      permittedQuizIds = allPermissions
        .filter(p => p.userId === userId)
        .map(p => p.quizId);
    }
    
    return quizzes.filter(quiz => 
      quiz.isPublic || 
      quiz.creator === userId ||
      quiz.sharedWith?.includes(userId) ||
      permittedQuizIds.includes(quiz.id)
    );
  }

  async saveQuiz(quiz: Quiz): Promise<void> {
    return this.driver.saveQuiz(quiz);
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    return this.driver.getQuizById(id);
  }

  async updateQuiz(quiz: Quiz): Promise<void> {
    return this.driver.updateQuiz(quiz);
  }

  async deleteQuiz(id: string): Promise<void> {
    return this.driver.deleteQuiz(id);
  }

  /**
   * Fork a quiz - creates a copy for the current user
   */
  async forkQuiz(quizId: string, newCreator: string): Promise<Quiz> {
    const original = await this.driver.getQuizById(quizId);
    if (!original) {
      throw new Error("Quiz not found");
    }

    const forkedQuiz: Quiz = {
      ...original,
      id: Date.now().toString(),
      creator: newCreator,
      createdAt: Date.now(),
      isPublic: false, // Forked quizzes default to private
      sharedWith: [], // Clear sharing
      forkedFrom: quizId, // Track original
    };

    await this.driver.saveQuiz(forkedQuiz);
    return forkedQuiz;
  }

  /**
   * Check if a user can access a quiz
   */
  async canAccessQuiz(quizId: string, userId: string): Promise<boolean> {
    const quiz = await this.driver.getQuizById(quizId);
    if (!quiz) return false;
    
    return quiz.isPublic || 
           quiz.creator === userId || 
           (quiz.sharedWith?.includes(userId) ?? false);
  }

  /**
   * Check if a user can edit a quiz
   */
  async canEditQuiz(quizId: string, userId: string): Promise<boolean> {
    const quiz = await this.driver.getQuizById(quizId);
    if (!quiz) return false;
    
    return quiz.creator === userId;
  }

  // Attempt operations
  async getAttempts(): Promise<QuizAttempt[]> {
    return this.driver.getAttempts();
  }

  async saveAttempt(attempt: QuizAttempt): Promise<void> {
    return this.driver.saveAttempt(attempt);
  }

  async getUserAttempts(userId: string): Promise<QuizAttempt[]> {
    return this.driver.getUserAttempts(userId);
  }

  async getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
    return this.driver.getQuizAttempts(quizId);
  }

  // Folder operations
  async getFolders(): Promise<QuizFolder[]> {
    return this.driver.getFolders();
  }

  async getUserFolders(userId: string): Promise<QuizFolder[]> {
    const folders = await this.driver.getFolders();
    const permissions = await this.getFolderPermissions?.('') || [];
    
    return folders.filter(folder => 
      folder.creator === userId ||
      permissions.some(p => p.folderId === folder.id && p.userId === userId)
    );
  }

  async saveFolder(folder: QuizFolder): Promise<void> {
    return this.driver.saveFolder(folder);
  }

  async updateFolder(folder: QuizFolder): Promise<void> {
    return this.driver.updateFolder(folder);
  }

  async deleteFolder(id: string): Promise<void> {
    return this.driver.deleteFolder(id);
  }

  async renameFolder(id: string, newName: string): Promise<void> {
    return this.driver.renameFolder(id, newName);
  }

  // Media operations (for future implementation)
  async saveMedia(data: string, type: 'image' | 'audio', name: string): Promise<string> {
    if (this.driver.saveMedia) {
      return this.driver.saveMedia(data, type, name);
    }
    // For localStorage, we embed the data directly
    return data;
  }

  async getMedia(id: string): Promise<string> {
    if (this.driver.getMedia) {
      return this.driver.getMedia(id);
    }
    // For localStorage, the ID is the data itself
    return id;
  }

  async deleteMedia(id: string): Promise<void> {
    if (this.driver.deleteMedia) {
      return this.driver.deleteMedia(id);
    }
    // No-op for localStorage
  }

  // Permission operations
  async getQuizPermissions(quizId: string): Promise<import("@/types/quiz").QuizPermission[]> {
    if (this.driver.getQuizPermissions) {
      return this.driver.getQuizPermissions(quizId);
    }
    return [];
  }

  async saveQuizPermission(permission: Omit<import("@/types/quiz").QuizPermission, 'id' | 'grantedAt'>): Promise<void> {
    if (this.driver.saveQuizPermission) {
      return this.driver.saveQuizPermission(permission);
    }
  }

  async updateQuizPermission(permissionId: string, role: string): Promise<void> {
    if (this.driver.updateQuizPermission) {
      return this.driver.updateQuizPermission(permissionId, role);
    }
  }

  async deleteQuizPermission(permissionId: string): Promise<void> {
    if (this.driver.deleteQuizPermission) {
      return this.driver.deleteQuizPermission(permissionId);
    }
  }

  async getFolderPermissions(folderId: string): Promise<import("@/types/quiz").FolderPermission[]> {
    if (this.driver.getFolderPermissions) {
      return this.driver.getFolderPermissions(folderId);
    }
    return [];
  }

  async saveFolderPermission(permission: Omit<import("@/types/quiz").FolderPermission, 'id' | 'grantedAt'>): Promise<void> {
    if (this.driver.saveFolderPermission) {
      return this.driver.saveFolderPermission(permission);
    }
  }

  async updateFolderPermission(permissionId: string, role: string): Promise<void> {
    if (this.driver.updateFolderPermission) {
      return this.driver.updateFolderPermission(permissionId, role);
    }
  }

  async deleteFolderPermission(permissionId: string): Promise<void> {
    if (this.driver.deleteFolderPermission) {
      return this.driver.deleteFolderPermission(permissionId);
    }
  }

  // Edit request operations
  async getEditRequests(resourceType?: 'quiz' | 'folder', resourceId?: string): Promise<import("@/types/quiz").EditRequest[]> {
    if (this.driver.getEditRequests) {
      return this.driver.getEditRequests(resourceType, resourceId);
    }
    return [];
  }

  async saveEditRequest(request: Omit<import("@/types/quiz").EditRequest, 'id' | 'requestedAt' | 'status'>): Promise<import("@/types/quiz").EditRequest> {
    if (this.driver.saveEditRequest) {
      return this.driver.saveEditRequest(request);
    }
    throw new Error("Edit requests not supported by current driver");
  }

  async updateEditRequest(requestId: string, status: string, reviewedBy: string, reviewMessage?: string): Promise<void> {
    if (this.driver.updateEditRequest) {
      return this.driver.updateEditRequest(requestId, status, reviewedBy, reviewMessage);
    }
  }

  // Access code operations
  async getQuizByAccessCode(accessCode: string): Promise<Quiz | null> {
    if (this.driver.getQuizByAccessCode) {
      return this.driver.getQuizByAccessCode(accessCode);
    }
    return null;
  }

  async getFolderByAccessCode(accessCode: string): Promise<QuizFolder | null> {
    if (this.driver.getFolderByAccessCode) {
      return this.driver.getFolderByAccessCode(accessCode);
    }
    return null;
  }
}
