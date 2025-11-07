import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder } from "@/types/quiz";
import { ChevronRight, ChevronDown, Folder, FileText, Send, Inbox } from "lucide-react";
import { toast } from "sonner";
import { ThemeSelector } from "@/components/ThemeSelector";
import { MusicUploader } from "@/components/MusicUploader";

interface FolderTree {
  folder: QuizFolder | null;
  quizzes: Quiz[];
  subFolders: FolderTree[];
}

export const Dashboard: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [availableFolderTree, setAvailableFolderTree] = useState<FolderTree | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [showAccessCodeInput, setShowAccessCodeInput] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const loadData = async () => {
      const allQuizzes = await storage.getQuizzes();
      const allFolders = await storage.getFolders();
      
      // User's own quizzes
      setMyQuizzes(allQuizzes.filter((q) => q.creator === user.id));
      
      // Get all accessible quizzes (user's own + public quizzes + shared quizzes)
      const accessibleQuizzes = allQuizzes.filter(
        (q) => q.isPublic || q.creator === user.id || q.sharedWith?.includes(user.id)
      );
      
      // Get all accessible folders (user's own + public folders + shared folders)
      const accessibleFolders = allFolders.filter(
        (f) => f.isPublic || f.creator === user.id || f.sharedWith?.includes(user.id)
      );
      
      // Build hierarchical folder tree with quizzes properly organized
      const tree = buildFolderTree(accessibleQuizzes, accessibleFolders);
      setAvailableFolderTree(tree);
      
      const userAttempts = await storage.getUserAttempts(user.id);
      setAttempts(userAttempts);
    };
    loadData();
  }, [user, navigate]);

  const buildFolderTree = (quizzes: Quiz[], folders: QuizFolder[]): FolderTree => {
    // Root level - quizzes without folder path
    const rootQuizzes = quizzes.filter(q => !q.folderPath || q.folderPath === '');
    
    // Root level folders - folders without parent path
    const rootFolders = folders.filter(f => !f.parentPath || f.parentPath === '');
    
    // Recursively build subfolder tree
    const buildSubTree = (parentPath: string): FolderTree[] => {
      const childFolders = folders.filter(f => f.parentPath === parentPath);
      
      return childFolders.map(folder => {
        const fullPath = getFullPath(folder);
        return {
          folder,
          quizzes: quizzes.filter(q => q.folderPath === fullPath),
          subFolders: buildSubTree(fullPath)
        };
      });
    };
    
    // Build root tree
    const rootSubFolders = rootFolders.map(folder => {
      const fullPath = getFullPath(folder);
      return {
        folder,
        quizzes: quizzes.filter(q => q.folderPath === fullPath),
        subFolders: buildSubTree(fullPath)
      };
    });
    
    return {
      folder: null, // Root
      quizzes: rootQuizzes,
      subFolders: rootSubFolders
    };
  };

  const getFullPath = (folder: QuizFolder): string => {
    return folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderFolderTree = (tree: FolderTree, depth: number = 0): React.ReactNode => {
    const folderId = tree.folder?.id || 'root';
    const isExpanded = expandedFolders.has(folderId);
    const indent = depth * 20;

    return (
      <div key={folderId}>
        {tree.folder && (
          <div 
            className="flex items-center gap-2 p-2 hover:bg-terminal-accent/10 cursor-pointer rounded"
            style={{ marginLeft: `${indent}px` }}
            onClick={() => toggleFolder(folderId)}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Folder className="w-4 h-4 text-terminal-accent" />
            <span className="text-terminal-bright">{tree.folder.name}</span>
            <span className="text-xs text-terminal-dim">
              ({tree.quizzes.length} quiz{tree.quizzes.length !== 1 ? 'zes' : ''})
            </span>
          </div>
        )}

        {isExpanded && (
          <>
            {/* Render quizzes in this folder */}
            {tree.quizzes.map(quiz => (
              <div 
                key={quiz.id}
                className="flex items-center justify-between border border-terminal-accent/30 p-3 rounded ml-8"
                style={{ marginLeft: `${indent + 20}px` }}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-terminal-dim" />
                  <div>
                    <div className="text-terminal-bright">{quiz.title}</div>
                    <div className="text-sm text-terminal-dim">
                      {quiz.questions.length} questions • {quiz.isPublic ? "Public" : "Shared"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <TerminalButton onClick={() => navigate(`/quiz/${quiz.id}`)}>start</TerminalButton>
                  <TerminalButton onClick={() => navigate(`/leaderboard/${quiz.id}`)}>leaderboard</TerminalButton>
                </div>
              </div>
            ))}

            {/* Render subfolders */}
            {tree.subFolders.map(subTree => renderFolderTree(subTree, depth + 1))}
          </>
        )}
      </div>
    );
  };

  const handleAccessCode = async () => {
    if (!accessCodeInput.trim()) return;
    
    const quiz = await storage.getQuizByAccessCode(accessCodeInput.trim());
    const folder = await storage.getFolderByAccessCode(accessCodeInput.trim());
    
    if (quiz) {
      setAccessCodeInput("");
      setShowAccessCodeInput(false);
      navigate(`/quiz/${quiz.id}`);
      toast.success(`Access granted to quiz: ${quiz.title}`);
    } else if (folder) {
      setAccessCodeInput("");
      setShowAccessCodeInput(false);
      // Reload data after accessing folder
      const allQuizzes = await storage.getQuizzes();
      const allFolders = await storage.getFolders();
      
      // User's own quizzes
      setMyQuizzes(allQuizzes.filter((q) => q.creator === user?.id));
      
      // Get all accessible quizzes (user's own + public quizzes + shared quizzes)
      const accessibleQuizzes = allQuizzes.filter(
        (q) => q.isPublic || q.creator === user?.id || q.sharedWith?.includes(user?.id || '')
      );
      
      // Get all accessible folders (user's own + public folders + shared folders)
      const accessibleFolders = allFolders.filter(
        (f) => f.isPublic || f.creator === user?.id || f.sharedWith?.includes(user?.id || '')
      );
      
      // Build hierarchical folder tree with quizzes properly organized
      const tree = buildFolderTree(accessibleQuizzes, accessibleFolders);
      setAvailableFolderTree(tree);
      
      toast.success(`Access granted to folder: ${folder.name}`);
    } else {
      toast.error("Invalid access code");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user) return null;

  return (
    <Terminal title={`dashboard - ${user.username}`}>
      <div className="flex items-center justify-between mb-4">
        <TerminalLine prefix="~">Welcome back, {user.username}!</TerminalLine>
        <TerminalButton onClick={() => navigate(`/profile/${user.id}`)}>
          view profile
        </TerminalButton>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <TerminalLine prefix="#">Actions</TerminalLine>
          <div className="flex flex-wrap gap-3 mt-2 ml-6">
            <TerminalButton onClick={() => navigate("/create")}>create quiz</TerminalButton>
            <TerminalButton onClick={() => navigate("/my-quizzes")}>my quizzes ({myQuizzes.length})</TerminalButton>
            <MusicUploader />
            <TerminalButton onClick={() => navigate("/edit-requests")}>
              <Inbox className="w-4 h-4 inline mr-1" />edit requests
            </TerminalButton>
            <TerminalButton onClick={() => setShowAccessCodeInput(true)}>
              <Send className="w-4 h-4 inline mr-1" />enter access code
            </TerminalButton>
            {isAdmin && (
              <TerminalButton onClick={() => navigate("/admin")}>admin panel</TerminalButton>
            )}
            <TerminalButton onClick={handleLogout}>logout</TerminalButton>
          </div>
        </div>

        <ThemeSelector />

        <div>
          <TerminalLine prefix="#">Statistics</TerminalLine>
          <div className="ml-6 space-y-1">
            <TerminalLine prefix="-">Quizzes Created: {myQuizzes.length}</TerminalLine>
            <TerminalLine prefix="-">Quizzes Attempted: {attempts.length}</TerminalLine>
            <TerminalLine prefix="-">
              Average Score: {attempts.length > 0 ? (attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length).toFixed(1) : "N/A"}%
            </TerminalLine>
          </div>
        </div>

        <div>
          <TerminalLine prefix="#">Available Quizzes & Folders</TerminalLine>
          <div className="ml-6 text-sm text-terminal-dim mb-2">
            Showing your quizzes and all public quizzes from other users
          </div>
          {availableFolderTree && (availableFolderTree.quizzes.length > 0 || availableFolderTree.subFolders.length > 0) ? (
            <div className="ml-6 space-y-2 mt-2">
              {renderFolderTree(availableFolderTree)}
            </div>
          ) : (
            <TerminalLine prefix="-" className="ml-6 text-terminal-dim">
              No quizzes available
            </TerminalLine>
          )}
        </div>
      </div>

      {/* Access code dialog */}
      {showAccessCodeInput && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
            <TerminalLine prefix="#">Enter Access Code</TerminalLine>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAccessCode();
                  if (e.key === 'Escape') {
                    setShowAccessCodeInput(false);
                    setAccessCodeInput("");
                  }
                }}
                className="w-full bg-terminal border border-terminal-accent text-terminal-foreground px-3 py-2 rounded uppercase"
                placeholder="QUIZ-CODE"
                autoFocus
              />
              <div className="flex gap-2">
                <TerminalButton onClick={handleAccessCode}>submit</TerminalButton>
                <TerminalButton onClick={() => {
                  setShowAccessCodeInput(false);
                  setAccessCodeInput("");
                }}>cancel</TerminalButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </Terminal>
  );
};
