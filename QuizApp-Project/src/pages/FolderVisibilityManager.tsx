import React, { useState } from "react";
import { Terminal, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder } from "@/types/quiz";
import { toast } from "sonner";
import { Globe, Lock, AlertTriangle } from "lucide-react";

interface FolderVisibilityManagerProps {
  folder: QuizFolder;
  onUpdate: () => void;
  onClose: () => void;
}

export const FolderVisibilityManager: React.FC<FolderVisibilityManagerProps> = ({
  folder,
  onUpdate,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleMakePublic = async (propagateToContents: boolean) => {
    setIsLoading(true);
    try {
      // Update folder visibility
      const updatedFolder = { ...folder, isPublic: true };
      await storage.saveFolder(updatedFolder);

      if (propagateToContents) {
        // Get all subfolders and quizzes in this folder
        const allFolders = await storage.getFolders();
        const allQuizzes = await storage.getQuizzes();
        
        const folderPath = getFolderPath(folder);
        
        // Find all subfolders that start with this folder's path
        const subFolders = allFolders.filter(f => 
          f.parentPath && f.parentPath.startsWith(folderPath)
        );
        
        // Find all quizzes in this folder and subfolders
        const affectedQuizzes = allQuizzes.filter(q => 
          q.folderPath && (q.folderPath === folderPath || q.folderPath.startsWith(`${folderPath}/`))
        );

        // Update all subfolders to be public
        for (const subFolder of subFolders) {
          const updatedSubFolder = { ...subFolder, isPublic: true };
          await storage.saveFolder(updatedSubFolder);
        }

        // Update all quizzes to be public
        for (const quiz of affectedQuizzes) {
          const updatedQuiz = { ...quiz, isPublic: true };
          await storage.saveQuiz(updatedQuiz);
        }

        toast.success(`Folder and ${affectedQuizzes.length} quizzes, ${subFolders.length} subfolders made public`);
      } else {
        toast.success("Folder made public");
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to update folder visibility:", error);
      toast.error("Failed to update folder visibility");
    } finally {
      setIsLoading(false);
    }
  };

  const getFolderPath = (folder: QuizFolder): string => {
    if (folder.parentPath) {
      return `${folder.parentPath}/${folder.name}`;
    }
    return folder.name;
  };

  const countAffectedItems = async () => {
    const allFolders = await storage.getFolders();
    const allQuizzes = await storage.getQuizzes();
    const folderPath = getFolderPath(folder);
    
    const subFolders = allFolders.filter(f => 
      f.parentPath && f.parentPath.startsWith(folderPath)
    ).filter(f => !f.isPublic);
    
    const affectedQuizzes = allQuizzes.filter(q => 
      q.folderPath && (q.folderPath === folderPath || q.folderPath.startsWith(`${folderPath}/`))
    ).filter(q => !q.isPublic);

    return { quizzes: affectedQuizzes.length, folders: subFolders.length };
  };

  if (showConfirmation) {
    return (
      <Terminal title="Make Folder Public">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-yellow-300">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Folder Visibility Change</span>
          </div>
          
          <div className="text-terminal-foreground">
            <p>You're about to make the folder "{folder.name}" public.</p>
            <p className="mt-2">Would you like to also make all contents public?</p>
          </div>

          <div className="border border-terminal-accent/30 rounded p-3 bg-terminal-accent/10">
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-400" />
                <span><strong>Make contents public:</strong> All subfolders and quizzes will be made public</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-400" />
                <span><strong>Keep contents private:</strong> Only the folder will be public, contents remain private</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <TerminalButton 
              onClick={() => handleMakePublic(false)}
              disabled={isLoading}
            >
              Folder Only
            </TerminalButton>
            <TerminalButton 
              onClick={() => handleMakePublic(true)}
              disabled={isLoading}
              className="bg-terminal-accent/20 hover:bg-terminal-accent/30"
            >
              Folder + Contents
            </TerminalButton>
            <TerminalButton 
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
            >
              Cancel
            </TerminalButton>
          </div>
        </div>
      </Terminal>
    );
  }

  return (
    <Terminal title="Folder Visibility">
      <div className="space-y-4">
        <div className="text-terminal-foreground">
          <p>Folder: <span className="text-terminal-bright">{folder.name}</span></p>
          <p>Current visibility: {folder.isPublic ? 'Public' : 'Private'}</p>
        </div>

        <div className="flex gap-3">
          <TerminalButton 
            onClick={() => setShowConfirmation(true)}
            disabled={folder.isPublic}
          >
            <Globe className="w-4 h-4 mr-1" />
            Make Public
          </TerminalButton>
          <TerminalButton onClick={onClose}>
            Cancel
          </TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};