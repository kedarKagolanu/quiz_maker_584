/**
 * Batched Supabase Driver - Enhanced version with request batching
 * Extends SupabaseDriver to add batching capabilities for improved performance
 */

import { SupabaseDriver } from './SupabaseDriver';
import { globalBatcher } from '../requestBatcher';
import { Quiz, QuizAttempt, User, QuizFolder } from '@/types/quiz';

export class BatchedSupabaseDriver extends SupabaseDriver {
  private batchingEnabled = true;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    super(supabaseUrl, supabaseAnonKey);
    this.setupBulkOperations();
  }

  /**
   * Setup bulk operations for the batcher
   */
  private setupBulkOperations() {
    // Override batcher's bulk operations with actual Supabase implementations
    (globalBatcher as any).bulkGet = this.bulkGet.bind(this);
    (globalBatcher as any).bulkCreate = this.bulkCreate.bind(this);
    (globalBatcher as any).bulkUpdate = this.bulkUpdate.bind(this);
    (globalBatcher as any).bulkDelete = this.bulkDelete.bind(this);
  }

  /**
   * Bulk get operations
   */
  private async bulkGet(type: string, ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];

    try {
      let tableName: string;
      switch (type) {
        case 'quiz': tableName = 'quizzes'; break;
        case 'user': tableName = 'profiles'; break;
        case 'attempt': tableName = 'quiz_attempts'; break;
        case 'folder': tableName = 'quiz_folders'; break;
        default: throw new Error(`Unsupported bulk get type: ${type}`);
      }

      const { data, error } = await (this as any).supabase
        .from(tableName)
        .select('*')
        .in('id', ids);

      if (error) throw error;

      // Return results in the same order as requested IDs
      return ids.map(id => data?.find((item: any) => item.id === id) || null);
    } catch (error) {
      console.error(`Bulk get failed for type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Bulk create operations
   */
  private async bulkCreate(type: string, items: any[]): Promise<any[]> {
    if (items.length === 0) return [];

    try {
      let tableName: string;
      let mapFunction: (item: any) => any;

      switch (type) {
        case 'quiz': 
          tableName = 'quizzes';
          mapFunction = (this as any).mapQuizToDb.bind(this);
          break;
        case 'attempt': 
          tableName = 'quiz_attempts';
          mapFunction = (this as any).mapAttemptToDb.bind(this);
          break;
        case 'folder': 
          tableName = 'quiz_folders';
          mapFunction = (this as any).mapFolderToDb.bind(this);
          break;
        default: 
          throw new Error(`Unsupported bulk create type: ${type}`);
      }

      const dbItems = items.map(mapFunction);
      const { data, error } = await (this as any).supabase
        .from(tableName)
        .insert(dbItems)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Bulk create failed for type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Bulk update operations
   */
  private async bulkUpdate(type: string, updates: Array<{ id: string; data: any }>): Promise<any[]> {
    if (updates.length === 0) return [];

    try {
      // For now, execute updates sequentially
      // TODO: Implement true bulk updates using SQL or stored procedures
      const results = [];
      
      for (const update of updates) {
        switch (type) {
          case 'quiz':
            await this.updateQuiz(update.data);
            results.push(update.data);
            break;
          case 'folder':
            await this.updateFolder(update.data);
            results.push(update.data);
            break;
          default:
            throw new Error(`Unsupported bulk update type: ${type}`);
        }
      }

      return results;
    } catch (error) {
      console.error(`Bulk update failed for type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Bulk delete operations
   */
  private async bulkDelete(type: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    try {
      let tableName: string;
      switch (type) {
        case 'quiz': tableName = 'quizzes'; break;
        case 'attempt': tableName = 'quiz_attempts'; break;
        case 'folder': tableName = 'quiz_folders'; break;
        default: throw new Error(`Unsupported bulk delete type: ${type}`);
      }

      const { error } = await (this as any).supabase
        .from(tableName)
        .delete()
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      console.error(`Bulk delete failed for type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced quiz operations with batching
   */
  async getQuiz(id: string): Promise<Quiz | null> {
    if (!this.batchingEnabled) {
      return super.getQuiz(id);
    }

    try {
      const result = await globalBatcher.batch('quiz-get', {
        id,
        type: 'quiz',
        operation: 'get'
      });
      return result ? (this as any).mapQuizFromDb(result) : null;
    } catch (error) {
      console.warn('Batched quiz get failed, falling back to direct call:', error);
      return super.getQuiz(id);
    }
  }

  async saveQuiz(quiz: Quiz): Promise<void> {
    if (!this.batchingEnabled) {
      return super.saveQuiz(quiz);
    }

    try {
      await globalBatcher.batch('quiz-create', {
        id: quiz.id,
        type: 'quiz',
        operation: 'create',
        data: quiz
      });
    } catch (error) {
      console.warn('Batched quiz save failed, falling back to direct call:', error);
      return super.saveQuiz(quiz);
    }
  }

  async updateQuiz(quiz: Quiz): Promise<void> {
    if (!this.batchingEnabled) {
      return super.updateQuiz(quiz);
    }

    try {
      await globalBatcher.batch('quiz-update', {
        id: quiz.id,
        type: 'quiz',
        operation: 'update',
        data: quiz
      });
    } catch (error) {
      console.warn('Batched quiz update failed, falling back to direct call:', error);
      return super.updateQuiz(quiz);
    }
  }

  async deleteQuiz(id: string): Promise<void> {
    if (!this.batchingEnabled) {
      return super.deleteQuiz(id);
    }

    try {
      await globalBatcher.batch('quiz-delete', {
        id,
        type: 'quiz',
        operation: 'delete'
      });
    } catch (error) {
      console.warn('Batched quiz delete failed, falling back to direct call:', error);
      return super.deleteQuiz(id);
    }
  }

  /**
   * Enhanced folder operations with batching
   */
  async saveFolder(folder: QuizFolder): Promise<void> {
    if (!this.batchingEnabled) {
      return super.saveFolder(folder);
    }

    try {
      await globalBatcher.batch('folder-create', {
        id: folder.id,
        type: 'folder',
        operation: 'create',
        data: folder
      });
    } catch (error) {
      console.warn('Batched folder save failed, falling back to direct call:', error);
      return super.saveFolder(folder);
    }
  }

  /**
   * Flush all pending batches (useful before page unload)
   */
  async flushBatches(): Promise<void> {
    await globalBatcher.flush();
  }

  /**
   * Enable/disable batching
   */
  setBatchingEnabled(enabled: boolean): void {
    this.batchingEnabled = enabled;
    console.log(`🔄 Batching ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get batching statistics
   */
  getBatchingStats() {
    return {
      enabled: this.batchingEnabled,
      // Add more stats as needed
    };
  }
}