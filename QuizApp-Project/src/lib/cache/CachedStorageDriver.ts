/**
 * CachedStorageDriver - Wrapper around any storage driver with intelligent caching
 */

import { IStorageDriver } from '../storage/IStorageDriver';
import { Quiz, QuizFolder, MusicFile, ChatGroup, ChatMessage, QuizAttempt, FolderPermission, EditRequest } from '@/types/quiz';
import { CacheManager } from './CacheManager';

export class CachedStorageDriver implements IStorageDriver {
  private driver: IStorageDriver;
  private cache: CacheManager;
  
  // Cache TTL configurations for different data types
  private readonly cacheTTLs = {
    // Long-lived data (rarely changes)
    quizzes: 10 * 60 * 1000,        // 10 minutes
    publicQuizzes: 15 * 60 * 1000,  // 15 minutes  
    folders: 10 * 60 * 1000,        // 10 minutes
    musicFiles: 20 * 60 * 1000,     // 20 minutes
    
    // Medium-lived data
    userQuizzes: 5 * 60 * 1000,     // 5 minutes
    folderContents: 5 * 60 * 1000,  // 5 minutes
    
    // Short-lived data (changes frequently)
    chatGroups: 2 * 60 * 1000,      // 2 minutes
    chatMessages: 1 * 60 * 1000,    // 1 minute
    attempts: 3 * 60 * 1000,        // 3 minutes
  };

  constructor(driver: IStorageDriver, cache?: CacheManager) {
    this.driver = driver;
    this.cache = cache || new CacheManager();
  }

  // ===== QUIZ OPERATIONS =====

  async getQuizzes(): Promise<Quiz[]> {
    return this.cache.get(
      'all-quizzes',
      () => this.driver.getQuizzes(),
      { ttl: this.cacheTTLs.quizzes }
    );
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    return this.cache.get(
      `quiz-${id}`,
      () => this.driver.getQuizById(id),
      { ttl: this.cacheTTLs.quizzes }
    );
  }

  async getUserQuizzes(userId: string): Promise<Quiz[]> {
    return this.cache.get(
      `user-quizzes-${userId}`,
      async () => {
        console.log('🔄 CachedStorageDriver: Calling driver.getUserQuizzes for:', userId);
        const result = await (this.driver.getUserQuizzes?.(userId) || Promise.resolve([]));
        console.log('📋 CachedStorageDriver: Driver returned:', {
          count: result.length,
          sampleIsPublic: result[0]?.isPublic,
          sampleFolderPath: result[0]?.folderPath
        });
        return result;
      },
      { ttl: this.cacheTTLs.userQuizzes }
    );
  }

  async getPublicQuizzes(): Promise<Quiz[]> {
    return this.cache.get(
      'public-quizzes',
      () => this.driver.getPublicQuizzes?.() || Promise.resolve([]),
      { ttl: this.cacheTTLs.publicQuizzes }
    );
  }

  async saveQuiz(quiz: Quiz): Promise<void> {
    await this.driver.saveQuiz(quiz);
    
    // Invalidate related cache entries
    this.invalidateQuizCaches(quiz);
    
    // Cache the saved quiz immediately
    this.cache.set(`quiz-${quiz.id}`, quiz, { ttl: this.cacheTTLs.quizzes });
  }

  async updateQuiz(quiz: Quiz): Promise<void> {
    await this.driver.updateQuiz(quiz);
    
    // Invalidate related cache entries
    this.invalidateQuizCaches(quiz);
    
    // Cache the updated quiz immediately
    this.cache.set(`quiz-${quiz.id}`, quiz, { ttl: this.cacheTTLs.quizzes });
  }

  async deleteQuiz(id: string): Promise<void> {
    await this.driver.deleteQuiz(id);
    
    // Invalidate all quiz-related caches
    this.cache.invalidatePattern(`quiz-${id}*`);
    this.cache.invalidatePattern('*quizzes*');
    this.cache.invalidatePattern(`folder-contents-*`);
  }

  // ===== FOLDER OPERATIONS =====

  async getFolders(): Promise<QuizFolder[]> {
    return this.cache.get(
      'all-folders',
      () => this.driver.getFolders?.() || Promise.resolve([]),
      { ttl: this.cacheTTLs.folders }
    );
  }

  // MISSING METHOD: getUsers for chat functionality
  async getUsers(): Promise<User[]> {
    return this.cache.get(
      'all-users',
      async () => {
        console.log('🔄 CachedStorageDriver: Cache MISS for users - calling driver.getUsers');
        const result = await (this.driver.getUsers?.() || Promise.resolve([]));
        console.log('📋 CachedStorageDriver: Driver returned users:', {
          count: result.length,
          users: result.map(u => ({ id: u.id, username: u.username }))
        });
        return result;
      },
      { ttl: this.cacheTTLs.userQuizzes }
    );
  }

