import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types/quiz";
import { createClient, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
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

  useEffect(() => {
    if (!supabase) return;

    // Setting up auth with fresh Supabase project

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Auth state changed
        setSession(session);
        if (session?.user) {
          const newUser: User = {
            id: session.user.id,
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
            password: '', // Not stored in Supabase Auth
            createdAt: new Date(session.user.created_at).getTime(),
          };
          setUser(newUser);
          
          // Check admin status (simplified for fresh project)
          setTimeout(() => {
            checkAdminStatus(session.user.id).catch(() => {
              setIsAdmin(false);
            });
          }, 100);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        // Existing session check
        setSession(session);
        if (session?.user) {
          const newUser: User = {
            id: session.user.id,
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
            password: '',
            createdAt: new Date(session.user.created_at).getTime(),
          };
          setUser(newUser);
          
          setTimeout(() => {
            checkAdminStatus(session.user.id).catch(() => {
              setIsAdmin(false);
            });
          }, 100);
        }
      })
      .catch(() => {
        setUser(null);
        setIsAdmin(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async (userId: string) => {
    if (!supabase) return;
    try {
      // For the minimal schema, we don't have user_roles table
      // Default to false since the table doesn't exist in our fresh setup
      setIsAdmin(false);
    } catch (error) {
      // Silent failure - admin check is not critical for app functionality
      setIsAdmin(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { success: false, error: "Database not configured. Please enable Lovable Cloud." };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const signup = async (email: string, password: string, username: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { success: false, error: "Database not configured. Please enable Lovable Cloud." };
    }

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: username,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && !data.session) {
        return { success: false, error: "Please check your email to confirm your account" };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) {
      return { success: false, error: "Database not configured. Please enable Lovable Cloud." };
    }

    try {
      // Get the correct redirect URL based on current environment
      let redirectUrl: string;
      
      if (window.location.hostname === 'localhost') {
        redirectUrl = `http://localhost:${window.location.port}/reset-password`;
      } else {
        redirectUrl = `https://${window.location.hostname}/reset-password`;
      }
      


      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
        // Add this to force the redirect URL to be used
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {

        return { success: false, error: error.message };
      }


      return { success: true };
    } catch (error) {

      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, login, signup, resetPassword, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export { supabase };
