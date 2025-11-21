import { IStorageDriver } from "./IStorageDriver";
import { Quiz, QuizAttempt, User, QuizFolder, ChatGroup, ChatMessage } from "@/types/quiz";

/**
 * LocalStorage Driver Implementation
 * Uses browser localStorage for data persistence
 */
export class LocalStorageDriver implements IStorageDriver {
  private readonly STORAGE_KEYS = {
    USERS: "quiz_users",
    QUIZZES: "quiz_quizzes",
    ATTEMPTS: "quiz_attempts",
    CURRENT_USER: "quiz_current_user",
    FOLDERS: "quiz_folders",
  };

  // User operations
  async getUsers(): Promise<User[]> {
    const data = localStorage.getItem(this.STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  async saveUser(user: User): Promise<void> {
    const users = await this.getUsers();
    users.push(user);
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  async getCurrentUser(): Promise<User | null> {
    const data = localStorage.getItem(this.STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }

  async setCurrentUser(user: User | null): Promise<void> {
    if (user) {
      localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
    }
  }

  // Quiz operations
  async getQuizzes(): Promise<Quiz[]> {
    const data = localStorage.getItem(this.STORAGE_KEYS.QUIZZES);
    return data ? JSON.parse(data) : [];
  }

  async saveQuiz(quiz: Quiz): Promise<void> {
    const quizzes = await this.getQuizzes();
    quizzes.push(quiz);
    localStorage.setItem(this.STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    const quizzes = await this.getQuizzes();
    return quizzes.find((q) => q.id === id) || null;
  }

  async updateQuiz(quiz: Quiz): Promise<void> {
    const quizzes = await this.getQuizzes();
    const index = quizzes.findIndex((q) => q.id === quiz.id);
    if (index !== -1) {
      quizzes[index] = quiz;
      localStorage.setItem(this.STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
    }
  }

  async deleteQuiz(id: string): Promise<void> {
    const quizzes = await this.getQuizzes();
    const filtered = quizzes.filter((q) => q.id !== id);
    localStorage.setItem(this.STORAGE_KEYS.QUIZZES, JSON.stringify(filtered));
  }

  // Attempt operations
  async getAttempts(): Promise<QuizAttempt[]> {
    const data = localStorage.getItem(this.STORAGE_KEYS.ATTEMPTS);
    return data ? JSON.parse(data) : [];
  }

  async saveAttempt(attempt: QuizAttempt): Promise<void> {
    const attempts = await this.getAttempts();
    attempts.push(attempt);
    localStorage.setItem(this.STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
  }

  async getUserAttempts(userId: string): Promise<QuizAttempt[]> {
    const attempts = await this.getAttempts();
    return attempts.filter((a) => a.userId === userId);
  }

  async getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
    const attempts = await this.getAttempts();
    return attempts.filter((a) => a.quizId === quizId);
  }

  // Folder operations
  async getFolders(): Promise<QuizFolder[]> {
    const data = localStorage.getItem(this.STORAGE_KEYS.FOLDERS);
    return data ? JSON.parse(data) : [];
  }

  async saveFolder(folder: QuizFolder): Promise<void> {
    const folders = await this.getFolders();
    folders.push(folder);
    localStorage.setItem(this.STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  }

  async updateFolder(folder: QuizFolder): Promise<void> {
    const folders = await this.getFolders();
    const index = folders.findIndex((f) => f.id === folder.id);
    if (index !== -1) {
      folders[index] = folder;
      localStorage.setItem(this.STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    }
  }

  async deleteFolder(id: string): Promise<void> {
    const folders = await this.getFolders();
    const filtered = folders.filter((f) => f.id !== id);
    localStorage.setItem(this.STORAGE_KEYS.FOLDERS, JSON.stringify(filtered));
  }

  async renameFolder(id: string, newName: string): Promise<void> {
    const folders = await this.getFolders();
    const folder = folders.find((f) => f.id === id);
    if (folder) {
      const oldPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
      const newPath = folder.parentPath ? `${folder.parentPath}/${newName}` : newName;
      
      folder.name = newName;
      localStorage.setItem(this.STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      
      // Update all quizzes and folders that reference this path
      const quizzes = await this.getQuizzes();
      quizzes.forEach((quiz) => {
        if (quiz.folderPath?.startsWith(oldPath)) {
          quiz.folderPath = quiz.folderPath.replace(oldPath, newPath);
        }
      });
      localStorage.setItem(this.STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
      
      folders.forEach((f) => {
        if (f.parentPath?.startsWith(oldPath)) {
          f.parentPath = f.parentPath.replace(oldPath, newPath);
        }
      });
      localStorage.setItem(this.STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    }
  }

  // Access code operations
  async getQuizByAccessCode(accessCode: string): Promise<Quiz | null> {
    const quizzes = await this.getQuizzes();
    return quizzes.find(q => q.accessCode === accessCode) || null;
  }

  async getFolderByAccessCode(accessCode: string): Promise<QuizFolder | null> {
    const folders = await this.getFolders();
    return folders.find(f => f.accessCode === accessCode) || null;
  }

  // Chat operations
  async getChatGroups(): Promise<ChatGroup[]> {
    const stored = localStorage.getItem('quiz_chat_groups');
    const groups = stored ? JSON.parse(stored) : [];
    // Ensure all groups have the type field for backward compatibility
    return groups.map((group: any) => ({
      ...group,
      type: group.type || 'group'
    }));
  }

  async saveChatGroup(group: ChatGroup): Promise<void> {
    const groups = await this.getChatGroups();
    const existingIndex = groups.findIndex(g => g.id === group.id);
    
    if (existingIndex >= 0) {
      groups[existingIndex] = group;
    } else {
      groups.push(group);
    }
    
    localStorage.setItem('quiz_chat_groups', JSON.stringify(groups));
  }

  async updateChatGroup(group: ChatGroup): Promise<void> {
    await this.saveChatGroup(group);
  }

  async deleteChatGroup(id: string): Promise<void> {
    const groups = await this.getChatGroups();
    const filtered = groups.filter(g => g.id !== id);
    localStorage.setItem('quiz_chat_groups', JSON.stringify(filtered));
    
    // Also delete all messages for this group
    const messages = await this.getChatMessages(id);
    for (const message of messages) {
      await this.deleteChatMessage(message.id);
    }
  }

  async getChatMessages(groupId: string): Promise<ChatMessage[]> {
    const stored = localStorage.getItem('quiz_chat_messages');
    const allMessages: ChatMessage[] = stored ? JSON.parse(stored) : [];
    return allMessages.filter(m => m.groupId === groupId);
  }

  async saveChatMessage(message: ChatMessage): Promise<void> {
    const stored = localStorage.getItem('quiz_chat_messages');
    const messages: ChatMessage[] = stored ? JSON.parse(stored) : [];
    
    const existingIndex = messages.findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
      messages[existingIndex] = message;
    } else {
      messages.push(message);
    }
    
    localStorage.setItem('quiz_chat_messages', JSON.stringify(messages));
  }

  async deleteChatMessage(id: string): Promise<void> {
    const stored = localStorage.getItem('quiz_chat_messages');
    const messages: ChatMessage[] = stored ? JSON.parse(stored) : [];
    const filtered = messages.filter(m => m.id !== id);
    localStorage.setItem('quiz_chat_messages', JSON.stringify(filtered));
  }

  // Music operations
  async getMusicFiles(): Promise<any[]> {
    const stored = localStorage.getItem('quiz_music_files');
    return stored ? JSON.parse(stored) : [];
  }

  async saveMusicFile(musicFile: any, file: File): Promise<void> {
    // For local storage, we'll store the file as a data URL
    const dataUrl = await this.fileToDataUrl(file);
    const musicFileWithUrl = {
      ...musicFile,
      url: dataUrl
    };

    const stored = localStorage.getItem('quiz_music_files');
    const musicFiles = stored ? JSON.parse(stored) : [];
    
    const existingIndex = musicFiles.findIndex((f: any) => f.id === musicFile.id);
    if (existingIndex >= 0) {
      musicFiles[existingIndex] = musicFileWithUrl;
    } else {
      musicFiles.push(musicFileWithUrl);
    }
    
    localStorage.setItem('quiz_music_files', JSON.stringify(musicFiles));
  }

  async deleteMusicFile(id: string): Promise<void> {
    const stored = localStorage.getItem('quiz_music_files');
    const musicFiles = stored ? JSON.parse(stored) : [];
    const filtered = musicFiles.filter((f: any) => f.id !== id);
    localStorage.setItem('quiz_music_files', JSON.stringify(filtered));
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
