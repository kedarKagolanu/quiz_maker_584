import React from 'react';
import { Quiz, QuizFolder } from '@/types/quiz';
import { QuizSource } from '@/hooks/useMultiQuizManager';
import { QuizSourceManager } from './QuizSourceManager';

interface AdvancedSettingsProps {
  showAdvancedSettings: boolean;
  onToggleAdvancedSettings: () => void;
  
  // Question Limit
  customQuestionLimit: number | null;
  onCustomQuestionLimitChange: (limit: number | null) => void;
  
  // Multi-Quiz
  multiQuizMode: boolean;
  onMultiQuizModeChange: (enabled: boolean) => void;
  preserveQuizOrder: boolean;
  onPreserveQuizOrderChange: (preserve: boolean) => void;
  quizSources: QuizSource[];
  availableQuizzes: Quiz[];
  folders: QuizFolder[];
  showQuizPicker: number | null;
  currentFolder: string;
  onAddQuizSource: () => void;
  onRemoveQuizSource: (index: number) => void;
  onUpdateQuizSource: (index: number, updates: Partial<QuizSource>) => void;
  onOpenQuizPicker: (index: number) => void;
  onCloseQuizPicker: () => void;
  onFolderChange: (folder: string) => void;
  onQuizSelect: (index: number, quiz: Quiz) => void;
  
  // Access Control
  isPublic: boolean;
  accessCode: string;
  editMode: 'no_edits' | 'pull_requests';
  onAccessCodeChange: (code: string) => void;
  onEditModeChange: (mode: 'no_edits' | 'pull_requests') => void;
  onGenerateAccessCode: () => void;
  
