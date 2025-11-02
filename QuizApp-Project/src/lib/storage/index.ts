import { StorageService } from "./StorageService";
import { LocalStorageDriver } from "./LocalStorageDriver";
import { SupabaseDriver } from "./SupabaseDriver";

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

let driver;
if (supabaseUrl && supabaseAnonKey) {
  // Only log in development mode for security
  if (import.meta.env.DEV) {
    console.log("Using Supabase/PostgreSQL storage driver");
  }
  driver = new SupabaseDriver(supabaseUrl, supabaseAnonKey);
} else {
  if (import.meta.env.DEV) {
    console.log("Using localStorage storage driver (no database configured)");
  }
  driver = new LocalStorageDriver();
}

export const storage = new StorageService(driver);

// Export types and classes for advanced usage
export { StorageService } from "./StorageService";
export { LocalStorageDriver } from "./LocalStorageDriver";
export { SupabaseDriver } from "./SupabaseDriver";
export type { IStorageDriver } from "./IStorageDriver";
