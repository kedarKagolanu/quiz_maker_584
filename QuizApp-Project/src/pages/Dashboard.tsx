import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder } from "@/types/quiz";
import { ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";

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

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const loadData = async () => {
      const allQuizzes = await storage.getQuizzes();
      const allFolders = await storage.getFolders();
      
      setMyQuizzes(allQuizzes.filter((q) => q.creator === user.id));
      
      // Get accessible quizzes and folders
      const accessibleQuizzes = allQuizzes.filter(
        (q) => q.isPublic || q.creator === user.id || q.sharedWith?.includes(user.id)
      );
      const accessibleFolders = allFolders.filter(
        (f) => f.isPublic || f.creator === user.id || f.sharedWith?.includes(user.id)
      );
      
      // Build folder tree for available quizzes
      const tree = buildFolderTree(accessibleQuizzes, accessibleFolders);
      setAvailableFolderTree(tree);
      
      const userAttempts = await storage.getUserAttempts(user.id);
      setAttempts(userAttempts);
    };
    loadData();
  }, [user, navigate]);

  const buildFolderTree = (quizzes: Quiz[], folders: QuizFolder[]): FolderTree => {
    // Root level
    const rootQuizzes = quizzes.filter(q => !q.folderPath);
    const rootFolders = folders.filter(f => !f.parentPath);
    
    const buildSubTree = (parentPath: string): FolderTree[] => {
      const childFolders = folders.filter(f => f.parentPath === parentPath);
      return childFolders.map(folder => ({
        folder,
        quizzes: quizzes.filter(q => q.folderPath === getFullPath(folder)),
        subFolders: buildSubTree(getFullPath(folder))
      }));
    };
    
    return {
      folder: null, // Root
      quizzes: rootQuizzes,
      subFolders: buildSubTree('')
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
            <TerminalButton onClick={() => {
              const musicUploadBtn = document.getElementById('music-upload-input');
              if (musicUploadBtn) musicUploadBtn.click();
            }}>upload music</TerminalButton>
            {isAdmin && (
              <TerminalButton onClick={() => navigate("/admin")}>admin panel</TerminalButton>
            )}
            <TerminalButton onClick={handleLogout}>logout</TerminalButton>
          </div>
        </div>

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
    </Terminal>
  );
};