  // Time Controls
  perQuestionTimeLimit: string;
  onPerQuestionTimeLimitChange: (limit: string) => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  showAdvancedSettings,
  onToggleAdvancedSettings,
  customQuestionLimit,
  onCustomQuestionLimitChange,
  multiQuizMode,
  onMultiQuizModeChange,
  preserveQuizOrder,
  onPreserveQuizOrderChange,
  quizSources,
  availableQuizzes,
  folders,
  showQuizPicker,
  currentFolder,
  onAddQuizSource,
  onRemoveQuizSource,
  onUpdateQuizSource,
  onOpenQuizPicker,
  onCloseQuizPicker,
  onFolderChange,
  onQuizSelect,
  isPublic,
  accessCode,
  editMode,
  onAccessCodeChange,
  onEditModeChange,
  onGenerateAccessCode,
  perQuestionTimeLimit,
  onPerQuestionTimeLimitChange,
}) => {
  const handleCustomQuestionLimitChange = (value: string) => {
    if (value === "") {
      onCustomQuestionLimitChange(null);
    } else if (/^\d*$/.test(value)) {
      if (value === "0") {
        // Allow typing "0" but don't set it yet
        return;
      }
      const num = parseInt(value);
      if (!isNaN(num)) {
        onCustomQuestionLimitChange(num);
      }
    }
  };

  const handlePerQuestionTimeLimitChange = (value: string) => {
    // Allow empty string or positive numbers
    if (value === "" || /^\d+$/.test(value)) {
      onPerQuestionTimeLimitChange(value);
    }
  };

  const getTotalQuestionRange = () => {
    const totalMinQuestions = quizSources.reduce((sum, s) => {
      const minQuestions = typeof s.minQuestions === 'string' ? parseInt(s.minQuestions) || 0 : s.minQuestions;
      return sum + minQuestions;
    }, 0);
    
    const totalMaxQuestions = quizSources.reduce((sum, s) => {
      const maxQuestions = typeof s.maxQuestions === 'string' ? parseInt(s.maxQuestions) || 0 : s.maxQuestions;
      return sum + maxQuestions;
    }, 0);
    
    return { totalMinQuestions, totalMaxQuestions };
  };

  const validateAllSources = () => {
    return quizSources.every(source => {
      if (!source.quizId) return false;
      const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
      const totalQuestions = sourceQuiz?.questions?.length || 0;
      return source.minQuestions <= totalQuestions && 
             source.maxQuestions <= totalQuestions && 
             source.minQuestions >= 1 && 
             source.minQuestions <= source.maxQuestions;
    });
  };

  const { totalMinQuestions, totalMaxQuestions } = getTotalQuestionRange();
  const allSourcesValid = validateAllSources();
  const isQuestionLimitValid = !customQuestionLimit || customQuestionLimit >= totalMinQuestions;

  return (
    <div className="space-y-4 border-t border-terminal-accent/30 pt-6 mt-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-terminal-bright">🔧 Advanced Features</div>
        <button
          onClick={onToggleAdvancedSettings}
          className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 py-2 px-4 rounded font-medium transition-colors"
        >
          {showAdvancedSettings ? '🔼 Hide Advanced' : '🔽 Show Advanced'}
        </button>
      </div>
      
      <div className="text-sm text-terminal-dim space-y-1 mb-4">
        <div>• <strong>Question Limit:</strong> Randomly select a subset of questions</div>
        <div>• <strong>Multi-Quiz Mode:</strong> Combine questions from multiple existing quizzes</div>
        <div>• <strong>Access Control:</strong> Set private access codes and edit permissions</div>
        <div>• <strong>Time Controls:</strong> Configure quiz and per-question time limits</div>
      </div>

      {showAdvancedSettings && (
        <div className="space-y-6">
          {/* Question Limit */}
          <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🎯</span>
              <div>
                <div className="font-bold text-terminal-bright">Question Limit</div>
                <div className="text-sm text-terminal-dim">Limit how many questions to include when randomizing</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={customQuestionLimit || ""}
                onChange={(e) => handleCustomQuestionLimitChange(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value !== "" && !/^\d+$/.test(value)) {
                    onCustomQuestionLimitChange(1);
                  }
                }}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded w-24"
                placeholder="All"
              />
              <span className="text-terminal-dim">
                questions {customQuestionLimit ? `(out of total)` : '(use all questions)'}
              </span>
            </div>
            <div className="text-xs text-orange-400 mt-2">
              ⚠️ Requires "Randomize question order" to be enabled
            </div>
          </div>

          {/* Multi-Quiz Merging */}
          <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔗</span>
              <div>
                <div className="font-bold text-terminal-bright">Multi-Quiz Merging</div>
                <div className="text-sm text-terminal-dim">Combine questions from multiple existing quizzes</div>
              </div>
            </div>
            
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={multiQuizMode}
                onChange={(e) => onMultiQuizModeChange(e.target.checked)}
                className="accent-terminal-accent scale-125"
              />
              <span className="font-medium">Enable Multi-Quiz Mode</span>
            </label>

            {multiQuizMode && (
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preserveQuizOrder}
                    onChange={(e) => onPreserveQuizOrderChange(e.target.checked)}
                    className="accent-terminal-accent scale-110"
                  />
                  <span className="font-medium text-blue-300">🔄 Preserve Quiz Order</span>
                </label>
                <div className="text-xs text-terminal-dim mt-1 ml-6 space-y-1">
                  <div>✅ <strong>Enabled:</strong> [Q1 shuffled, Q2 shuffled, Q3 shuffled] - questions stay in quiz groups</div>
                  <div>❌ <strong>Disabled:</strong> [Q1, Q3, Q2 mixed] - fully random mix across all sources</div>
                </div>
              </div>
            )}

            {multiQuizMode && (
              <>
                <QuizSourceManager
                  quizSources={quizSources}
                  availableQuizzes={availableQuizzes}
                  folders={folders}
                  showQuizPicker={showQuizPicker}
                  currentFolder={currentFolder}
                  onAddSource={onAddQuizSource}
                  onRemoveSource={onRemoveQuizSource}
                  onUpdateSource={onUpdateQuizSource}
                  onOpenPicker={onOpenQuizPicker}
                  onClosePicker={onCloseQuizPicker}
                  onFolderChange={onFolderChange}
                  onQuizSelect={onQuizSelect}
                />
                
                {/* Summary */}
                {quizSources.length > 0 && (
                  <div className={`border p-3 rounded mt-4 ${
                    allSourcesValid && isQuestionLimitValid
                      ? 'bg-blue-500/10 border-blue-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className={`font-medium mb-2 ${
                      allSourcesValid && isQuestionLimitValid 
                        ? 'text-blue-300' 
                        : 'text-red-300'
                    }`}>
                      {allSourcesValid && isQuestionLimitValid ? '📊 Total Questions Summary:' : '⚠️ Configuration Issues:'}
                    </div>
                    
                    {!allSourcesValid && (
                      <div className="text-sm text-red-400 mb-2">
                        ❌ Some quiz sources have invalid ranges. Fix them above.
                      </div>
                    )}
                    
                    {!isQuestionLimitValid && (
                      <div className="text-sm text-red-400 mb-2">
                        ❌ Question limit ({customQuestionLimit}) is less than minimum required ({totalMinQuestions})
                      </div>
                    )}
                    
                    <div className="text-sm text-terminal-dim">
                      Minimum: <span className={`font-bold ${allSourcesValid ? 'text-green-400' : 'text-red-400'}`}>
                        {totalMinQuestions}
                      </span> questions
                    </div>
                    <div className="text-sm text-terminal-dim">
                      Maximum: <span className={`font-bold ${allSourcesValid ? 'text-blue-400' : 'text-red-400'}`}>
                        {totalMaxQuestions}
                      </span> questions
                    </div>
                    {customQuestionLimit && (
                      <div className={`text-sm mt-1 ${isQuestionLimitValid ? 'text-yellow-400' : 'text-red-400'}`}>
                        {isQuestionLimitValid ? '⚠️' : '❌'} Final quiz will be limited to {customQuestionLimit} questions
                      </div>
                    )}
                    
                    {allSourcesValid && isQuestionLimitValid && (
                      <div className="text-sm text-green-400 mt-1">
                        ✅ Ready to create multi-quiz!
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Access Control */}
          <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔒</span>
              <div>
                <div className="font-bold text-terminal-bright">Access Control</div>
                <div className="text-sm text-terminal-dim">Configure privacy settings and edit permissions</div>
              </div>
            </div>
            
            {!isPublic && (
              <div className="border border-terminal-accent/30 bg-terminal-accent/5 rounded p-3 space-y-2 mb-4">
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

          {/* Time Controls */}
          <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⏱️</span>
              <div>
                <div className="font-bold text-terminal-bright">Time Controls</div>
                <div className="text-sm text-terminal-dim">Set quiz-wide or per-question time limits</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span>Per-question time limit (seconds):</span>
                <input
                  type="text"
                  value={perQuestionTimeLimit}
                  onChange={(e) => handlePerQuestionTimeLimitChange(e.target.value)}
                  className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24"
                  placeholder="None"
                />
                <span className="text-terminal-dim text-sm">
                  Each question gets this time limit (disables navigation back)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};