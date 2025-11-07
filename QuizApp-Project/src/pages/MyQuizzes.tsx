import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton, TerminalInput } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder } from "@/types/quiz";
import { toast } from "sonner";
import { Copy, Edit, Trash2, Folder, FolderOpen, ChevronRight, Send } from "lucide-react";

export const MyQuizzes: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showRenameFolder, setShowRenameFolder] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadData();
  }, [user, navigate, currentPath]);

  const loadData = async () => {
    if (!user) return;
    
    // Get user's quizzes (created + permission-based)
    const userQuizzes = await storage.getUserQuizzes(user.id);
    setQuizzes(userQuizzes);
    
    // Get user's folders (created + permission-based)
    const userFolders = await storage.getUserFolders(user.id);
    setFolders(userFolders);
  };

  const getCurrentFolderQuizzes = () => {
    return quizzes.filter((q) => (q.folderPath || "") === currentPath);
  };

  const getCurrentSubfolders = () => {
    return folders.filter((f) => (f.parentPath || "") === currentPath);
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    
    const folder: QuizFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      parentPath: currentPath || undefined,
      createdAt: Date.now(),
      creator: user.id,
      isPublic: false,
    };
    
    await storage.saveFolder(folder);
    setNewFolderName("");
    setShowNewFolder(false);
    await loadData();
    toast.success("Folder created!");
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    const quizzesInFolder = quizzes.filter((q) => q.folderPath?.startsWith(folderPath));
    const subfoldersInFolder = folders.filter((f) => f.parentPath?.startsWith(folderPath));
    
    if (quizzesInFolder.length > 0 || subfoldersInFolder.length > 0) {
      if (!confirm(`This folder contains ${quizzesInFolder.length} quiz(es) and ${subfoldersInFolder.length} subfolder(s). All will be deleted. Continue?`)) {
        return;
      }
      
      // Delete all quizzes in folder
      for (const q of quizzesInFolder) {
        await storage.deleteQuiz(q.id);
      }
      
      // Delete all subfolders
      for (const f of subfoldersInFolder) {
        await storage.deleteFolder(f.id);
      }
    }
    
    await storage.deleteFolder(folderId);
    await loadData();
    toast.success("Folder deleted!");
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!renameFolderValue.trim()) return;
    await storage.renameFolder(folderId, renameFolderValue.trim());
    setShowRenameFolder(null);
    setRenameFolderValue("");
    await loadData();
    toast.success("Folder renamed!");
  };

  const handleMoveQuiz = async (targetPath: string) => {
    if (!selectedQuiz) return;
    
    const updatedQuiz = { ...selectedQuiz, folderPath: targetPath || undefined };
    await storage.updateQuiz(updatedQuiz);
    setShowMoveDialog(false);
    setSelectedQuiz(null);
    await loadData();
    toast.success("Quiz moved!");
  };

  const handleCopyJSON = (quiz: Quiz) => {
    const jsonData = JSON.stringify(quiz.questions, null, 2);
    navigator.clipboard.writeText(jsonData);
    toast.success("Quiz JSON copied to clipboard!");
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      await storage.deleteQuiz(quizId);
      await loadData();
      toast.success("Quiz deleted successfully!");
    }
  };

  const openFolder = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
  };

  const goBack = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    return currentPath.split("/");
  };

  const getAllFolderPaths = (excludeQuizPath?: string): string[] => {
    const paths = ["Root"];
    
    const addFolderPaths = (parentPath: string) => {
      const subfolders = folders.filter((f) => (f.parentPath || "") === parentPath);
      subfolders.forEach((f) => {
        const fullPath = parentPath ? `${parentPath}/${f.name}` : f.name;
        if (fullPath !== excludeQuizPath) {
          paths.push(fullPath);
          addFolderPaths(fullPath);
        }
      });
    };
    
    addFolderPaths("");
    return paths;
  };

  if (!user) return null;

  const currentQuizzes = getCurrentFolderQuizzes();
  const currentSubfolders = getCurrentSubfolders();

  return (
    <Terminal title="my-quizzes">
      <TerminalLine>Quizzes you have created</TerminalLine>

      {/* Breadcrumb navigation */}
      <div className="mt-4 flex items-center gap-2 text-sm">
        <button
          onClick={() => setCurrentPath("")}
          className="text-terminal-accent hover:underline"
        >
          Root
        </button>
        {getBreadcrumbs().map((crumb, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={() => setCurrentPath(getBreadcrumbs().slice(0, idx + 1).join("/"))}
              className="text-terminal-accent hover:underline"
            >
              {crumb}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <TerminalButton onClick={() => setShowNewFolder(true)}>
            <Folder className="w-4 h-4 inline mr-1" />new folder
          </TerminalButton>
          {currentPath && (
            <TerminalButton onClick={goBack}>
              ← back
            </TerminalButton>
          )}
        </div>

        {/* New folder input */}
        {showNewFolder && (
          <div className="border border-terminal-accent/30 p-3 rounded space-y-2">
            <TerminalInput
              label="folder name:"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
            />
            <div className="flex gap-2">
              <TerminalButton onClick={handleCreateFolder}>create</TerminalButton>
              <TerminalButton onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}>cancel</TerminalButton>
            </div>
          </div>
        )}

        {/* Subfolders */}
        {currentSubfolders.map((folder) => (
          <div key={folder.id} className="border border-terminal-accent/30 p-4 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => openFolder(folder.name)}>
                <FolderOpen className="w-6 h-6 text-terminal-accent" />
                {showRenameFolder === folder.id ? (
                  <input
                    type="text"
                    value={renameFolderValue}
                    onChange={(e) => setRenameFolderValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameFolder(folder.id);
                      if (e.key === 'Escape') {
                        setShowRenameFolder(null);
                        setRenameFolderValue("");
                      }
                    }}
                    className="bg-terminal border border-terminal-accent text-terminal-foreground px-2 py-1 rounded"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="text-terminal-bright text-lg">{folder.name}</span>
                )}
              </div>
              <div className="flex gap-2">
                <TerminalButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRenameFolder(folder.id);
                    setRenameFolderValue(folder.name);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </TerminalButton>
                <TerminalButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id, folder.name);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </TerminalButton>
              </div>
            </div>
          </div>
        ))}

        {/* Quizzes */}
        {currentQuizzes.length === 0 && currentSubfolders.length === 0 ? (
          <TerminalLine prefix="-" className="text-terminal-dim">
            {currentPath ? "This folder is empty" : "You haven't created any quizzes yet"}
          </TerminalLine>
        ) : (
          currentQuizzes.map((quiz) => (
            <div key={quiz.id} className="border border-terminal-accent/30 p-4 rounded space-y-2">
              <div className="text-terminal-bright text-lg">{quiz.title}</div>
              <div className="text-sm text-terminal-dim space-y-1">
                <div>Questions: {quiz.questions.length}</div>
                <div>Visibility: {quiz.isPublic ? "Public" : "Private"}</div>
                {quiz.timeLimit && <div>Time Limit: {quiz.timeLimit}s</div>}
                <div>Randomize: {quiz.randomize ? "Yes" : "No"}</div>
                <div>Created: {new Date(quiz.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <TerminalButton onClick={() => navigate(`/quiz/${quiz.id}`)}>preview</TerminalButton>
                <TerminalButton onClick={() => navigate(`/leaderboard/${quiz.id}`)}>leaderboard</TerminalButton>
                <TerminalButton onClick={() => navigate(`/create-quiz?edit=${quiz.id}`)}>
                  <Edit className="w-4 h-4 inline mr-1" />edit
                </TerminalButton>
                <TerminalButton onClick={() => handleCopyJSON(quiz)}>
                  <Copy className="w-4 h-4 inline mr-1" />copy JSON
                </TerminalButton>
                <TerminalButton
                  onClick={() => {
                    setSelectedQuiz(quiz);
                    setShowMoveDialog(true);
                  }}
                >
                  📁 move
                </TerminalButton>
                {quiz.editMode === 'pull_requests' && quiz.creator !== user?.id && (
                  <TerminalButton onClick={() => navigate(`/request-access?type=quiz&id=${quiz.id}`)}>
                    <Send className="w-4 h-4 inline mr-1" />send edit request
                  </TerminalButton>
                )}
                <TerminalButton onClick={() => handleDeleteQuiz(quiz.id)}>
                  <Trash2 className="w-4 h-4 inline mr-1" />delete
                </TerminalButton>
              </div>
            </div>
          ))
        )}

        <div className="flex gap-3 pt-4">
          <TerminalButton onClick={() => navigate("/create-quiz")}>create new quiz</TerminalButton>
          <TerminalButton onClick={() => navigate("/dashboard")}>back to dashboard</TerminalButton>
        </div>
      </div>

      {/* Move quiz dialog */}
      {showMoveDialog && selectedQuiz && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
            <TerminalLine prefix="#">Move Quiz: {selectedQuiz.title}</TerminalLine>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {getAllFolderPaths(selectedQuiz.folderPath).map((path) => (
                <button
                  key={path}
                  onClick={() => handleMoveQuiz(path === "Root" ? "" : path)}
                  className="w-full text-left p-2 border border-terminal-accent/30 rounded hover:bg-terminal-accent/20 transition-colors"
                >
                  {path === "Root" ? "📁 Root" : `📁 ${path}`}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <TerminalButton onClick={() => {
                setShowMoveDialog(false);
                setSelectedQuiz(null);
              }}>cancel</TerminalButton>
            </div>
          </div>
        </div>
      )}
    </Terminal>
  );
};
