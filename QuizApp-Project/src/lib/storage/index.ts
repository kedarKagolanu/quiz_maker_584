import { StorageService } from "./StorageService";
import { LocalStorageDriver } from "./LocalStorageDriver";
import { SupabaseDriver } from "./SupabaseDriver";
import { BatchedSupabaseDriver } from './BatchedSupabaseDriver';
import { CachedStorageDriver } from "../cache/CachedStorageDriver";

/**
 * Storage Module - Driver-based storage abstraction
 * 
 * This module provides a clean interface for data persistence that can be
 * swapped between different storage backends (localStorage, PostgreSQL, MySQL, etc.)
 * without changing application code.
 * 
 * Usage:
 *   import { storage } from "@/lib/storage";
 *   const users = await storage.getUsers();
 * 
 * Configuration:
 *   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables
 *   to use Supabase/PostgreSQL backend. Otherwise, localStorage is used.
 */

// Determine which driver to use based on environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Singleton pattern to prevent multiple driver instances
let driverInstance: any = null;

function createDriver() {
  if (driverInstance) return driverInstance;
  
  if (supabaseUrl && supabaseAnonKey) {
    // Only log in development mode for security
    // Connecting to fresh Supabase project with batching enabled
    driverInstance = new BatchedSupabaseDriver(supabaseUrl, supabaseAnonKey);
  } else {
    // Supabase credentials not found, using LocalStorage
    driverInstance = new LocalStorageDriver();
  }
  
  return driverInstance;
}

const driver = createDriver();

// Create StorageService wrapper first, then cache it
const storageService = new StorageService(driver);
export const storage = new CachedStorageDriver(storageService);

// Export types and classes for advanced usage
export { StorageService } from "./StorageService";
export { LocalStorageDriver } from "./LocalStorageDriver";
export { SupabaseDriver } from "./SupabaseDriver";
export type { IStorageDriver } from "./IStorageDriver";
