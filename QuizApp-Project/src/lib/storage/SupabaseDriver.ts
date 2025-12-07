import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IStorageDriver } from './IStorageDriver';
import { Quiz, QuizAttempt, User, QuizFolder, QuizPermission, FolderPermission, EditRequest, ChatGroup, ChatMessage } from '@/types/quiz';

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
  private missingTables = new Set<string>(); // Track missing tables to avoid repeated calls

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Mark known missing tables in minimal schema
    // Note: quiz_attempts table should now exist if SQL script was run
    this.missingTables.add('quiz_permissions'); 
    this.missingTables.add('folder_permissions');
    this.missingTables.add('edit_requests');
    
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
    // Always log errors for debugging
    console.error(`Database error in ${operation}:`, {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    
    // Check if this is a connection/CORS/timeout error that suggests Supabase is down
    const isConnectionError = error.message?.includes('Failed to fetch') || 
                             error.message?.includes('CORS') ||
                             error.message?.includes('timeout') ||
                             error.code === '57014'; // Statement timeout
    
    if (isConnectionError) {
      console.warn(`🚨 Supabase connection issue for ${operation}. Your project may be overloaded or down.`);
      console.warn(`💡 Consider upgrading your Supabase plan or switching to LocalStorage temporarily.`);
    }
    
    throw new Error(`Database operation failed: ${operation} - ${error.message}`);
  }

  // Helper: Map DB to TypeScript (handle both snake_case and camelCase)
  private mapUserFromDb(dbUser: any): User {
    console.log('🔍 Mapping user from DB:', {
      id: dbUser.id,
      username: dbUser.username,
      createdAt: dbUser.createdAt || dbUser.created_at,
      availableFields: Object.keys(dbUser)
    });
    
    return {
      id: dbUser.id,
      username: dbUser.username,
      password: '', // Don't expose passwords
      createdAt: dbUser.createdAt || dbUser.created_at || Date.now(),
      musicFiles: dbUser.musicFiles || dbUser.music_files || []
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
    // Debug logging to identify the issue
    console.log('🔍 Mapping quiz from DB:', {
      id: dbQuiz.id,
      title: dbQuiz.title,
      is_public: dbQuiz.is_public,
      isPublic: dbQuiz.isPublic,
      'typeof is_public': typeof dbQuiz.is_public,
      'typeof isPublic': typeof dbQuiz.isPublic
    });
    
    return {
      id: dbQuiz.id,
      title: dbQuiz.title,
      desc: dbQuiz.description || dbQuiz.desc || '', // Map from snake_case
      questions: Array.isArray(dbQuiz.questions) ? dbQuiz.questions : 
                 (typeof dbQuiz.questions === 'string' ? 
                   (() => { try { return JSON.parse(dbQuiz.questions); } catch { return []; } })() : 
                   []),
      creator: dbQuiz.creator,
      createdAt: dbQuiz.created_at || dbQuiz.createdAt, // Map from snake_case
      isPublic: Boolean(dbQuiz.is_public ?? dbQuiz.isPublic ?? false), // Explicit boolean conversion with proper null checking
      timeLimit: dbQuiz.time_limit || dbQuiz.timeLimit, // Map from snake_case
      perQuestionTimeLimit: dbQuiz.per_question_time_limit || dbQuiz.perQuestionTimeLimit, // Map from snake_case
      randomize: dbQuiz.randomize,
      media: dbQuiz.media || [],
      layout: dbQuiz.layout || 'default',
      folderPath: dbQuiz.folder_path || dbQuiz.folderPath, // Map from snake_case
      sharedWith: dbQuiz.shared_with || dbQuiz.sharedWith || [], // Map from snake_case
      forkedFrom: dbQuiz.forked_from || dbQuiz.forkedFrom, // Map from snake_case
      accessCode: dbQuiz.access_code || dbQuiz.accessCode, // Map from snake_case
      editMode: 'no_edits', // Simplified for new schema
      multiQuizSources: dbQuiz.multi_quiz_sources, // Map the database column
      questionLimit: dbQuiz.question_limit || dbQuiz.questionLimit || undefined, // Map from snake_case
      imageSize: dbQuiz.image_size || dbQuiz.imageSize || 'medium' // Map from snake_case
    };
  }

  private mapQuizToDb(quiz: Quiz): any {
    // Ensure only one time limit type is set (database constraint)
    let timeLimit = quiz.timeLimit || null;
    let perQuestionTimeLimit = quiz.perQuestionTimeLimit || null;
    
    // If both are set, prioritize perQuestionTimeLimit (more specific)
    if (timeLimit && perQuestionTimeLimit) {
      timeLimit = null;
    }
    
    // Convert empty strings to null for database
    if (timeLimit === "" || timeLimit === 0) timeLimit = null;
    if (perQuestionTimeLimit === "" || perQuestionTimeLimit === 0) perQuestionTimeLimit = null;
    
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.desc, // Map to snake_case
      questions: quiz.questions,
      creator: quiz.creator,
      created_at: quiz.createdAt, // Map to snake_case
      is_public: quiz.isPublic, // Map to snake_case
      time_limit: timeLimit, // Map to snake_case
      per_question_time_limit: perQuestionTimeLimit, // Map to snake_case
      randomize: quiz.randomize,
      media: quiz.media || [],
      layout: quiz.layout || 'default',
      folder_path: quiz.folderPath, // Map to snake_case
      shared_with: quiz.sharedWith || [], // Map to snake_case
      forked_from: quiz.forkedFrom, // Map to snake_case
      access_code: quiz.accessCode, // Map to snake_case
      multi_quiz_sources: quiz.multiQuizSources, // Map to database column name
      question_limit: quiz.questionLimit || null, // Map to snake_case
      image_size: quiz.imageSize || 'medium' // Map to snake_case
    };
  }

  private mapAttemptFromDb(dbAttempt: any): QuizAttempt {
    return {
      id: dbAttempt.id,
      quizId: dbAttempt.quiz_id || dbAttempt.quizId,
      userId: dbAttempt.user_id || dbAttempt.userId,
      answers: dbAttempt.answers,
      timeTaken: dbAttempt.time_taken || dbAttempt.timeTaken,
      totalTime: dbAttempt.total_time || dbAttempt.totalTime,
      score: dbAttempt.score,
      completedAt: dbAttempt.completed_at || dbAttempt.completedAt
    };
  }

  private mapAttemptToDb(attempt: QuizAttempt): any {
    return {
      id: attempt.id,
      quiz_id: attempt.quizId,
      user_id: attempt.userId,
      answers: attempt.answers,
      time_taken: attempt.timeTaken,
      total_time: attempt.totalTime,
      score: attempt.score,
      completed_at: attempt.completedAt
    };
  }

  private mapFolderFromDb(dbFolder: any): QuizFolder {
    // Debug logging to identify the issue
    console.log('🔍 Mapping folder from DB:', {
      id: dbFolder.id,
      name: dbFolder.name,
      is_public: dbFolder.is_public,
      isPublic: dbFolder.isPublic,
      'typeof is_public': typeof dbFolder.is_public,
      'typeof isPublic': typeof dbFolder.isPublic
    });
    
    return {
      id: dbFolder.id,
      name: dbFolder.name,
      parentPath: dbFolder.parent_path || dbFolder.parentPath, // Map from snake_case
      createdAt: dbFolder.created_at || dbFolder.createdAt, // Map from snake_case
      creator: dbFolder.creator,
      isPublic: Boolean(dbFolder.is_public ?? dbFolder.isPublic ?? false), // Explicit boolean conversion with proper null checking
      sharedWith: dbFolder.shared_with || dbFolder.sharedWith || [], // Map from snake_case
      accessCode: dbFolder.access_code || dbFolder.accessCode, // Map from snake_case
      editMode: 'no_edits' // Simplified for minimal schema
    };
  }

  private mapFolderToDb(folder: QuizFolder): any {
    return {
      id: folder.id,
      name: folder.name,
      parent_path: folder.parentPath, // Map to snake_case
      created_at: folder.createdAt, // Map to snake_case
      creator: folder.creator,
      is_public: folder.isPublic, // Map to snake_case
      shared_with: folder.sharedWith || [], // Map to snake_case
      access_code: folder.accessCode // Map to snake_case
    };
  }

  // User operations
  async getUsers(): Promise<User[]> {
    console.log('🔍 Fetching users from profiles table...');
    
    // First, let's test if we can access the table at all
    const { count, error: countError } = await this.supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Profiles table access test:', { count, countError });
    
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('username', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Check specific error types
      if (error.code === 'PGRST116') {
        console.error('💥 CRITICAL: profiles table does not exist!');
        console.error('📋 Run this SQL in Supabase: CREATE TABLE profiles (id uuid PRIMARY KEY REFERENCES auth.users(id), username text NOT NULL);');
      } else if (error.code === '42501') {
        console.error('🔒 CRITICAL: RLS policies are blocking access to profiles table');
        console.error('📋 Run this SQL: ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; CREATE POLICY "Users can read all profiles" ON profiles FOR SELECT USING (true);');
      } else if (error.message?.includes('permission denied')) {
        console.error('🔒 CRITICAL: Permission denied - check RLS policies');
      }
      
      return [];
    }
    
    console.log('📊 Raw user data from DB:', {
      count: data?.length || 0,
      rawData: data,
      currentAuthUser: await this.supabase.auth.getUser()
    });
    
    if (!data || data.length === 0) {
      console.warn('⚠️ No users found in profiles table - checking auth users...');
      
      // Let's see what auth users exist
      const { data: authUser } = await this.supabase.auth.getUser();
      console.log('🔍 Current auth user:', authUser);
      
      return [];
    }
    
    const mappedUsers = (data || []).map(this.mapUserFromDb.bind(this));
    console.log('👥 Final mapped users:', {
      count: mappedUsers.length,
      users: mappedUsers.map(u => ({
        id: u.id,
        username: u.username
      }))
    });
    
    return mappedUsers;
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
    // Include questions for question count but exclude heavy media
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('id, title, description, creator, created_at, is_public, time_limit, per_question_time_limit, randomize, layout, folder_path, shared_with, forked_from, access_code, multi_quiz_sources, question_limit, image_size, questions')
      .order('created_at', { ascending: false })
      .limit(100); // Limit to 100 most recent quizzes
    
    if (error) this.handleDbError(error, 'fetch quizzes');
    
    // CRITICAL: Use proper mapping function instead of raw spread
    return (data || []).map(this.mapQuizFromDb.bind(this));
  }

  async saveQuiz(quiz: Quiz): Promise<void> {
    try {
      const dbQuiz = this.mapQuizToDb(quiz);
      
      // Check if this is a large media save that might timeout
      const mediaSize = JSON.stringify(dbQuiz.media || []).length;
      if (mediaSize > 50000000) { // 50MB threshold (reasonable for multiple media files)
        throw new Error('Quiz contains too much media data (over 50MB). Please reduce file sizes or number of media files.');
      }
      
      const { error } = await this.supabase
        .from('quizzes')
        .insert(dbQuiz);
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('A quiz with this ID already exists. Please try again.');
        }
        if (error.code === '57014') {
          throw new Error('Quiz creation timed out. Please try reducing media file sizes.');
        }
        this.handleDbError(error, 'save quiz');
      }
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to save quiz: ' + String(err));
    }
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    try {
      console.log(`🔍 Fetching quiz by ID: ${id}`);
      
      const { data, error } = await this.supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully
      
      if (error) {
        console.error(`❌ Error fetching quiz ${id}:`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Handle specific 406 error
        if (error.code === 'PGRST406' || error.message?.includes('Not Acceptable')) {
          console.warn(`🔄 Retrying quiz fetch with different headers for ID: ${id}`);
          
          // Retry with explicit headers
          const { data: retryData, error: retryError } = await this.supabase
            .from('quizzes')
            .select('*')
            .eq('id', id)
            .limit(1);
            
          if (retryError) {
            console.error(`❌ Retry failed for quiz ${id}:`, retryError);
            return null;
          }
          
          return retryData && retryData.length > 0 ? this.mapQuizFromDb(retryData[0]) : null;
        }
        
        return null;
      }
      
      console.log(`✅ Successfully fetched quiz: ${data?.title || 'Unknown'}`);
      return data ? this.mapQuizFromDb(data) : null;
      
    } catch (error) {
      console.error(`❌ Exception fetching quiz ${id}:`, error);
      return null;
    }
  }

  // Method to get full quiz data with questions and media (for when needed)
  async getFullQuizData(id: string): Promise<Quiz | null> {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching full quiz data:', error);
      return null;
    }
    return data ? this.mapQuizFromDb(data) : null;
  }

  // Method to get quizzes with pagination for better performance
  async getQuizzesWithPagination(limit: number = 50, offset: number = 0): Promise<Quiz[]> {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('id, title, description, creator, created_at, is_public, time_limit, per_question_time_limit, randomize, layout, folder_path, shared_with, forked_from, access_code, multi_quiz_sources, question_limit, image_size')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) this.handleDbError(error, 'fetch quizzes with pagination');
    
    // CRITICAL: Use proper mapping function instead of raw spread
    return (data || []).map(this.mapQuizFromDb.bind(this));
  }

  async updateQuiz(quiz: Quiz): Promise<void> {
    try {
      const dbQuiz = this.mapQuizToDb(quiz);
      
      // Check if this is a large media update that might timeout
      const mediaSize = JSON.stringify(dbQuiz.media || []).length;
      if (mediaSize > 50000000) { // 50MB threshold (reasonable for multiple media files)
        throw new Error('Quiz contains too much media data (over 50MB). Please reduce file sizes or number of media files.');
      }
      
      const { error } = await this.supabase
        .from('quizzes')
        .update(dbQuiz)
        .eq('id', quiz.id);
      
      if (error) {
        if (error.code === '57014') {
          throw new Error('Quiz update timed out. Please try reducing media file sizes.');
        }
        this.handleDbError(error, 'update quiz');
      }
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to update quiz: ' + String(err));
    }
  }

  async deleteQuiz(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('quizzes')
      .delete()
      .eq('id', id);
    
    if (error) this.handleDbError(error, 'delete quiz');
  }

  // MISSING METHOD - Get quizzes for a specific user
  async getUserQuizzes(userId: string): Promise<Quiz[]> {
    console.log('🔍 Getting user quizzes for:', userId);
    
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('*')
      .eq('creator', userId)
      .order('created_at', { ascending: false });
    
    if (error) this.handleDbError(error, 'fetch user quizzes');
    
    const mappedQuizzes = (data || []).map(this.mapQuizFromDb.bind(this));
    console.log('📊 User quiz results:', {
      userId,
      count: mappedQuizzes.length,
      sample: mappedQuizzes[0] ? {
        id: mappedQuizzes[0].id,
        title: mappedQuizzes[0].title,
        isPublic: mappedQuizzes[0].isPublic,
        folderPath: mappedQuizzes[0].folderPath
      } : null
    });
    
    return mappedQuizzes;
  }

  // Attempt operations
  async getAttempts(): Promise<QuizAttempt[]> {
    // Skip network call entirely if we know the table doesn't exist
    if (this.missingTables.has('quiz_attempts')) {
      // Return localStorage fallback attempts
      try {
        const localAttempts = JSON.parse(localStorage.getItem('quiz_attempts') || '[]');
        console.log('📱 Retrieved attempts from localStorage fallback:', localAttempts.length);
        return localAttempts;
      } catch (error) {
        console.warn('⚠️ Failed to parse localStorage attempts:', error);
        return [];
      }
    }

    try {
      const { data, error } = await this.supabase
        .from('quiz_attempts')
        .select('*')
        .order('completed_at', { ascending: false });
      
      // Handle specific "table not found" error and cache it
      if (error && error.code === 'PGRST205') {
        this.missingTables.add('quiz_attempts');
        // Return localStorage fallback attempts
        try {
          const localAttempts = JSON.parse(localStorage.getItem('quiz_attempts') || '[]');
          console.log('📱 Database table missing, using localStorage fallback:', localAttempts.length);
          return localAttempts;
        } catch (parseError) {
          console.warn('⚠️ Failed to parse localStorage attempts:', parseError);
          return [];
        }
      }
      
      if (error) this.handleDbError(error, 'fetch attempts');
      return (data || []).map(this.mapAttemptFromDb.bind(this));
    } catch (error: any) {
      if (error.message?.includes("Could not find the table 'public.quiz_attempts'") || error.code === 'PGRST205') {
        this.missingTables.add('quiz_attempts');
        // Return localStorage fallback attempts
        try {
          const localAttempts = JSON.parse(localStorage.getItem('quiz_attempts') || '[]');
          console.log('📱 Database error, using localStorage fallback:', localAttempts.length);
          return localAttempts;
        } catch (parseError) {
          console.warn('⚠️ Failed to parse localStorage attempts:', parseError);
          return [];
        }
      }
      throw error;
    }
  }

  async saveAttempt(attempt: QuizAttempt): Promise<void> {
    // Skip network call entirely if we know the table doesn't exist
    if (this.missingTables.has('quiz_attempts')) {
      console.log('⚠️ Skipping attempt save - quiz_attempts table marked as missing');
      return;
    }

    try {
      const dbAttempt = this.mapAttemptToDb(attempt);
      console.log('💾 Attempting to save quiz attempt:', {
        attemptId: attempt.id,
        quizId: attempt.quizId,
        userId: attempt.userId,
        score: attempt.score,
        dbData: dbAttempt
      });

      const { data, error } = await this.supabase
        .from('quiz_attempts')
        .insert(dbAttempt)
        .select();
      
      // Handle specific "table not found" error and cache it
      if (error && error.code === 'PGRST205') {
        console.error('❌ quiz_attempts table not found (PGRST205)');
        this.missingTables.add('quiz_attempts');
        return;
      }
      
      if (error) {
        console.error('❌ Database error saving attempt:', error);
        this.handleDbError(error, 'save attempt');
      }

      console.log('✅ Quiz attempt saved successfully to database:', data);
    } catch (error: any) {
      if (error.message?.includes("Could not find the table 'public.quiz_attempts'") || error.code === 'PGRST205') {
        console.error('❌ quiz_attempts table not found (catch block)');
        this.missingTables.add('quiz_attempts');
        return;
      }
      console.error('❌ Exception saving attempt:', error);
      throw error;
    }
  }

  async getUserAttempts(userId: string): Promise<QuizAttempt[]> {
    // Skip network call entirely if we know the table doesn't exist
    if (this.missingTables.has('quiz_attempts')) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });
      
      // Handle specific "table not found" error and cache it
      if (error && error.code === 'PGRST205') {
        this.missingTables.add('quiz_attempts');
        return [];
      }
      
      if (error) this.handleDbError(error, 'fetch user attempts');
      return (data || []).map(this.mapAttemptFromDb.bind(this));
    } catch (error: any) {
      if (error.message?.includes("Could not find the table 'public.quiz_attempts'") || error.code === 'PGRST205') {
        this.missingTables.add('quiz_attempts');
        return [];
      }
      throw error;
    }
  }

  async getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
    // Skip network call entirely if we know the table doesn't exist
    if (this.missingTables.has('quiz_attempts')) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false });
      
      // Handle specific "table not found" error and cache it
      if (error && error.code === 'PGRST205') {
        this.missingTables.add('quiz_attempts');
        return [];
      }
      
      if (error) this.handleDbError(error, 'fetch quiz attempts');
      return (data || []).map(this.mapAttemptFromDb.bind(this));
    } catch (error: any) {
      if (error.message?.includes("Could not find the table 'public.quiz_attempts'") || error.code === 'PGRST205') {
        this.missingTables.add('quiz_attempts');
        return [];
      }
      throw error;
    }
  }

  // Folder operations
  async getFolders(): Promise<QuizFolder[]> {
    const { data, error } = await this.supabase
      .from('quiz_folders')
      .select('*')
      .order('created_at', { ascending: false });
    
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

  // MISSING METHOD - Get folders for a specific user  
  async getUserFolders(userId: string): Promise<QuizFolder[]> {
    console.log('🔍 Getting user folders for:', userId);
    
    const { data, error } = await this.supabase
      .from('quiz_folders')
      .select('*')
      .eq('creator', userId)
      .order('created_at', { ascending: false });
    
    if (error) this.handleDbError(error, 'fetch user folders');
    
    const mappedFolders = (data || []).map(this.mapFolderFromDb.bind(this));
    console.log('📁 User folder results:', {
      userId,
      count: mappedFolders.length,
      sample: mappedFolders[0] ? {
        id: mappedFolders[0].id,
        name: mappedFolders[0].name,
        isPublic: mappedFolders[0].isPublic,
        parentPath: mappedFolders[0].parentPath
      } : null
    });
    
    return mappedFolders;
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

  // Permission operations (graceful handling for minimal schema)
  async getQuizPermissions(quizId: string): Promise<QuizPermission[]> {
    try {
      const { data, error } = await this.supabase
        .from('quiz_permissions')
        .select('*')
        .eq('quizId', quizId);
      
      if (error) this.handleDbError(error, 'fetch quiz permissions');
    
      return (data || []).map(p => ({
        id: p.id,
        quizId: p.quizId,
        userId: p.userId,
        role: p.role,
        grantedBy: p.grantedBy,
        grantedAt: new Date(p.grantedAt).getTime()
      }));
    } catch (error: any) {
      // Table doesn't exist in minimal schema - return empty array
      if (error.message?.includes("Could not find the table 'public.quiz_permissions'")) {
        return [];
      }
      throw error;
    }
  }

  async saveQuizPermission(permission: Omit<QuizPermission, 'id' | 'grantedAt'>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('quiz_permissions')
        .insert({
          quizId: permission.quizId,
          userId: permission.userId,
          role: permission.role,
          grantedBy: permission.grantedBy
        });
      
      if (error) this.handleDbError(error, 'save quiz permission');
    } catch (error: any) {
      // Table doesn't exist in minimal schema - silently ignore
      if (error.message?.includes("Could not find the table 'public.quiz_permissions'")) {
        return;
      }
      throw error;
    }
  }

  async updateQuizPermission(permissionId: string, role: string): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_permissions')
      .update({ role })
      .eq('id', permissionId);
    
    if (error) this.handleDbError(error, 'update quiz permission');
  }

  async deleteQuizPermission(permissionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_permissions')
      .delete()
      .eq('id', permissionId);
    
    if (error) this.handleDbError(error, 'delete quiz permission');
  }

  async getFolderPermissions(folderId: string): Promise<FolderPermission[]> {
    try {
      const { data, error } = await this.supabase
        .from('folder_permissions')
        .select('*')
        .eq('folderId', folderId);
      
      if (error) this.handleDbError(error, 'fetch folder permissions');
      
      return (data || []).map(p => ({
        id: p.id,
        folderId: p.folderId,
        userId: p.userId,
        role: p.role,
        grantedBy: p.grantedBy,
        grantedAt: new Date(p.grantedAt).getTime()
      }));
    } catch (error: any) {
      // Table doesn't exist in minimal schema - return empty array
      if (error.message?.includes("Could not find the table 'public.folder_permissions'")) {
        return [];
      }
      throw error;
    }
  }

  async saveFolderPermission(permission: Omit<FolderPermission, 'id' | 'grantedAt'>): Promise<void> {
    const { error } = await this.supabase
      .from('folder_permissions')
      .insert({
        folderId: permission.folderId,
        userId: permission.userId,
        role: permission.role,
        grantedBy: permission.grantedBy
      });
    
    if (error) this.handleDbError(error, 'save folder permission');
  }

  async updateFolderPermission(permissionId: string, role: string): Promise<void> {
    const { error } = await this.supabase
      .from('folder_permissions')
      .update({ role })
      .eq('id', permissionId);
    
    if (error) this.handleDbError(error, 'update folder permission');
  }

  async deleteFolderPermission(permissionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('folder_permissions')
      .delete()
      .eq('id', permissionId);
    
    if (error) this.handleDbError(error, 'delete folder permission');
  }

  async getEditRequests(resourceType?: 'quiz' | 'folder', resourceId?: string): Promise<EditRequest[]> {
    try {
      let query = this.supabase
        .from('edit_requests')
        .select('*')
        .order('requestedAt', { ascending: false });
      
      if (resourceType) {
        query = query.eq('resourceType', resourceType);
      }
      if (resourceId) {
        query = query.eq('resourceId', resourceId);
      }
      
      const { data, error } = await query;
      
      if (error) this.handleDbError(error, 'fetch edit requests');
    
      return (data || []).map(r => ({
        id: r.id,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        requestedBy: r.requestedBy,
        requestedAt: new Date(r.requestedAt).getTime(),
        status: r.status,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).getTime() : undefined,
        changes: r.changes,
        message: r.message,
        reviewMessage: r.reviewMessage
      }));
    } catch (error: any) {
      // Table doesn't exist in minimal schema - return empty array
      if (error.message?.includes("Could not find the table 'public.edit_requests'")) {
        return [];
      }
      throw error;
    }
  }

  async saveEditRequest(request: Omit<EditRequest, 'id' | 'requestedAt' | 'status'>): Promise<EditRequest> {
    const { data, error } = await this.supabase
      .from('edit_requests')
      .insert({
        resourceType: request.resourceType,
        resourceId: request.resourceId,
        requestedBy: request.requestedBy,
        changes: request.changes,
        message: request.message
      })
      .select()
      .single();
    
    if (error) this.handleDbError(error, 'save edit request');
    
    return {
      id: data.id,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      requestedBy: data.requestedBy,
      requestedAt: new Date(data.requestedAt).getTime(),
      status: data.status,
      changes: data.changes,
      message: data.message
    };
  }

  async updateEditRequest(requestId: string, status: string, reviewedBy: string, reviewMessage?: string): Promise<void> {
    const { error } = await this.supabase
      .from('edit_requests')
      .update({
        status,
        reviewedBy,
        reviewedAt: new Date().toISOString(),
        reviewMessage
      })
      .eq('id', requestId);
    
    if (error) this.handleDbError(error, 'update edit request');
  }

  async getQuizByAccessCode(accessCode: string): Promise<Quiz | null> {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('*')
      .eq('accessCode', accessCode)
      .eq('isPublic', false) // Only allow access code for private quizzes
      .maybeSingle();
    
    if (error) this.handleDbError(error, 'fetch quiz by access code');
    
    return data ? this.mapQuizFromDb(data) : null;
  }

  async getFolderByAccessCode(accessCode: string): Promise<QuizFolder | null> {
    const { data, error } = await this.supabase
      .from('quiz_folders')
      .select('*')
      .eq('accessCode', accessCode)
      .eq('isPublic', false) // Only allow access code for private folders
      .maybeSingle();
    
    if (error) this.handleDbError(error, 'fetch folder by access code');
    
    return data ? this.mapFolderFromDb(data) : null;
  }

  // Get ALL chat groups (for access code lookup)
  async getAllChatGroups(): Promise<ChatGroup[]> {
    console.log('🔍 Getting ALL chat groups for access code lookup...');
    
    try {
      const { data: allData, error: allError } = await this.supabase
        .from('chat_groups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (allError) {
        console.error('❌ Error fetching all chat groups:', allError);
        throw allError;
      }
      
      console.log('📊 Raw ALL chat groups from DB:', {
        count: allData?.length || 0,
        groupsWithAccessCodes: allData?.filter(d => d.access_code).map(d => ({
          id: d.id,
          name: d.name,
          access_code: d.access_code,
          is_private: d.is_private
        })) || []
      });
      
      const groups = (allData || []).map(this.mapChatGroupFromDb.bind(this));
      console.log('💬 Final mapped ALL chat groups:', {
        count: groups.length,
        groupsWithAccessCodes: groups.filter(g => g.accessCode).map(g => ({
          id: g.id,
          name: g.name,
          accessCode: g.accessCode,
          isPrivate: g.isPrivate
        }))
      });
      
      return groups;
      
    } catch (error) {
      console.error('❌ getAllChatGroups failed:', error);
      return [];
    }
  }

  // Chat operations
  async getChatGroups(): Promise<ChatGroup[]> {
    if (!this.currentUserId) {

      return [];
    }
    

    
    try {
      // Get current user info to check different ID formats
      const currentUser = await this.getCurrentUser();
      const userIdentifiers = [this.currentUserId];
      if (currentUser?.username) {
        userIdentifiers.push(currentUser.username);
      }
      

      
      // Get all groups first and filter manually for better debugging
      const { data: allData, error: allError } = await this.supabase
        .from('chat_groups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (allError) {

        throw allError;
      }
      

      
      // Filter manually to handle different ID formats
      const filteredData = (allData || []).filter(group => {
        // Check if user is creator
        const isCreator = userIdentifiers.includes(group.creator);
        
        // Check if user is in members array
        const isMember = group.members && userIdentifiers.some(id => 
          group.members.includes(id)
        );
        
        console.log('Group access check:', {
          creator: group.creator,
          members: group.members,
          isCreator,
          isMember,
          userIds: userIdentifiers
        });
        
        return isCreator || isMember;
      });
      

      
      const groups = filteredData.map(this.mapChatGroupFromDb.bind(this));

      
      return groups;
      
    } catch (error) {

      // Don't throw here, return empty array for graceful degradation
      return [];
    }
  }

  async saveChatGroup(group: ChatGroup): Promise<void> {
    try {
      const groupData = this.mapChatGroupToDb(group);

      
      // Ensure members array is properly formatted as UUID array
      if (groupData.members && Array.isArray(groupData.members)) {

      }
      
      const { data, error } = await this.supabase
        .from('chat_groups')
        .insert(groupData)
        .select('*');
      
      if (error) {
        console.error('Chat group creation error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      

      
      // Verify it was actually saved by reading it back
      const { data: verifyData, error: verifyError } = await this.supabase
        .from('chat_groups')
        .select('*')
        .eq('id', group.id)
        .single();
      
      if (verifyError) {

      } else {

      }
      
    } catch (error) {

      this.handleDbError(error, 'save chat group');
    }
  }

  async updateChatGroup(group: ChatGroup): Promise<void> {
    const { error } = await this.supabase
      .from('chat_groups')
      .update(this.mapChatGroupToDb(group))
      .eq('id', group.id);
    
    if (error) this.handleDbError(error, 'update chat group');
  }

  async deleteChatGroup(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('chat_groups')
      .delete()
      .eq('id', id);
    
    if (error) this.handleDbError(error, 'delete chat group');
  }

  async getChatMessages(groupId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('group_id', groupId) // Fix column name
      .order('timestamp', { ascending: true });
    
    if (error) this.handleDbError(error, 'fetch chat messages');
    
    return (data || []).map(this.mapChatMessageFromDb);
  }

  async saveChatMessage(message: ChatMessage): Promise<void> {
    const { error } = await this.supabase
      .from('chat_messages')
      .insert(this.mapChatMessageToDb(message));
    
    if (error) this.handleDbError(error, 'save chat message');
  }

  async deleteChatMessage(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('chat_messages')
      .delete()
      .eq('id', id);
    
    if (error) this.handleDbError(error, 'delete chat message');
  }

  private mapChatGroupFromDb(data: any): ChatGroup {
    console.log('🔍 Mapping chat group from DB:', {
      id: data.id,
      name: data.name,
      creator: data.creator,
      members: data.members,
      membersType: typeof data.members,
      isArray: Array.isArray(data.members),
      created_at: data.created_at,
      is_private: data.is_private,
      availableFields: Object.keys(data)
    });
    
    // Ensure members is always an array
    let members = data.members;
    if (!Array.isArray(members)) {
      console.warn('⚠️ Members field is not an array:', members);
      members = [];
    }
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      creator: data.creator,
      members: members,
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
      isPrivate: Boolean(data.is_private ?? false),
      accessCode: data.access_code || undefined,
      type: data.type || 'group',
    };
  }

  private mapChatGroupToDb(group: ChatGroup) {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      creator: group.creator,
      members: group.members,
      created_at: new Date(group.createdAt).toISOString(), // Map to snake_case
      is_private: group.isPrivate, // Map to snake_case
      access_code: group.accessCode, // Map to snake_case
      type: group.type,
    };
  }

  private mapChatMessageFromDb(data: any): ChatMessage {
    return {
      id: data.id,
      groupId: data.group_id || data.groupId, // Map from snake_case
      userId: data.user_id || data.userId, // Map from snake_case
      username: data.username,
      content: data.content,
      type: data.type,
      quizId: data.quiz_id || data.quizId, // Map from snake_case
      timestamp: new Date(data.timestamp).getTime(),
    };
  }

  private mapChatMessageToDb(message: ChatMessage) {
    return {
      id: message.id,
      group_id: message.groupId, // Map to snake_case
      user_id: message.userId, // Map to snake_case
      username: message.username,
      content: message.content,
      type: message.type,
      quiz_id: message.quizId, // Map to snake_case
      timestamp: new Date(message.timestamp).toISOString(),
    };
  }

  // Music operations
  async getMusicFiles(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('music_files')
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (error) {

        throw error;
      }
      
      return (data || []).map(file => ({
        id: file.id,
        title: file.title,
        filename: file.filename,
        uploadedBy: file.uploaded_by || file.uploadedBy,
        uploaderName: file.uploader_name || file.uploaderName,
        showUploaderName: file.show_uploader_name || file.showUploaderName,
        uploadedAt: new Date(file.uploaded_at || file.uploadedAt).getTime(),
        duration: file.duration,
        fileSize: file.file_size || file.fileSize,
        filePath: file.file_path || file.filePath,
        mimeType: file.mime_type || file.mimeType,
        url: file.file_path || file.filePath // Add url property for compatibility with existing code
      }));
    } catch (error) {

      return [];
    }
  }

  async saveMusicFile(musicFile: any, file: File): Promise<void> {
    try {
      // Upload file to storage bucket
      const fileName = `${musicFile.id}-${file.name}`;
      
      // Note: music-files bucket must be created manually in Supabase Dashboard
      console.log('🎵 Uploading to music-files bucket...');
      
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('music-files')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });
      
      console.log('🎵 Storage upload result:', { uploadData, uploadError });

      if (uploadError) {
        console.error('❌ Storage upload failed:', {
          error: uploadError,
          fileName,
          bucketName: 'music-files',
          fileSize: file.size,
          fileType: file.type
        });
        
        // Provide specific error messages based on error type
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error(`Storage bucket 'music-files' not found. Please create it in Supabase Dashboard: Storage > New bucket > Name: "music-files" > Public: ✅`);
        } else if (uploadError.message?.includes('row-level security policy') || uploadError.message?.includes('RLS')) {
          throw new Error(`Storage permissions blocked upload. Run the bucket fix SQL: tmp_rovodev_music_bucket_fix.sql`);
        } else if (uploadError.message?.includes('not allowed')) {
          throw new Error('File upload not allowed. Check storage bucket policies or file type.');
        } else if (uploadError.message?.includes('413') || uploadError.message?.includes('too large')) {
          throw new Error('File too large. Maximum size is 50MB.');
        } else {
          throw new Error(`Music upload failed: ${uploadError.message}`);
        }
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('music-files')
        .getPublicUrl(fileName);

      // Save metadata to database - match exact schema structure (snake_case)
      const dbData = {
        id: musicFile.id,
        title: musicFile.title,
        filename: musicFile.filename,
        uploaded_by: musicFile.uploadedBy, // Map to snake_case
        uploader_name: musicFile.uploaderName, // Map to snake_case
        show_uploader_name: musicFile.showUploaderName, // Map to snake_case
        uploaded_at: new Date(musicFile.uploadedAt).toISOString(), // Map to snake_case
        duration: musicFile.duration,
        file_size: musicFile.fileSize, // Map to snake_case
        file_path: urlData.publicUrl, // Map to snake_case
        mime_type: file.type // Map to snake_case
      };

      const { error: dbError } = await this.supabase
        .from('music_files')
        .insert(dbData);

      if (dbError) {

        // Clean up uploaded file if database save fails
        await this.supabase.storage
          .from('music-files')
          .remove([`public/${fileName}`]);
        throw dbError;
      }


    } catch (error) {

      throw error;
    }
  }

  async deleteMusicFile(id: string): Promise<void> {
    try {
      // Get file info first
      const { data: fileData, error: fetchError } = await this.supabase
        .from('music_files')
        .select('file_path')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete from database
      const { error: dbError } = await this.supabase
        .from('music_files')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Delete from storage
      if (fileData?.file_path) {
        const { error: storageError } = await this.supabase.storage
          .from('music-files')
          .remove([fileData.file_path]);

        if (storageError) {

        }
      }


    } catch (error) {

      throw error;
    }
  }
}
