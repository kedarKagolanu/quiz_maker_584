import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types/quiz";
import { createClient, Session } from "@supabase/supabase-js";

/**
 * Authentication Context
 * 
 * Manages user authentication state and profile data
 * 
 * Flow:
 * 1. User signs up/logs in through Supabase Auth
 * 2. AuthContext detects auth state change
 * 3. Loads user profile from 'profiles' table
 * 4. If profile doesn't exist, creates it automatically
 * 5. Checks if user has admin role
 * 6. Provides user data to entire app via React Context
 */

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  /**
   * Set up authentication state listeners
   * This runs once when the component mounts
   */
  useEffect(() => {
    if (!supabase) return;

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        
        if (session?.user) {
          // User logged in - load their profile
          await loadUserProfile(session.user.id, session.user);
          
          // Check if user is admin (use setTimeout to prevent RLS deadlock)
          setTimeout(() => {
            checkAdminStatus(session.user.id);
          }, 0);
        } else {
          // User logged out - clear state
          setUser(null);
          setIsAdmin(false);
        }
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user);
        
        setTimeout(() => {
          checkAdminStatus(session.user.id);
        }, 0);
      }
    });

    // Cleanup: unsubscribe when component unmounts
    return () => subscription.unsubscribe();
  }, []);

  /**
   * Load user profile from 'profiles' table
   * If profile doesn't exist, create it automatically
   * 
   * This ensures every authenticated user has a profile entry
   * 
   * @param userId - User's UUID from Supabase Auth
   * @param authUser - User object from Supabase Auth
   */
  const loadUserProfile = async (userId: string, authUser: any) => {
    if (!supabase) return;

    try {
      // Try to get existing profile from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Returns null if not found (doesn't throw error)

      if (error && error.code !== 'PGRST116') { 
        // PGRST116 = no rows returned (not an error)
        console.error('Error loading profile:', error);
      }

      if (profile) {
        // Profile exists in database - use it
        const newUser: User = {
          id: profile.id,
          username: profile.username,
          password: '', // Never stored in database
          createdAt: typeof profile.createdAt === 'string'
            ? new Date(profile.createdAt).getTime()
            : profile.createdAt,
          musicFiles: profile.musicFiles || [],
        };
        setUser(newUser);
        console.log('Profile loaded:', profile.username);
      } else {
        // Profile doesn't exist - create it
        console.log('Profile not found, creating new profile...');
        
        const username = authUser.user_metadata?.username 
          || authUser.email?.split('@')[0] 
          || `user_${userId.substring(0, 8)}`;
        
        const newProfile = {
          id: userId,
          username: username,
          createdAt: new Date().toISOString(),
          musicFiles: [],
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile);

        if (insertError) {
          console.error('Error creating profile:', insertError);
          // Continue anyway with temporary user object
        } else {
          console.log('Profile created successfully:', username);
        }

        // Set user state (regardless of insert success)
        const newUser: User = {
          id: userId,
          username: username,
          password: '',
          createdAt: Date.now(),
          musicFiles: [],
        };
        setUser(newUser);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      
      // Fallback: create temporary user from auth data
      const newUser: User = {
        id: userId,
        username: authUser.user_metadata?.username 
          || authUser.email?.split('@')[0] 
          || 'User',
        password: '',
        createdAt: new Date(authUser.created_at).getTime(),
        musicFiles: [],
      };
      setUser(newUser);
    }
  };

  /**
   * Check if user has admin role
   * Queries 'user_roles' table
   * 
   * @param userId - User's UUID
   */
  const checkAdminStatus = async (userId: string) => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('userId', userId) // Note: camelCase column name
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!error && data) {
        setIsAdmin(true);
        console.log('Admin role detected');
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  /**
   * Log in existing user
   * 
   * @param email - User's email
   * @param password - User's password
   * @returns Success status and optional error message
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { 
        success: false, 
        error: "Database not configured. Please enable Lovable Cloud." 
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Profile will be loaded by onAuthStateChange listener
      return { success: true };
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  /**
   * Sign up new user
   * 
   * Flow:
   * 1. Create auth user in Supabase Auth
   * 2. Database trigger automatically creates profile
   * 3. If trigger fails, loadUserProfile creates it manually
   * 4. User is logged in automatically if email confirmation disabled
   * 
   * @param email - User's email
   * @param password - User's password
   * @param username - Desired username
   * @returns Success status and optional error message
   */
  const signup = async (
    email: string, 
    password: string, 
    username: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { 
        success: false, 
        error: "Database not configured. Please enable Lovable Cloud." 
      };
    }

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: username, // Stored in user metadata
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return { 
          success: false, 
          error: "Please check your email to confirm your account" 
        };
      }

      // Profile will be created by:
      // 1. Database trigger (handle_new_user), OR
      // 2. onAuthStateChange → loadUserProfile
      return { success: true };
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  /**
   * Log out current user
   * Clears all state and Supabase session
   */
  const logout = async () => {
    if (!supabase) return;
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    console.log('User logged out');
  };

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 * 
 * Usage:
 *   const { user, login, logout, isAdmin } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Export supabase client for direct use if needed
export { supabase };