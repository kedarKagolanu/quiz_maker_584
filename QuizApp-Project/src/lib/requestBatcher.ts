/**
 * Request Batching System for Quiz Application
 * Combines multiple database operations to reduce API calls
 */

interface BatchRequest {
  id: string;
  type: 'quiz' | 'user' | 'attempt' | 'folder' | 'chat';
  operation: 'get' | 'create' | 'update' | 'delete';
  data?: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface BatchConfig {
  batchSize: number;
  batchDelay: number;
}

class RequestBatcher {
  private batches: Map<string, BatchRequest[]> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private config: BatchConfig;

  constructor(config: BatchConfig = { batchSize: 10, batchDelay: 50 }) {
    this.config = config;
  }

  /**
   * Add request to batch and return promise
   */
  async batch<T>(
    batchKey: string,
    request: Omit<BatchRequest, 'resolve' | 'reject'>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const batchRequest: BatchRequest = {
        ...request,
        resolve,
        reject,
      };

      // Add to batch
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, []);
      }
      
      this.batches.get(batchKey)!.push(batchRequest);

      // Clear existing timeout
      if (this.timeouts.has(batchKey)) {
        clearTimeout(this.timeouts.get(batchKey)!);
      }

      // Set new timeout or execute immediately if batch is full
      const currentBatch = this.batches.get(batchKey)!;
      if (currentBatch.length >= this.config.batchSize) {
        this.executeBatch(batchKey);
      } else {
        const timeout = setTimeout(() => {
          this.executeBatch(batchKey);
        }, this.config.batchDelay);
        
        this.timeouts.set(batchKey, timeout);
      }
    });
  }

  /**
   * Execute batched requests
   */
  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.length === 0) return;

    // Clear batch and timeout
    this.batches.set(batchKey, []);
    if (this.timeouts.has(batchKey)) {
      clearTimeout(this.timeouts.get(batchKey)!);
      this.timeouts.delete(batchKey);
    }

    console.log(`🔥 Executing batch: ${batchKey} with ${batch.length} requests`);

    try {
      // Group by operation type for efficient processing
      const grouped = this.groupBatchRequests(batch);
      
      // Execute grouped operations
      await Promise.all([
        this.executeGetOperations(grouped.get),
        this.executeCreateOperations(grouped.create),
        this.executeUpdateOperations(grouped.update),
        this.executeDeleteOperations(grouped.delete),
      ]);
    } catch (error) {
      console.error(`❌ Batch execution failed for ${batchKey}:`, error);
      // Reject all requests in batch
      batch.forEach(request => request.reject(error));
    }
  }

  /**
   * Group batch requests by operation type
   */
  private groupBatchRequests(batch: BatchRequest[]): Map<string, BatchRequest[]> {
    const grouped = new Map<string, BatchRequest[]>();
    
    batch.forEach(request => {
      const key = request.operation;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(request);
    });

    return grouped;
  }

  /**
   * Execute GET operations in batch
   */
  private async executeGetOperations(requests?: BatchRequest[]): Promise<void> {
    if (!requests || requests.length === 0) return;

    // Group GET requests by type for bulk queries
    const byType = new Map<string, BatchRequest[]>();
    requests.forEach(req => {
      if (!byType.has(req.type)) {
        byType.set(req.type, []);
      }
      byType.get(req.type)!.push(req);
    });

    // Execute bulk gets
    await Promise.all(Array.from(byType.entries()).map(async ([type, reqs]) => {
      try {
        const ids = reqs.map(r => r.id).filter(Boolean);
        const results = await this.bulkGet(type, ids);
        
        // Resolve individual requests
        reqs.forEach((req, index) => {
          req.resolve(results[index] || null);
        });
      } catch (error) {
        reqs.forEach(req => req.reject(error));
      }
    }));
  }

  /**
   * Execute CREATE operations in batch
   */
  private async executeCreateOperations(requests?: BatchRequest[]): Promise<void> {
    if (!requests || requests.length === 0) return;

    try {
      const items = requests.map(r => r.data);
      const results = await this.bulkCreate(requests[0].type, items);
      
      requests.forEach((req, index) => {
        req.resolve(results[index]);
      });
    } catch (error) {
      requests.forEach(req => req.reject(error));
    }
  }

  /**
   * Execute UPDATE operations in batch
   */
  private async executeUpdateOperations(requests?: BatchRequest[]): Promise<void> {
    if (!requests || requests.length === 0) return;

    try {
      const updates = requests.map(r => ({ id: r.id, data: r.data }));
      const results = await this.bulkUpdate(requests[0].type, updates);
      
      requests.forEach((req, index) => {
        req.resolve(results[index]);
      });
    } catch (error) {
      requests.forEach(req => req.reject(error));
    }
  }

  /**
   * Execute DELETE operations in batch
   */
  private async executeDeleteOperations(requests?: BatchRequest[]): Promise<void> {
    if (!requests || requests.length === 0) return;

    try {
      const ids = requests.map(r => r.id);
      await this.bulkDelete(requests[0].type, ids);
      
      requests.forEach(req => req.resolve(true));
    } catch (error) {
      requests.forEach(req => req.reject(error));
    }
  }

  /**
   * Bulk database operations (to be implemented by storage driver)
   */
  private async bulkGet(type: string, ids: string[]): Promise<any[]> {
    // This will be implemented in the storage driver
    throw new Error(`Bulk get not implemented for type: ${type}`);
  }

  private async bulkCreate(type: string, items: any[]): Promise<any[]> {
    // This will be implemented in the storage driver
    throw new Error(`Bulk create not implemented for type: ${type}`);
  }

  private async bulkUpdate(type: string, updates: Array<{ id: string; data: any }>): Promise<any[]> {
    // This will be implemented in the storage driver
    throw new Error(`Bulk update not implemented for type: ${type}`);
  }

  private async bulkDelete(type: string, ids: string[]): Promise<void> {
    // This will be implemented in the storage driver
    throw new Error(`Bulk delete not implemented for type: ${type}`);
  }

  /**
   * Flush all pending batches
   */
  async flush(): Promise<void> {
    const batchKeys = Array.from(this.batches.keys());
    await Promise.all(batchKeys.map(key => this.executeBatch(key)));
  }
}

// Global batcher instance
export const globalBatcher = new RequestBatcher({
  batchSize: 10,
  batchDelay: 50 // 50ms delay
});

// Convenience functions for common operations
export const batchQuizGet = (id: string) => 
  globalBatcher.batch('quiz-get', { id, type: 'quiz', operation: 'get' });

export const batchQuizCreate = (data: any) => 
  globalBatcher.batch('quiz-create', { id: '', type: 'quiz', operation: 'create', data });

export const batchQuizUpdate = (id: string, data: any) => 
  globalBatcher.batch('quiz-update', { id, type: 'quiz', operation: 'update', data });

export const batchQuizDelete = (id: string) => 
  globalBatcher.batch('quiz-delete', { id, type: 'quiz', operation: 'delete' });