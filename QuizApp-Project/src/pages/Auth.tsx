import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalInput, TerminalButton, TerminalLine } from "@/components/Terminal";
import { toast } from "sonner";
import { emailSchema, passwordSchema, usernameSchema } from "@/lib/validation";

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup, user } = useAuth();
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
      if (isLogin) {
        emailSchema.parse(email);
      } else {
        emailSchema.parse(email);
        passwordSchema.parse(password);
        usernameSchema.parse(username);
      }
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || "Invalid input");
      return;
    }

    setIsLoading(true);

    try {
      const result = isLogin 
        ? await login(email, password) 
        : await signup(email, password, username);

      if (result.success) {
        toast.success(isLogin ? "Login successful!" : "Account created!");
        navigate("/dashboard");
      } else {
        toast.error(result.error || (isLogin ? "Login failed" : "Signup failed"));
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Terminal title={isLogin ? "login" : "signup"}>
      <TerminalLine>Welcome to QuizCLI - Terminal Quiz System</TerminalLine>
      <TerminalLine prefix="~">{isLogin ? "Please login to continue" : "Create a new account"}</TerminalLine>

      <form onSubmit={handleSubmit} className="mt-6">
        <TerminalInput
          label="email:"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          disabled={isLoading}
        />
        {!isLogin && (
          <TerminalInput
            label="username:"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={isLoading}
          />
        )}
        <TerminalInput
          label="password:"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isLogin ? "current-password" : "new-password"}
          disabled={isLoading}
        />

        <div className="flex gap-4 mt-6">
          <TerminalButton type="submit" disabled={isLoading}>
            {isLoading ? "processing..." : (isLogin ? "login" : "signup")}
          </TerminalButton>
          <TerminalButton 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin);
              setEmail("");
              setUsername("");
              setPassword("");
            }}
            disabled={isLoading}
          >
            {isLogin ? "create account" : "back to login"}
          </TerminalButton>
        </div>
      </form>
    </Terminal>
  );
};