  async getFolderById(id: string): Promise<QuizFolder | null> {
    return this.cache.get(
      `folder-${id}`,
      () => this.driver.getFolderById?.(id) || Promise.resolve(null),
      { ttl: this.cacheTTLs.folders }
    );
  }

  async getFolderContents(folderPath: string): Promise<{ quizzes: Quiz[], folders: QuizFolder[] }> {
    return this.cache.get(
      `folder-contents-${folderPath}`,
      () => this.driver.getFolderContents?.(folderPath) || Promise.resolve({ quizzes: [], folders: [] }),
      { ttl: this.cacheTTLs.folderContents }
    );
  }

  async saveFolder(folder: QuizFolder): Promise<void> {
    await this.driver.saveFolder?.(folder);
    
    // Invalidate folder-related caches
    this.cache.invalidatePattern('*folder*');
    this.cache.invalidatePattern('*user-quizzes*');
  }

  async updateFolder(folder: QuizFolder): Promise<void> {
    await this.driver.updateFolder?.(folder);
    
    // Invalidate folder-related caches
    this.cache.invalidatePattern('*folder*');
    this.cache.invalidatePattern('*user-quizzes*');
    
    // Cache the updated folder immediately
    this.cache.set(`folder-${folder.id}`, folder, { ttl: this.cacheTTLs.folders });
  }

  async getUserFolders(userId: string): Promise<QuizFolder[]> {
    return this.cache.get(
      `user-folders-${userId}`,
      async () => {
        console.log('🔄 CachedStorageDriver: Calling driver.getUserFolders for:', userId);
        const result = await (this.driver.getUserFolders?.(userId) || Promise.resolve([]));
        console.log('📁 CachedStorageDriver: Driver returned:', {
          count: result.length,
          sampleIsPublic: result[0]?.isPublic,
          sampleParentPath: result[0]?.parentPath
        });
        return result;
      },
      { ttl: this.cacheTTLs.folders }
    );
  }

  async deleteFolder(id: string): Promise<void> {
    await this.driver.deleteFolder?.(id);
    
    // Invalidate folder-related caches
    this.cache.invalidatePattern('*folder*');
  }

  // ===== MUSIC OPERATIONS =====

  async getMusicFiles(): Promise<MusicFile[]> {
    return this.cache.get(
      'all-music-files',
      () => this.driver.getMusicFiles?.() || Promise.resolve([]),
      { ttl: this.cacheTTLs.musicFiles }
    );
  }

  async saveMusicFile(musicFile: MusicFile, file: File): Promise<void> {
    await this.driver.saveMusicFile?.(musicFile, file);
    
    // Invalidate music-related caches
    this.cache.invalidatePattern('*music*');
  }

  async deleteMusicFile(id: string): Promise<void> {
    await this.driver.deleteMusicFile?.(id);
    
    // Invalidate music-related caches
    this.cache.invalidatePattern('*music*');
  }

  // ===== CHAT OPERATIONS =====

  async getChatGroups(): Promise<ChatGroup[]> {
    return this.cache.get(
      'chat-groups',
      async () => {
        console.log('🔄 CachedStorageDriver: Calling driver.getChatGroups');
        const result = await (this.driver.getChatGroups?.() || Promise.resolve([]));
        console.log('📋 CachedStorageDriver: Chat groups returned:', {
          count: result.length,
          sample: result[0] ? { id: result[0].id, name: result[0].name } : null
        });
        return result;
      },
      { ttl: this.cacheTTLs.chatGroups }
    );
  }

  async getAllChatGroups(): Promise<ChatGroup[]> {
    return this.cache.get(
      'all-chat-groups',
      async () => {
        console.log('🔄 CachedStorageDriver: Calling driver.getAllChatGroups');
        const result = await (this.driver.getAllChatGroups?.() || Promise.resolve([]));
        console.log('📋 CachedStorageDriver: All chat groups returned:', {
          count: result.length,
          sample: result[0] ? { id: result[0].id, name: result[0].name, accessCode: result[0].accessCode } : null
        });
        return result;
      },
      { ttl: this.cacheTTLs.chatGroups }
    );
  }

  async getChatMessages(groupId: string): Promise<ChatMessage[]> {
    return this.cache.get(
      `chat-messages-${groupId}`,
      () => this.driver.getChatMessages?.(groupId) || Promise.resolve([]),
      { ttl: this.cacheTTLs.chatMessages }
    );
  }

  async saveChatGroup(group: ChatGroup): Promise<void> {
    await this.driver.saveChatGroup?.(group);
    
    // Invalidate chat-related caches
    this.cache.invalidatePattern('*chat*');
  }

  async updateChatGroup(group: ChatGroup): Promise<void> {
    await this.driver.updateChatGroup?.(group);
    
    // Invalidate chat-related caches
    this.cache.invalidatePattern('*chat*');
    
    // Cache the updated group immediately
    this.cache.set(`chat-group-${group.id}`, group, { ttl: this.cacheTTLs.chatGroups });
  }

