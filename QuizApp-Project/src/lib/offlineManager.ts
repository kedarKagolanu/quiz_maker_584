/**
 * Offline Manager for Quiz App
 * Provides essential offline functionality for quiz browsing and taking
 */

interface OfflineQuizData {
  id: string;
  title: string;
  description: string;
  questions: any[];
  creator: string;
  isPublic: boolean;
  tags: string[];
  cachedAt: number;
  folderPath?: string;
}

interface OfflineFolder {
  id: string;
  name: string;
  parentPath?: string;
  description?: string;
  tags: string[];
  cachedAt: number;
}

class OfflineManager {
  private dbName = 'QuizAppOffline';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[Offline] IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Quiz data store
        if (!db.objectStoreNames.contains('quizzes')) {
          const quizStore = db.createObjectStore('quizzes', { keyPath: 'id' });
          quizStore.createIndex('cachedAt', 'cachedAt');
          quizStore.createIndex('creator', 'creator');
          quizStore.createIndex('isPublic', 'isPublic');
        }
        
        // Folders store
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('cachedAt', 'cachedAt');
          folderStore.createIndex('parentPath', 'parentPath');
        }
        
        // App state store
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState', { keyPath: 'key' });
        }
        
        console.log('[Offline] Database upgraded to version', this.dbVersion);
      };
    });
  }

  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  // Cache quiz data for offline access
  async cacheQuiz(quiz: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['quizzes'], 'readwrite');
    const store = transaction.objectStore('quizzes');
    
    const offlineQuiz: OfflineQuizData = {
      id: quiz.id,
      title: quiz.title || 'Untitled Quiz',
      description: quiz.description || '',
      questions: quiz.questions || [],
      creator: quiz.creator || '',
      isPublic: quiz.isPublic || false,
      tags: quiz.tags || [],
      folderPath: quiz.folderPath,
      cachedAt: Date.now()
    };
    
    await this.promiseifyRequest(store.put(offlineQuiz));
    console.log('[Offline] Cached quiz:', quiz.title);
  }

  // Cache multiple quizzes
  async cacheQuizzes(quizzes: any[]): Promise<void> {
    for (const quiz of quizzes.slice(0, 50)) { // Limit to 50 most recent
      try {
        await this.cacheQuiz(quiz);
      } catch (error) {
        console.warn('[Offline] Failed to cache quiz:', quiz.id, error);
      }
    }
  }

  // Cache folder structure
  async cacheFolder(folder: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['folders'], 'readwrite');
    const store = transaction.objectStore('folders');
    
    const offlineFolder: OfflineFolder = {
      id: folder.id,
      name: folder.name,
      parentPath: folder.parentPath,
      description: folder.description,
      tags: folder.tags || [],
      cachedAt: Date.now()
    };
    
    await this.promiseifyRequest(store.put(offlineFolder));
    console.log('[Offline] Cached folder:', folder.name);
  }

  // Get cached quizzes
  async getCachedQuizzes(): Promise<OfflineQuizData[]> {
    await this.init();
    if (!this.db) return [];

    const transaction = this.db.transaction(['quizzes'], 'readonly');
    const store = transaction.objectStore('quizzes');
    const request = store.getAll();
    
    const quizzes = await this.promiseifyRequest(request);
    return quizzes || [];
  }

  // Get specific cached quiz
  async getCachedQuiz(quizId: string): Promise<OfflineQuizData | null> {
    await this.init();
    if (!this.db) return null;

    const transaction = this.db.transaction(['quizzes'], 'readonly');
    const store = transaction.objectStore('quizzes');
    const request = store.get(quizId);
    
    return this.promiseifyRequest(request);
  }

  // Get cached folders
  async getCachedFolders(): Promise<OfflineFolder[]> {
    await this.init();
    if (!this.db) return [];

    const transaction = this.db.transaction(['folders'], 'readonly');
    const store = transaction.objectStore('folders');
    const request = store.getAll();
    
    const folders = await this.promiseifyRequest(request);
    return folders || [];
  }

  // Store app state (like last sync time)
  async setAppState(key: string, value: any): Promise<void> {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction(['appState'], 'readwrite');
    const store = transaction.objectStore('appState');
    
    await this.promiseifyRequest(store.put({ key, value, timestamp: Date.now() }));
  }

  // Get app state
  async getAppState(key: string): Promise<any> {
    await this.init();
    if (!this.db) return null;

    const transaction = this.db.transaction(['appState'], 'readonly');
    const store = transaction.objectStore('appState');
    const request = store.get(key);
    
    const result = await this.promiseifyRequest(request);
    return result?.value || null;
  }

  // Clear old cached data
  async clearExpiredCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    await this.init();
    if (!this.db) return;

    const cutoff = Date.now() - maxAge;
    const transaction = this.db.transaction(['quizzes', 'folders'], 'readwrite');
    
    const quizStore = transaction.objectStore('quizzes');
    const folderStore = transaction.objectStore('folders');
    
    // Clear expired quizzes
    const quizIndex = quizStore.index('cachedAt');
    const quizRange = IDBKeyRange.upperBound(cutoff);
    const quizRequest = quizIndex.openCursor(quizRange);
    
    return new Promise((resolve, reject) => {
      let deletedCount = 0;
      
      quizRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          // Now clear expired folders
          const folderIndex = folderStore.index('cachedAt');
          const folderRequest = folderIndex.openCursor(quizRange);
          
          folderRequest.onsuccess = (event) => {
            const folderCursor = (event.target as IDBRequest).result;
            if (folderCursor) {
              folderCursor.delete();
              deletedCount++;
              folderCursor.continue();
            } else {
              console.log(`[Offline] Cleared ${deletedCount} expired items`);
              resolve();
            }
          };
          folderRequest.onerror = () => reject(folderRequest.error);
        }
      };
      quizRequest.onerror = () => reject(quizRequest.error);
    });
  }

  // Get storage usage statistics
  async getStorageStats(): Promise<{ used: number; quota: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        return {
          used,
          quota,
          percentage: quota > 0 ? Math.round((used / quota) * 100) : 0
        };
      } catch (error) {
        console.warn('[Offline] Storage estimate failed:', error);
      }
    }
    return { used: 0, quota: 0, percentage: 0 };
  }

  // Check if we have offline data available
  async hasOfflineData(): Promise<boolean> {
    const quizzes = await this.getCachedQuizzes();
    return quizzes.length > 0;
  }

  private promiseifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineManager = new OfflineManager();

// Auto-initialize and setup
if (typeof window !== 'undefined') {
  // Initialize offline manager
  offlineManager.init().catch(console.error);
  
  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('[Offline] Back online - sync available');
  });
  
  window.addEventListener('offline', () => {
    console.log('[Offline] Gone offline - using cached data');
  });
  
  // Cleanup old cache periodically (every 4 hours)
  setInterval(() => {
    offlineManager.clearExpiredCache().catch(console.error);
  }, 4 * 60 * 60 * 1000);
}