import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalInput, TerminalButton, TerminalLine } from "@/components/Terminal";
import { toast } from "sonner";
import { emailSchema, passwordSchema, usernameSchema } from "@/lib/validation";

export const Auth: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { login, signup, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;

    // Validate inputs
    try {
      if (authMode === 'login') {
        emailSchema.parse(email);
      } else if (authMode === 'signup') {
        emailSchema.parse(email);
        passwordSchema.parse(password);
        usernameSchema.parse(username);
      } else if (authMode === 'forgot') {
        emailSchema.parse(email);
      }
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || "Invalid input");
      return;
    }

    setIsLoading(true);

    try {
      let result;
      
      if (authMode === 'login') {
        result = await login(email, password);
      } else if (authMode === 'signup') {
        result = await signup(email, password, username);
      } else if (authMode === 'forgot') {
        result = await resetPassword(email);
      }

      if (result?.success) {
        if (authMode === 'forgot') {
          setResetEmailSent(true);
          toast.success("Password reset email sent! Check your inbox.");
        } else {
          toast.success(authMode === 'login' ? "Login successful!" : "Account created!");
          navigate("/dashboard");
        }
      } else {
        toast.error(result?.error || `${authMode} failed`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setUsername("");
    setPassword("");
    setResetEmailSent(false);
  };

  const getTitle = () => {
    switch (authMode) {
      case 'login': return 'login';
      case 'signup': return 'signup';
      case 'forgot': return 'password reset';
      default: return 'login';
    }
  };

  const getDescription = () => {
    switch (authMode) {
      case 'login': return 'Please login to continue';
      case 'signup': return 'Create a new account';
      case 'forgot': return resetEmailSent ? 'Check your email for reset instructions' : 'Enter your email to reset password';
      default: return 'Please login to continue';
    }
  };

  return (
    <Terminal title={getTitle()}>
      <TerminalLine>Welcome to QuizCLI - Terminal Quiz System</TerminalLine>
      <TerminalLine prefix="~">{getDescription()}</TerminalLine>

      {resetEmailSent ? (
        <div className="mt-6">
          <TerminalLine prefix="✓">Password reset email sent successfully!</TerminalLine>
          <TerminalLine prefix="→">Check your inbox and follow the instructions.</TerminalLine>
          <TerminalLine prefix="→">The email may take a few minutes to arrive.</TerminalLine>
          
          <div className="flex gap-4 mt-6">
            <TerminalButton 
              type="button" 
              onClick={() => {
                setAuthMode('login');
                resetForm();
              }}
            >
              back to login
            </TerminalButton>
            <TerminalButton 
              type="button" 
              onClick={() => {
                setResetEmailSent(false);
                setEmail("");
              }}
            >
              send another email
            </TerminalButton>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6">
          <TerminalInput
            label="email:"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={isLoading}
          />
          
          {authMode === 'signup' && (
            <TerminalInput
              label="username:"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={isLoading}
            />
          )}
          
          {authMode !== 'forgot' && (
            <TerminalInput
              label="password:"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={authMode === 'login' ? "current-password" : "new-password"}
              disabled={isLoading}
            />
          )}

          <div className="flex gap-2 mt-6 flex-wrap">
            <TerminalButton type="submit" disabled={isLoading}>
              {isLoading ? "processing..." : 
                authMode === 'login' ? "login" : 
                authMode === 'signup' ? "signup" : "send reset email"}
            </TerminalButton>
            
            {authMode === 'login' && (
              <>
                <TerminalButton 
                  type="button" 
                  onClick={() => {
                    setAuthMode('signup');
                    resetForm();
                  }}
                  disabled={isLoading}
                >
                  create account
                </TerminalButton>
                <TerminalButton 
                  type="button" 
                  onClick={() => {
                    setAuthMode('forgot');
                    resetForm();
                  }}
                  disabled={isLoading}
                >
                  forgot password?
                </TerminalButton>
              </>
            )}
            
            {authMode === 'signup' && (
              <TerminalButton 
                type="button" 
                onClick={() => {
                  setAuthMode('login');
                  resetForm();
                }}
                disabled={isLoading}
              >
                back to login
              </TerminalButton>
            )}
            
            {authMode === 'forgot' && (
              <TerminalButton 
                type="button" 
                onClick={() => {
                  setAuthMode('login');
                  resetForm();
                }}
                disabled={isLoading}
              >
                back to login
              </TerminalButton>
            )}
          </div>
        </form>
      )}
    </Terminal>
  );
};
