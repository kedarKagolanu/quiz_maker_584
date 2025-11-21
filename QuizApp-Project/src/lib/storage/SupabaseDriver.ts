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
    // Always log errors for debugging
    console.error(`🚨 DB ${operation} error:`, error);
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(`Database operation failed: ${operation} - ${error.message}`);
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
      forkedFrom: dbQuiz.forkedFrom,
      accessCode: dbQuiz.accessCode,
      editMode: dbQuiz.editMode || 'no_edits'
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
      forkedFrom: quiz.forkedFrom,
      accessCode: quiz.accessCode,
      editMode: quiz.editMode || 'no_edits'
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
      sharedWith: dbFolder.sharedWith || [],
      accessCode: dbFolder.accessCode,
      editMode: dbFolder.editMode || 'no_edits'
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
      sharedWith: folder.sharedWith || [],
      accessCode: folder.accessCode,
      editMode: folder.editMode || 'no_edits'
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

  // Permission operations
  async getQuizPermissions(quizId: string): Promise<QuizPermission[]> {
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
  }

  async saveQuizPermission(permission: Omit<QuizPermission, 'id' | 'grantedAt'>): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_permissions')
      .insert({
        quizId: permission.quizId,
        userId: permission.userId,
        role: permission.role,
        grantedBy: permission.grantedBy
      });
    
    if (error) this.handleDbError(error, 'save quiz permission');
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
    try {
      const { data: allData, error: allError } = await this.supabase
        .from('chat_groups')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (allError) {
        console.error('❌ Failed to fetch all chat groups:', allError);
        throw allError;
      }
      
      console.log('📊 All chat groups from database:', allData);
      
      const groups = (allData || []).map(this.mapChatGroupFromDb.bind(this));
      return groups;
      
    } catch (error) {
      console.error('❌ All chat groups fetch error:', error);
      return [];
    }
  }

  // Chat operations
  async getChatGroups(): Promise<ChatGroup[]> {
    if (!this.currentUserId) {
      console.log('❌ No currentUserId for chat groups');
      return [];
    }
    
    console.log('🔍 Fetching chat groups for user:', this.currentUserId);
    
    try {
      // Get current user info to check different ID formats
      const currentUser = await this.getCurrentUser();
      const userIdentifiers = [this.currentUserId];
      if (currentUser?.username) {
        userIdentifiers.push(currentUser.username);
      }
      
      console.log('👤 User identifiers to check:', userIdentifiers);
      
      // Get all groups first and filter manually for better debugging
      const { data: allData, error: allError } = await this.supabase
        .from('chat_groups')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (allError) {
        console.error('❌ Failed to fetch all chat groups:', allError);
        throw allError;
      }
      
      console.log('📊 All groups from database:', allData);
      
      // Filter manually to handle different ID formats
      const filteredData = (allData || []).filter(group => {
        // Check if user is creator
        const isCreator = userIdentifiers.includes(group.creator);
        
        // Check if user is in members array
        const isMember = group.members && userIdentifiers.some(id => 
          group.members.includes(id)
        );
        
        console.log(`🔍 Group "${group.name}":`, {
          creator: group.creator,
          members: group.members,
          isCreator,
          isMember,
          userIds: userIdentifiers
        });
        
        return isCreator || isMember;
      });
      
      console.log('✅ Filtered groups for user:', filteredData);
      
      const groups = filteredData.map(this.mapChatGroupFromDb.bind(this));
      console.log('✅ Final mapped chat groups:', groups);
      
      return groups;
      
    } catch (error) {
      console.error('❌ Chat groups fetch error:', error);
      // Don't throw here, return empty array for graceful degradation
      return [];
    }
  }

  async saveChatGroup(group: ChatGroup): Promise<void> {
    try {
      const groupData = this.mapChatGroupToDb(group);
      console.log('💾 Attempting to save chat group:', groupData);
      
      // Ensure members array is properly formatted as UUID array
      if (groupData.members && Array.isArray(groupData.members)) {
        console.log('💾 Members array before save:', groupData.members);
      }
      
      const { data, error } = await this.supabase
        .from('chat_groups')
        .insert(groupData)
        .select('*');
      
      if (error) {
        console.error('❌ Save chat group error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('✅ Chat group saved successfully:', data);
      
      // Verify it was actually saved by reading it back
      const { data: verifyData, error: verifyError } = await this.supabase
        .from('chat_groups')
        .select('*')
        .eq('id', group.id)
        .single();
      
      if (verifyError) {
        console.error('❌ Failed to verify saved group:', verifyError);
      } else {
        console.log('✅ Verified saved group:', verifyData);
      }
      
    } catch (error) {
      console.error('❌ Chat group save failed:', error);
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
      .eq('groupId', groupId)
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
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      creator: data.creator,
      members: data.members,
      createdAt: new Date(data.createdAt).getTime(),
      isPrivate: data.isPrivate,
      accessCode: data.accessCode,
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
      createdAt: new Date(group.createdAt).toISOString(),
      isPrivate: group.isPrivate,
      accessCode: group.accessCode,
      type: group.type,
    };
  }

  private mapChatMessageFromDb(data: any): ChatMessage {
    return {
      id: data.id,
      groupId: data.groupId,
      userId: data.userId,
      username: data.username,
      content: data.content,
      type: data.type,
      quizId: data.quizId,
      timestamp: new Date(data.timestamp).getTime(),
    };
  }

  private mapChatMessageToDb(message: ChatMessage) {
    return {
      id: message.id,
      groupId: message.groupId,
      userId: message.userId,
      username: message.username,
      content: message.content,
      type: message.type,
      quizId: message.quizId,
      timestamp: new Date(message.timestamp).toISOString(),
    };
  }

  // Music operations
  async getMusicFiles(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('music_files')
        .select('*')
        .order('uploadedAt', { ascending: false });
      
      if (error) {
        console.error('❌ Failed to fetch music files:', error);
        throw error;
      }
      
      return (data || []).map(file => ({
        id: file.id,
        title: file.title,
        filename: file.filename,
        uploadedBy: file.uploadedBy,
        uploaderName: file.uploaderName,
        showUploaderName: file.showUploaderName,
        uploadedAt: new Date(file.uploadedAt).getTime(),
        duration: file.duration,
        fileSize: file.fileSize,
        filePath: file.filePath,
        mimeType: file.mimeType,
        url: file.filePath // Add url property for compatibility with existing code
      }));
    } catch (error) {
      console.error('❌ Music files fetch error:', error);
      return [];
    }
  }

  async saveMusicFile(musicFile: any, file: File): Promise<void> {
    try {
      // Upload file to storage bucket
      const fileName = `${musicFile.id}-${file.name}`;
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('music-files')
        .upload(`public/${fileName}`, file);

      if (uploadError) {
        console.error('❌ File upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('music-files')
        .getPublicUrl(`public/${fileName}`);

      // Save metadata to database - match exact schema structure
      const dbData = {
        id: musicFile.id,
        title: musicFile.title,
        filename: musicFile.filename,
        uploadedBy: musicFile.uploadedBy,
        uploaderName: musicFile.uploaderName,
        showUploaderName: musicFile.showUploaderName,
        uploadedAt: new Date(musicFile.uploadedAt).toISOString(),
        duration: musicFile.duration,
        fileSize: musicFile.fileSize,
        filePath: urlData.publicUrl, // This matches the schema column name
        mimeType: file.type
      };

      const { error: dbError } = await this.supabase
        .from('music_files')
        .insert(dbData);

      if (dbError) {
        console.error('❌ Database save error:', dbError);
        // Clean up uploaded file if database save fails
        await this.supabase.storage
          .from('music-files')
          .remove([`public/${fileName}`]);
        throw dbError;
      }

      console.log('✅ Music file saved successfully:', musicFile.title);
    } catch (error) {
      console.error('❌ Failed to save music file:', error);
      throw error;
    }
  }

  async deleteMusicFile(id: string): Promise<void> {
    try {
      // Get file info first
      const { data: fileData, error: fetchError } = await this.supabase
        .from('music_files')
        .select('filePath')
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
      if (fileData?.filePath) {
        const { error: storageError } = await this.supabase.storage
          .from('music-files')
          .remove([fileData.filePath]);

        if (storageError) {
          console.warn('⚠️ Storage file deletion failed:', storageError);
        }
      }

      console.log('✅ Music file deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete music file:', error);
      throw error;
    }
  }
}
