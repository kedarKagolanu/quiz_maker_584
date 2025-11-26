import React from 'react';
import { QuizFolder } from '@/types/quiz';

interface QuizSettingsProps {
  title: string;
  isPublic: boolean;
  randomize: boolean;
  layout: 'default' | 'split';
  folderPath: string;
  timeLimit: string;
  perQuestionTimeLimit: string;
  isTimeLimitAutoCalculated: boolean;
  customQuestionLimit: number | null;
  accessCode: string;
  editMode: 'no_edits' | 'pull_requests';
  folders: QuizFolder[];
  onTitleChange: (title: string) => void;
  onIsPublicChange: (isPublic: boolean) => void;
  onRandomizeChange: (randomize: boolean) => void;
  onLayoutChange: (layout: 'default' | 'split') => void;
  onFolderPathChange: (path: string) => void;
  onTimeLimitChange: (timeLimit: string) => void;
  onPerQuestionTimeLimitChange: (timeLimit: string) => void;
  onCustomQuestionLimitChange: (limit: number | null) => void;
  onAccessCodeChange: (code: string) => void;
  onEditModeChange: (mode: 'no_edits' | 'pull_requests') => void;
  onGenerateAccessCode: () => void;
  multiQuizMode: boolean;
  quizSourcesCount: number;
  jsonInput: string;
}

export const QuizSettings: React.FC<QuizSettingsProps> = ({
  title,
  isPublic,
  randomize,
  layout,
  folderPath,
  timeLimit,
  perQuestionTimeLimit,
  isTimeLimitAutoCalculated,
  customQuestionLimit,
  accessCode,
  editMode,
  folders,
  onTitleChange,
  onIsPublicChange,
  onRandomizeChange,
  onLayoutChange,
  onFolderPathChange,
  onTimeLimitChange,
  onPerQuestionTimeLimitChange,
  onCustomQuestionLimitChange,
  onAccessCodeChange,
  onEditModeChange,
  onGenerateAccessCode,
  multiQuizMode,
  quizSourcesCount,
  jsonInput,
}) => {
  const handleTimeLimitChange = (value: string) => {
    // Allow empty string or digits (including while typing)
    if (value === "" || /^\d*$/.test(value)) {
      onTimeLimitChange(value);
    }
  };

  const handlePerQuestionTimeLimitChange = (value: string) => {
    // Allow empty string or digits (including while typing)
    if (value === "" || /^\d*$/.test(value)) {
      onPerQuestionTimeLimitChange(value);
    }
  };

  const handleCustomQuestionLimitChange = (value: string) => {
    if (value === "") {
      onCustomQuestionLimitChange(null);
    } else if (/^\d+$/.test(value)) {
      const num = parseInt(value);
      if (num >= 1) {
        onCustomQuestionLimitChange(num);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-terminal-foreground mb-3">settings:</div>
      <div className="ml-6 space-y-2">
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => onIsPublicChange(e.target.checked)}
              className="accent-terminal-accent"
            />
            <span>Make quiz public</span>
          </label>
          {folderPath && (
            <div className="text-xs text-terminal-dim ml-6">
              💡 Tip: If folder "{folderPath}" is public, new quizzes will be public by default
            </div>
          )}
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={randomize}
            onChange={(e) => onRandomizeChange(e.target.checked)}
            className="accent-terminal-accent"
          />
          <span>Randomize question order</span>
        </label>

        <div className="flex items-center gap-2">
          <span>Quiz layout:</span>
          <select
            value={layout}
            onChange={(e) => onLayoutChange(e.target.value as 'default' | 'split')}
            className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
          >
            <option value="default">Default (Vertical)</option>
            <option value="split">Split (Question Left, Options Right)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span>Save to folder:</span>
          <select
            value={folderPath}
            onChange={(e) => onFolderPathChange(e.target.value)}
            className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
          >
            <option value="">Root</option>
            {folders.map((folder) => {
              const fullPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
              return (
                <option key={folder.id} value={fullPath}>
                  {fullPath}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span>Quiz time limit (seconds):</span>
          <input
            type="text"
            value={timeLimit}
            onChange={(e) => handleTimeLimitChange(e.target.value)}
            className={`bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24 transition-opacity ${
              isTimeLimitAutoCalculated ? 'opacity-50' : ''
            }`}
            placeholder="None"
            title={isTimeLimitAutoCalculated ? "Auto-calculated from per-question limit" : "Total time for entire quiz"}
          />
          {isTimeLimitAutoCalculated && (
            <span className="text-blue-400 text-sm">
              (Auto-calculated: {timeLimit}s)
            </span>
          )}
          <span className="text-terminal-dim text-sm">
            Total time for entire quiz
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Per-question time limit (seconds):</span>
          <input
            type="text"
            value={perQuestionTimeLimit}
            onChange={(e) => handlePerQuestionTimeLimitChange(e.target.value)}
            className={`bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24 ${
              perQuestionTimeLimit === "0" || !perQuestionTimeLimit ? 'opacity-60' : ''
            }`}
            placeholder="0 (disabled)"
          />
          <span className="text-terminal-dim text-sm">
            {perQuestionTimeLimit === "0" || !perQuestionTimeLimit 
              ? "Per-question timer disabled - free navigation" 
              : "Each question gets this time (locks previous questions)"
            }
          </span>
        </div>

        {(perQuestionTimeLimit && perQuestionTimeLimit !== "0") && (
          <div className="text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-400/30 p-2 rounded">
            ⚠️ Per-question timer mode: Once you move to the next question, you cannot go back to previous questions.
          </div>
        )}

        <div className="flex items-center gap-2">
          <span>Question limit (for randomization):</span>
          <input
            type="text"
            value={customQuestionLimit || ""}
            onChange={(e) => handleCustomQuestionLimitChange(e.target.value)}
            className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24"
            placeholder="All"
          />
          <span className="text-terminal-dim text-sm">
            Randomly select this many questions from the total
          </span>
        </div>

        {/* Access Control */}
        {!isPublic && (
          <div className="border border-terminal-accent/30 bg-terminal-accent/5 rounded p-3 space-y-2">
            <div className="text-terminal-bright text-sm font-medium">📋 Private Quiz Access Code</div>
            <div className="text-terminal-dim text-xs">
              Share this code with specific users to grant them access to your private quiz.
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Access code:</span>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => onAccessCodeChange(e.target.value)}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-32"
                placeholder="e.g., MATH101"
              />
              <button
                onClick={onGenerateAccessCode}
                className="bg-terminal-accent/20 hover:bg-terminal-accent/30 text-terminal-foreground px-3 py-1 rounded text-sm"
              >
                Generate
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span>Edit mode:</span>
          <select
            value={editMode}
            onChange={(e) => onEditModeChange(e.target.value as 'no_edits' | 'pull_requests')}
            className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
          >
            <option value="no_edits">No edits accepted</option>
            <option value="pull_requests">Pull requests accepted</option>
          </select>
        </div>
      </div>
    </div>
  );
};