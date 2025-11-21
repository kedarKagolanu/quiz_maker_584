import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Terminal, TerminalInput, TerminalButton, TerminalLine } from "@/components/Terminal";
import { toast } from "sonner";
import { passwordSchema } from "@/lib/validation";
import { supabase } from "@/contexts/AuthContext";

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkResetToken = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');

      if (type === 'recovery' && accessToken && refreshToken) {
        if (supabase) {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (!error) {
              setIsValidToken(true);
            } else {
              toast.error('Invalid or expired reset link');
              navigate('/auth');
            }
          } catch (error) {
            toast.error('Invalid reset link');
            navigate('/auth');
          }
        }
      } else {
        toast.error('Invalid reset link');
        navigate('/auth');
      }
      
      setIsChecking(false);
    };

    checkResetToken();
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;

    // Validate inputs
    try {
      passwordSchema.parse(password);
      
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || "Invalid password");
      return;
    }

    if (!supabase) {
      toast.error("Database not configured");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully!");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <Terminal title="password reset">
        <TerminalLine>Welcome to QuizCLI - Terminal Quiz System</TerminalLine>
        <TerminalLine prefix="~">Verifying reset link...</TerminalLine>
      </Terminal>
    );
  }

  if (!isValidToken) {
    return (
      <Terminal title="password reset">
        <TerminalLine>Welcome to QuizCLI - Terminal Quiz System</TerminalLine>
        <TerminalLine prefix="✗">Invalid or expired reset link</TerminalLine>
        <div className="mt-6">
          <TerminalButton onClick={() => navigate('/auth')}>
            back to login
          </TerminalButton>
        </div>
      </Terminal>
    );
  }

  return (
    <Terminal title="set new password">
      <TerminalLine>Welcome to QuizCLI - Terminal Quiz System</TerminalLine>
      <TerminalLine prefix="~">Enter your new password</TerminalLine>

      <form onSubmit={handleSubmit} className="mt-6">
        <TerminalInput
          label="new password:"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          disabled={isLoading}
        />
        
        <TerminalInput
          label="confirm password:"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          disabled={isLoading}
        />

        <div className="flex gap-4 mt-6">
          <TerminalButton type="submit" disabled={isLoading}>
            {isLoading ? "updating..." : "update password"}
          </TerminalButton>
          <TerminalButton 
            type="button" 
            onClick={() => navigate('/auth')}
            disabled={isLoading}
          >
            cancel
          </TerminalButton>
        </div>
      </form>
    </Terminal>
  );
};