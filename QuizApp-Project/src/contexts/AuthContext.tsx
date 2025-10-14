import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types/quiz";
import { storage } from "@/lib/storage";

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  signup: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = storage.getCurrentUser();
    setUser(currentUser);
  }, []);

  const login = (username: string, password: string): boolean => {
    const users = storage.getUsers();
    const foundUser = users.find((u) => u.username === username && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      storage.setCurrentUser(foundUser);
      return true;
    }
    return false;
  };

  const signup = (username: string, password: string): boolean => {
    const users = storage.getUsers();
    if (users.find((u) => u.username === username)) {
      return false; // Username already exists
    }
    const newUser: User = {
      id: Date.now().toString(),
      username,
      password,
      createdAt: Date.now(),
    };
    storage.saveUser(newUser);
    setUser(newUser);
    storage.setCurrentUser(newUser);
    return true;
  };

  const logout = () => {
    setUser(null);
    storage.setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