  async deleteChatGroup(id: string): Promise<void> {
    await this.driver.deleteChatGroup?.(id);
    
    // Invalidate chat-related caches
    this.cache.invalidatePattern('*chat*');
  }

  async saveChatMessage(message: ChatMessage): Promise<void> {
    await this.driver.saveChatMessage?.(message);
    
    // Invalidate chat-related caches
    this.cache.invalidatePattern(`chat-messages-${message.groupId}`);
    this.cache.invalidatePattern('chat-groups');
  }

  async deleteChatMessage(id: string): Promise<void> {
    await this.driver.deleteChatMessage?.(id);
    
    // Invalidate chat-related caches
    this.cache.invalidatePattern('*chat*');
  }

  // ===== ATTEMPT OPERATIONS =====

  async getAttempts(): Promise<QuizAttempt[]> {
    return this.cache.get(
      'all-attempts',
      () => this.driver.getAttempts?.() || Promise.resolve([]),
      { ttl: this.cacheTTLs.attempts }
    );
  }

  async getUserAttempts(userId: string): Promise<QuizAttempt[]> {
    return this.cache.get(
      `user-attempts-${userId}`,
      () => this.driver.getUserAttempts?.(userId) || Promise.resolve([]),
      { ttl: this.cacheTTLs.attempts }
    );
  }

  async getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
    return this.cache.get(
      `quiz-attempts-${quizId}`,
      () => this.driver.getQuizAttempts?.(quizId) || Promise.resolve([]),
      { ttl: this.cacheTTLs.attempts }
    );
  }

  async saveAttempt(attempt: QuizAttempt): Promise<void> {
    await this.driver.saveAttempt?.(attempt);
    
    // Invalidate attempt-related caches
    this.cache.invalidatePattern(`*attempts*`);
    this.cache.invalidatePattern(`user-attempts-${attempt.userId}`);
    this.cache.invalidatePattern(`quiz-attempts-${attempt.quizId}`);
  }

  // ===== PERMISSION OPERATIONS =====

  async getFolderPermissions(folderId: string): Promise<FolderPermission[]> {
    return this.cache.get(
      `folder-permissions-${folderId}`,
      () => this.driver.getFolderPermissions?.(folderId) || Promise.resolve([]),
      { ttl: this.cacheTTLs.folders }
    );
  }

  async saveFolderPermission(permission: FolderPermission): Promise<void> {
    await this.driver.saveFolderPermission?.(permission);
    
    // Invalidate permission-related caches
    this.cache.invalidatePattern(`folder-permissions-${permission.folderId}`);
  }

  // ===== EDIT REQUEST OPERATIONS =====

  async getEditRequests(): Promise<EditRequest[]> {
    return this.cache.get(
      'edit-requests',
      () => this.driver.getEditRequests?.() || Promise.resolve([]),
      { ttl: this.cacheTTLs.attempts }
    );
  }

  async saveEditRequest(request: EditRequest): Promise<void> {
    await this.driver.saveEditRequest?.(request);
    
    // Invalidate edit request caches
    this.cache.invalidatePattern('edit-requests');
  }

  async updateEditRequest(request: EditRequest): Promise<void> {
    await this.driver.updateEditRequest?.(request);
    
    // Invalidate edit request caches
    this.cache.invalidatePattern('edit-requests');
  }

  // ===== CACHE MANAGEMENT HELPERS =====

  /**
   * Invalidate all caches related to a specific quiz
   */
  private invalidateQuizCaches(quiz: Quiz): void {
    console.log('🗑️ Invalidating quiz caches for:', quiz.id);
    
    // Invalidate direct quiz cache
    this.cache.invalidate(`quiz-${quiz.id}`);
    
    // Invalidate list caches - CRITICAL: Must invalidate both old and new states
    this.cache.invalidate('all-quizzes');
    this.cache.invalidate(`user-quizzes-${quiz.creator}`);
    this.cache.invalidate('public-quizzes'); // Always invalidate public cache
    
    // Invalidate folder-related caches
    this.cache.invalidatePattern('*user-folders*');
    this.cache.invalidatePattern(`folder-contents-*`);
    
    console.log('✅ Quiz caches invalidated');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(userId?: string): Promise<void> {
    try {
      console.log('🔥 Starting cache warmup...');
      
      // Warm up public quizzes (most accessed)
      await this.getPublicQuizzes();
      
      // Warm up folders
      await this.getFolders();
      
      // If user provided, warm up their data
      if (userId) {
        await this.getUserQuizzes(userId);
        await this.getUserAttempts(userId);
      }
      
      console.log('✅ Cache warmup completed');
    } catch (error) {
      console.error('❌ Cache warmup failed:', error);
    }
  }
}