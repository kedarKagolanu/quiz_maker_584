import React from 'react';
import { Quiz, QuizFolder } from '@/types/quiz';
import { QuizSource } from '@/hooks/useMultiQuizManager';
import { QuizPicker } from './QuizPicker';

interface QuizSourceManagerProps {
  quizSources: QuizSource[];
  availableQuizzes: Quiz[];
  folders: QuizFolder[];
  showQuizPicker: number | null;
  currentFolder: string;
  onAddSource: () => void;
  onRemoveSource: (index: number) => void;
  onUpdateSource: (index: number, updates: Partial<QuizSource>) => void;
  onOpenPicker: (index: number) => void;
  onClosePicker: () => void;
  onFolderChange: (folder: string) => void;
  onQuizSelect: (index: number, quiz: Quiz) => void;
}

export const QuizSourceManager: React.FC<QuizSourceManagerProps> = ({
  quizSources,
  availableQuizzes,
  folders,
  showQuizPicker,
  currentFolder,
  onAddSource,
  onRemoveSource,
  onUpdateSource,
  onOpenPicker,
  onClosePicker,
  onFolderChange,
  onQuizSelect,
}) => {
  const handleSourceFieldUpdate = (index: number, field: keyof QuizSource, value: any) => {
    onUpdateSource(index, { [field]: value });
  };

  const handleQuestionCountChange = (index: number, field: 'minQuestions' | 'maxQuestions', value: string) => {
    // Allow empty string or digits (including while typing)
    if (value === "" || /^\d*$/.test(value)) {
      const updates: Partial<QuizSource> = {};
      
      if (value === "" || value === "0") {
        updates[field] = "";
      } else {
        const numValue = parseInt(value);
        updates[field] = numValue;
      }
      
      // If fixed count mode, sync both values
      if (quizSources[index].fixedCount && field === 'minQuestions') {
        updates.maxQuestions = updates[field];
      }
      
      onUpdateSource(index, updates);
    }
  };

  const handleQuestionCountBlur = (index: number, field: 'minQuestions' | 'maxQuestions') => {
    const source = quizSources[index];
    const value = source[field];
    
    // Convert empty strings or invalid values to minimum valid value
    if (value === "" || value === null || value === undefined || (typeof value === 'number' && value < 1)) {
      const minVal = field === 'maxQuestions' 
        ? Math.max(typeof source.minQuestions === 'number' ? source.minQuestions : 1, 1)
        : 1;
      
      const updates: Partial<QuizSource> = { [field]: minVal };
      if (source.fixedCount && field === 'minQuestions') {
        updates.maxQuestions = minVal;
      }
      
      onUpdateSource(index, updates);
    }
  };

  const validateSource = (source: QuizSource, index: number) => {
    if (!source.quizId) return null;
    
    const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
    if (!sourceQuiz) return null;
    
    const totalQuestions = sourceQuiz.questions?.length || 0;
    const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
    const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0;
    
    // Validation rules:
    // 1. Min must be at least 1
    // 2. Min must be <= total questions available
    // 3. Max must be <= total questions available  
    // 4. Min must be <= Max
    // 5. For fixed count mode, min === max
    
    const isValidMin = minQuestions >= 1 && minQuestions <= totalQuestions;
    const isValidMax = maxQuestions >= 1 && maxQuestions <= totalQuestions;
    const isValidRange = minQuestions <= maxQuestions;
    const isValidFixedCount = !source.fixedCount || (source.fixedCount && minQuestions === maxQuestions);
    
    const isValid = isValidMin && isValidMax && isValidRange && isValidFixedCount;
    
    return {
      isValid,
      sourceQuiz,
      totalQuestions,
      minQuestions,
      maxQuestions,
      isValidMin,
      isValidMax,
      isValidRange,
      isValidFixedCount
    };
  };

  return (
    <div className="space-y-4 border border-yellow-500/30 bg-yellow-500/5 rounded p-4">
      <div className="flex items-center gap-2 text-yellow-300 font-medium">
        <span>⚡</span>
        <span>Quiz Sources Configuration</span>
      </div>
      
      {quizSources.length === 0 ? (
        <div className="text-center py-4 text-terminal-dim">
          <div className="text-2xl mb-2">📝</div>
          <div>No quiz sources added yet</div>
          <div className="text-xs">Click "Add First Quiz Source" to get started</div>
        </div>
      ) : (
        <div className="space-y-3">
          {quizSources.map((source, idx) => {
            const validation = validateSource(source, idx);
            
            return (
              <div key={idx} className="bg-terminal-accent/10 border border-terminal-accent/30 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-terminal-accent/30 text-terminal-bright px-2 py-1 rounded text-xs font-bold">
                    SOURCE #{idx + 1}
                  </span>
                  <button
                    onClick={() => onRemoveSource(idx)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 px-2 py-1 rounded text-xs"
                  >
                    🗑️ Remove
                  </button>
                </div>
                
                <div className="grid gap-3">
                  <div>
                    <label className="text-sm font-medium text-terminal-bright mb-1 block">Select Quiz:</label>
                    
                    {/* Quiz Selection Button */}
                    <div className="space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => onOpenPicker(idx)}
                        className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded hover:bg-terminal-accent/10 transition-colors text-left"
                      >
                        {source.quizId ? (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-green-400">📚 {availableQuizzes.find(q => q.id === source.quizId)?.title || 'Unknown'}</span>
                              <div className="text-xs text-terminal-dim">
                                {availableQuizzes.find(q => q.id === source.quizId)?.questions?.length || 0} questions
                              </div>
                            </div>
                            <span className="text-blue-400">✓</span>
                          </div>
                        ) : (
                          <span className="text-terminal-dim">🔍 Click to choose a quiz...</span>
                        )}
                      </button>
                      
                      {/* Quiz Picker */}
                      <QuizPicker
                        isOpen={showQuizPicker === idx}
                        currentFolder={currentFolder}
                        folders={folders}
                        availableQuizzes={availableQuizzes}
                        onClose={onClosePicker}
                        onFolderChange={onFolderChange}
                        onQuizSelect={(quiz) => onQuizSelect(idx, quiz)}
                      />
                      
                      {/* Clear Selection Button */}
                      {source.quizId && (
                        <button
                          type="button"
                          onClick={() => handleSourceFieldUpdate(idx, 'quizId', '')}
                          className="text-xs text-red-400 hover:text-red-300 underline"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-terminal-bright mb-1 block">
                      Section Name:
                    </label>
                    <input
                      type="text"
                      value={source.sectionName || ''}
                      onChange={(e) => handleSourceFieldUpdate(idx, 'sectionName', e.target.value)}
                      placeholder={source.quizId ? availableQuizzes.find(q => q.id === source.quizId)?.title || 'Section Name' : 'Section Name'}
                      className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                    />
                    <div className="text-xs text-terminal-dim mt-1">
                      {source.quizId ? (
                        <span>Auto-populated from quiz: "{availableQuizzes.find(q => q.id === source.quizId)?.title}" (you can edit this)</span>
                      ) : (
                        <span>Will be auto-populated when you select a quiz</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-terminal-bright mb-1 block">
                        {source.fixedCount ? 'Exact Questions:' : 'Minimum Questions:'}
                      </label>
                      <input
                        type="text"
                        value={source.minQuestions || ""}
                        onChange={(e) => handleQuestionCountChange(idx, 'minQuestions', e.target.value)}
                        onBlur={() => handleQuestionCountBlur(idx, 'minQuestions')}
                        className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                        placeholder="1"
                      />
                    </div>
                    
                    {!source.fixedCount && (
                      <div className="flex-1">
                        <label className="text-sm font-medium text-terminal-bright mb-1 block">Maximum Questions:</label>
                        <input
                          type="text"
                          value={source.maxQuestions || ""}
                          onChange={(e) => handleQuestionCountChange(idx, 'maxQuestions', e.target.value)}
                          onBlur={() => handleQuestionCountBlur(idx, 'maxQuestions')}
                          className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                          placeholder="5"
                        />
                      </div>
                    )}
                    
                    <div className="flex flex-col items-center gap-2">
                      <label className="text-xs font-medium text-terminal-bright">Fixed Count?</label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={source.fixedCount}
                          onChange={(e) => {
                            const updates: Partial<QuizSource> = { fixedCount: e.target.checked };
                            if (e.target.checked) {
                              updates.maxQuestions = source.minQuestions;
                            }
                            onUpdateSource(idx, updates);
                          }}
                          className="accent-terminal-accent scale-125"
                        />
                        <span className="text-xs text-terminal-dim">
                          {source.fixedCount ? '📌 Exact' : '🎲 Range'}
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Validation Display */}
                  {validation && (
                    <div className={`text-xs p-2 rounded border ${
                      validation.isValid 
                        ? 'text-green-300 bg-green-500/10 border-green-500/30' 
                        : 'text-red-300 bg-red-500/10 border-red-500/30'
                    }`}>
                      {validation.isValid ? (
                        <>
                          ✅ Will include {source.fixedCount ? 
                            `exactly ${validation.minQuestions}` : 
                            `${validation.minQuestions}-${validation.maxQuestions}`} 
                          questions from this quiz (has {validation.totalQuestions} total)
                        </>
                      ) : (
                        <>
                          ❌ Configuration error: 
                          {!validation.isValidMin && validation.minQuestions < 1 && (
                            <> Minimum must be at least 1.</>
                          )}
                          {!validation.isValidMin && validation.minQuestions > validation.totalQuestions && (
                            <> Minimum ({validation.minQuestions}) exceeds available questions ({validation.totalQuestions}).</>
                          )}
                          {!validation.isValidMax && validation.maxQuestions < 1 && (
                            <> Maximum must be at least 1.</>
                          )}
                          {!validation.isValidMax && validation.maxQuestions > validation.totalQuestions && (
                            <> Maximum ({validation.maxQuestions}) exceeds available questions ({validation.totalQuestions}).</>
                          )}
                          {!validation.isValidRange && validation.minQuestions > validation.maxQuestions && (
                            <> Minimum ({validation.minQuestions}) cannot be greater than maximum ({validation.maxQuestions}).</>
                          )}
                          {!validation.isValidFixedCount && source.fixedCount && (
                            <> Fixed count mode requires minimum and maximum to be equal.</>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <button
        onClick={onAddSource}
        className="w-full bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 py-2 px-4 rounded font-medium"
      >
        ➕ {quizSources.length === 0 ? 'Add First Quiz Source' : 'Add Another Quiz Source'}
      </button>
    </div>
  );
};