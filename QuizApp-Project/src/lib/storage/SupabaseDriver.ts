import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IStorageDriver } from './IStorageDriver';
import { Quiz, QuizAttempt, User, QuizFolder } from '@/types/quiz';

/**
 * Supabase/PostgreSQL Storage Driver
 * Implements IStorageDriver using Supabase as the backend
 * 
 * Setup Instructions:
 * 1. Enable Lovable Cloud in your project settings
 * 2. Run the migration SQL (see MIGRATION.md)
 * 3. Configure RLS policies for security
 * 4. Update src/lib/storage/index.ts to use this driver:
 *    import { SupabaseDriver } from './SupabaseDriver';
 *    const supabaseDriver = new SupabaseDriver(supabaseUrl, supabaseAnonKey);
 *    export const storage = new StorageService(supabaseDriver);
 */
export class SupabaseDriver implements IStorageDriver {
  private supabase: SupabaseClient;
  private currentUserId: string | null = null;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Listen to auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUserId = session?.user?.id || null;
    });
  }

  /**
   * Handle database errors with proper sanitization
   * Only logs detailed errors in development mode
   */
  private handleDbError(error: any, operation: string): never {
    if (import.meta.env.DEV) {
      console.error(`DB ${operation} error:`, error);
    }
    throw new Error(`Database operation failed: ${operation}`);
  }

  // Helper: Map DB camelCase to TypeScript camelCase (database uses camelCase)
  private mapUserFromDb(dbUser: any): User {
    return {
      id: dbUser.id,
      username: dbUser.username,
      password: dbUser.password || '',
      createdAt: dbUser.createdAt ? new Date(dbUser.createdAt).getTime() : Date.now(),
      musicFiles: dbUser.musicFiles || []
    };
  }

  private mapUserToDb(user: User): any {
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      createdAt: new Date(user.createdAt).toISOString(),
      musicFiles: user.musicFiles || []
    };
  }

  private mapQuizFromDb(dbQuiz: any): Quiz {
    return {
      id: dbQuiz.id,
      title: dbQuiz.title,
      desc: dbQuiz.desc,
      questions: dbQuiz.questions,
      creator: dbQuiz.creator,
      createdAt: dbQuiz.createdAt,
      isPublic: dbQuiz.isPublic,
      timeLimit: dbQuiz.timeLimit,
      perQuestionTimeLimit: dbQuiz.perQuestionTimeLimit,
      randomize: dbQuiz.randomize,
      media: dbQuiz.media || [],
      layout: dbQuiz.layout || 'default',
      folderPath: dbQuiz.folderPath,
      sharedWith: dbQuiz.sharedWith || [],
      forkedFrom: dbQuiz.forkedFrom
    };
  }

  private mapQuizToDb(quiz: Quiz): any {
    return {
      id: quiz.id,
      title: quiz.title,
      desc: quiz.desc,
      questions: quiz.questions,
      creator: quiz.creator,
      createdAt: quiz.createdAt,
      isPublic: quiz.isPublic,
      timeLimit: quiz.timeLimit,
      perQuestionTimeLimit: quiz.perQuestionTimeLimit,
      randomize: quiz.randomize,
      media: quiz.media || [],
      layout: quiz.layout || 'default',
      folderPath: quiz.folderPath,
      sharedWith: quiz.sharedWith || [],
      forkedFrom: quiz.forkedFrom
    };
  }

  private mapAttemptFromDb(dbAttempt: any): QuizAttempt {
    return {
      id: dbAttempt.id,
      quizId: dbAttempt.quizId,
      userId: dbAttempt.userId,
      answers: dbAttempt.answers,
      timeTaken: dbAttempt.timeTaken,
      totalTime: dbAttempt.totalTime,
      score: dbAttempt.score,
      completedAt: dbAttempt.completedAt
    };
  }

  private mapAttemptToDb(attempt: QuizAttempt): any {
    return {
      id: attempt.id,
      quizId: attempt.quizId,
      userId: attempt.userId,
      answers: attempt.answers,
      timeTaken: attempt.timeTaken,
      totalTime: attempt.totalTime,
      score: attempt.score,
      completedAt: attempt.completedAt
    };
  }

  private mapFolderFromDb(dbFolder: any): QuizFolder {
    return {
      id: dbFolder.id,
      name: dbFolder.name,
      parentPath: dbFolder.parentPath,
      createdAt: dbFolder.createdAt,
      creator: dbFolder.creator,
      isPublic: dbFolder.isPublic,
      sharedWith: dbFolder.sharedWith || []
    };
  }

  private mapFolderToDb(folder: QuizFolder): any {
    return {
      id: folder.id,
      name: folder.name,
      parentPath: folder.parentPath,
      createdAt: folder.createdAt,
      creator: folder.creator,
      isPublic: folder.isPublic,
      sharedWith: folder.sharedWith || []
    };
  }

  // User operations
  async getUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) this.handleDbError(error, 'fetch users');
    return (data || []).map(this.mapUserFromDb.bind(this));
  }

  async saveUser(user: User): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .upsert(this.mapUserToDb(user));
    
    if (error) this.handleDbError(error, 'save user');
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.currentUserId) return null;
    
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', this.currentUserId)
      .single();
    
    if (error) return null;
    return data ? this.mapUserFromDb(data) : null;
  }

  async setCurrentUser(user: User | null): Promise<void> {
    // This is handled by Supabase Auth
    this.currentUserId = user?.id || null;
  }

  // Quiz operations
  async getQuizzes(): Promise<Quiz[]> {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) this.handleDbError(error, 'fetch quizzes');
    return (data || []).map(this.mapQuizFromDb.bind(this));
  }

  async saveQuiz(quiz: Quiz): Promise<void> {
    const { error } = await this.supabase
      .from('quizzes')
      .insert(this.mapQuizToDb(quiz));
    
    if (error) this.handleDbError(error, 'save quiz');
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data ? this.mapQuizFromDb(data) : null;
  }

  async updateQuiz(quiz: Quiz): Promise<void> {
    const { error } = await this.supabase
      .from('quizzes')
      .update(this.mapQuizToDb(quiz))
      .eq('id', quiz.id);
    
    if (error) this.handleDbError(error, 'update quiz');
  }

  async deleteQuiz(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('quizzes')
      .delete()
      .eq('id', id);
    
    if (error) this.handleDbError(error, 'delete quiz');
  }

  // Attempt operations
  async getAttempts(): Promise<QuizAttempt[]> {
    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .select('*')
      .order('completedAt', { ascending: false });
    
    if (error) this.handleDbError(error, 'fetch attempts');
    return (data || []).map(this.mapAttemptFromDb.bind(this));
  }

  async saveAttempt(attempt: QuizAttempt): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_attempts')
      .insert(this.mapAttemptToDb(attempt));
    
    if (error) this.handleDbError(error, 'save attempt');
  }

  async getUserAttempts(userId: string): Promise<QuizAttempt[]> {
    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .select('*')
      .eq('userId', userId)
      .order('completedAt', { ascending: false });
    
    if (error) this.handleDbError(error, 'fetch user attempts');
    return (data || []).map(this.mapAttemptFromDb.bind(this));
  }

  async getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quizId', quizId)
      .order('completedAt', { ascending: false });
    
    if (error) this.handleDbError(error, 'fetch quiz attempts');
    return (data || []).map(this.mapAttemptFromDb.bind(this));
  }

  // Folder operations
  async getFolders(): Promise<QuizFolder[]> {
    const { data, error } = await this.supabase
      .from('quiz_folders')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) this.handleDbError(error, 'fetch folders');
    return (data || []).map(this.mapFolderFromDb.bind(this));
  }

  async saveFolder(folder: QuizFolder): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_folders')
      .insert(this.mapFolderToDb(folder));
    
    if (error) this.handleDbError(error, 'save folder');
  }

  async updateFolder(folder: QuizFolder): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_folders')
      .update(this.mapFolderToDb(folder))
      .eq('id', folder.id);
    
    if (error) this.handleDbError(error, 'update folder');
  }

  async deleteFolder(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_folders')
      .delete()
      .eq('id', id);
    
    if (error) this.handleDbError(error, 'delete folder');
  }

  async renameFolder(id: string, newName: string): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_folders')
      .update({ name: newName })
      .eq('id', id);
    
    if (error) this.handleDbError(error, 'rename folder');
  }

  // Media operations using Supabase Storage
  async saveMedia(data: string, type: 'image' | 'audio', name: string): Promise<string> {
    const bucket = type === 'image' ? 'quiz-images' : 'quiz-audio';
    const fileName = `${Date.now()}-${name}`;
    
    // Convert base64 to blob
    const base64Data = data.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray]);

    const { data: uploadData, error } = await this.supabase.storage
      .from(bucket)
      .upload(fileName, blob);

    if (error) this.handleDbError(error, 'upload media');
    
    // Return public URL
    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  }

  async getMedia(id: string): Promise<string> {
    // For Supabase, the ID is already the public URL
    return id;
  }

  async deleteMedia(id: string): Promise<void> {
    // Extract bucket and file name from URL
    const url = new URL(id);
    const pathParts = url.pathname.split('/');
    const bucket = pathParts[pathParts.length - 2];
    const fileName = pathParts[pathParts.length - 1];
    
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([fileName]);
    
    if (error) this.handleDbError(error, 'delete media');
  }
}
