import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalInput, TerminalButton, TerminalLine } from "@/components/Terminal";
import { toast } from "sonner";

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    const success = isLogin ? login(username, password) : signup(username, password);

    if (success) {
      toast.success(isLogin ? "Login successful!" : "Account created!");
      navigate("/dashboard");
    } else {
      toast.error(isLogin ? "Invalid credentials" : "Username already exists");
    }
  };

  return (
    <Terminal title={isLogin ? "login" : "signup"}>
      <TerminalLine>Welcome to QuizCLI - Terminal Quiz System</TerminalLine>
      <TerminalLine prefix="~">{isLogin ? "Please login to continue" : "Create a new account"}</TerminalLine>

      <form onSubmit={handleSubmit} className="mt-6">
        <TerminalInput
          label="username:"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <TerminalInput
          label="password:"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <div className="flex gap-4 mt-6">
          <TerminalButton type="submit">{isLogin ? "login" : "signup"}</TerminalButton>
          <TerminalButton type="button" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "create account" : "back to login"}
          </TerminalButton>
        </div>
      </form>
    </Terminal>
  );
};
