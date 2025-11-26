import React from 'react';
import { Quiz, QuizFolder } from '@/types/quiz';

interface QuizPickerProps {
  isOpen: boolean;
  currentFolder: string;
  folders: QuizFolder[];
  availableQuizzes: Quiz[];
  onClose: () => void;
  onFolderChange: (folder: string) => void;
  onQuizSelect: (quiz: Quiz) => void;
}

export const QuizPicker: React.FC<QuizPickerProps> = ({
  isOpen,
  currentFolder,
  folders,
  availableQuizzes,
  onClose,
  onFolderChange,
  onQuizSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="mt-4 p-4 bg-terminal border border-terminal-accent rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-terminal-bright">Select Quiz</h3>
        <button
          onClick={onClose}
          className="text-terminal-dim hover:text-terminal-bright text-xl"
        >
          ✕
        </button>
      </div>
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1 text-xs text-terminal-dim mb-3 p-2 bg-terminal-accent/5 rounded">
        <button
          onClick={() => onFolderChange('')}
          className="hover:text-terminal-bright transition-colors"
        >
          🏠 Root
        </button>
        {currentFolder.split('/').filter(Boolean).map((folder, folderIdx, arr) => {
          const path = arr.slice(0, folderIdx + 1).join('/');
          return (
            <React.Fragment key={folderIdx}>
              <span>/</span>
              <button
                onClick={() => onFolderChange(path)}
                className="hover:text-terminal-bright transition-colors"
              >
                📁 {folder}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      
      {/* File Manager View */}
      <div className="max-h-64 overflow-y-auto border border-terminal-accent/20 rounded bg-terminal-accent/5 p-2">
        {/* Folders */}
        {folders
          .filter(folder => {
            const folderPath = folder.parentPath || '';
            return folderPath === currentFolder;
          })
          .map(folder => {
            const fullPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
            return (
              <div
                key={folder.id}
                onClick={() => onFolderChange(fullPath)}
                className="flex items-center gap-3 p-2 hover:bg-terminal-accent/20 rounded cursor-pointer transition-colors"
              >
                <span className="text-lg">📂</span>
                <div className="flex-1">
                  <div className="font-medium text-terminal-bright text-sm">{folder.name}</div>
                  <div className="text-xs text-terminal-dim">Folder</div>
                </div>
              </div>
            );
          })
        }
        
        {/* Quizzes */}
        {availableQuizzes
          .filter(quiz => {
            const quizFolderPath = quiz.folderPath || '';
            return quizFolderPath === currentFolder;
          })
          .map(quiz => (
            <div
              key={quiz.id}
              onClick={() => onQuizSelect(quiz)}
              className="flex items-center gap-3 p-2 hover:bg-terminal-accent/20 rounded cursor-pointer transition-colors hover:border-blue-400/50 hover:bg-blue-500/10"
            >
              <span className="text-lg">📚</span>
              <div className="flex-1">
                <div className="font-medium text-terminal-bright text-sm">{quiz.title}</div>
                <div className="text-xs text-terminal-dim">{quiz.questions?.length || 0} questions</div>
              </div>
              <div className="text-xs text-terminal-dim bg-terminal-accent/20 px-2 py-1 rounded">
                Select
              </div>
            </div>
          ))
        }
        
        {/* Empty folder message */}
        {folders.filter(f => (f.parentPath || '') === currentFolder).length === 0 &&
         availableQuizzes.filter(q => (q.folderPath || '') === currentFolder).length === 0 && (
          <div className="text-center p-8 text-terminal-dim">
            <div className="text-4xl mb-2">📁</div>
            <div>This folder is empty</div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-terminal-dim text-center">
        Click on folders to navigate, click on quizzes to select
      </div>
    </div>
  );
};