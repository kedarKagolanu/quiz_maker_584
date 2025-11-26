import React, { useState, useEffect } from 'react';
import { Quiz, QuizFolder } from '@/types/quiz';
import { QuizSource } from '@/hooks/useMultiQuizManager';
import { QuizPicker } from './QuizPicker';
import { getDisplayQuestionCount } from '@/lib/recursiveQuizResolver';
import { storage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [validationStates, setValidationStates] = useState<Map<number, boolean>>(new Map());
  const [questionCounts, setQuestionCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now()); // Force re-renders for validation

  // Update validation states when sources change
  useEffect(() => {
    const newStates = new Map<number, boolean>();
    quizSources.forEach((source, idx) => {
      if (source.quizId) {
        const validation = validateSource(source, idx);
        newStates.set(idx, validation?.isValid || false);
      }
    });
    setValidationStates(newStates);
  }, [quizSources, questionCounts, loading, lastUpdate]);

  // Load recursive question counts for all available quizzes
  useEffect(() => {
    const loadQuestionCounts = async () => {
      if (availableQuizzes.length === 0) return;
      
      setLoading(true);
      const counts = new Map<string, number>();
      
      // Load recursive counts for all available quizzes
      await Promise.all(
        availableQuizzes.map(async (quiz) => {
          try {
            const count = await getDisplayQuestionCount(quiz, storage);
            counts.set(quiz.id, count);
          } catch (error) {
            console.error(`Error getting recursive count for ${quiz.id}:`, error);
            counts.set(quiz.id, quiz.questions?.length || 0);
          }
        })
      );
      
      setQuestionCounts(counts);
      setLoading(false);
      console.log(`📊 Loaded recursive question counts for ${counts.size} quizzes:`, 
        Object.fromEntries(Array.from(counts.entries()).map(([id, count]) => [
          availableQuizzes.find(q => q.id === id)?.title || id, count
        ]))
      );
    };

    loadQuestionCounts();
  }, [availableQuizzes]);
  const handleSourceFieldUpdate = (index: number, field: keyof QuizSource, value: any) => {
    onUpdateSource(index, { [field]: value });
  };

  const handleSourceValidation = (sourceIndex: number, isValid: boolean, issues: string[]) => {
    setValidationStates(prev => new Map(prev.set(sourceIndex, isValid)));
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
      
      // Force immediate re-render to show validation
      setTimeout(() => {
        const updatedSource = { ...quizSources[index], ...updates };
        const sourceQuiz = availableQuizzes.find(q => q.id === updatedSource.quizId);
        if (sourceQuiz) {
          const totalQuestions = questionCounts.get(sourceQuiz.id) || sourceQuiz.questions?.length || 0;
          const minVal = typeof updates.minQuestions !== 'undefined' ? updates.minQuestions : updatedSource.minQuestions;
          const maxVal = typeof updates.maxQuestions !== 'undefined' ? updates.maxQuestions : updatedSource.maxQuestions;
          
          console.log(`🔄 Real-time validation for Source ${index + 1}:`, {
            field,
            newValue: value,
            minVal,
            maxVal,
            totalQuestions,
            willTriggerValidation: true
          });
        }
      }, 100);
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

  const validateSource = (source: QuizSource, idx: number) => {
    if (!source.quizId) return null;
    
    const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
    if (!sourceQuiz) return null;
    
    // Use recursive question count for multi-quizzes
    const totalQuestions = questionCounts.get(sourceQuiz.id) || sourceQuiz.questions?.length || 0;
    
    // If still loading question counts, use fallback but mark as potentially inaccurate
    const isLoadingCounts = loading && !questionCounts.has(sourceQuiz.id);
    
    // Debug logging for validation
    console.log(`🔍 Validating source ${idx + 1}: Quiz "${sourceQuiz.title}" has ${totalQuestions} total questions (recursive: ${questionCounts.has(sourceQuiz.id)}, loading: ${isLoadingCounts})`);
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
      isValidFixedCount,
      isLoadingCounts
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
                        onChange={(e) => {
                          handleQuestionCountChange(idx, 'minQuestions', e.target.value);
                          // Force immediate validation update
                          setLastUpdate(Date.now());
                        }}
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
                          onChange={(e) => {
                            handleQuestionCountChange(idx, 'maxQuestions', e.target.value);
                            // Force immediate validation update
                            setLastUpdate(Date.now());
                          }}
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
                  
                  {/* Quiz Information and Question Count */}
                  {source.quizId && (() => {
                    const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
                    const recursiveCount = questionCounts.get(source.quizId);
                    const directCount = sourceQuiz?.questions?.length || 0;
                    const isMultiQuiz = sourceQuiz?.multiQuizSources;
                    
                    return (
                      <div className="mt-2 p-2 bg-terminal-accent/5 border border-terminal-accent/20 rounded text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400">{isMultiQuiz ? '🔗' : '📄'}</span>
                          <span className="font-medium text-terminal-bright">
                            {isMultiQuiz ? 'Multi-Quiz' : 'Single Quiz'}: "{sourceQuiz?.title}"
                          </span>
                        </div>
                        <div className="text-terminal-dim space-y-1">
                          {loading && !recursiveCount ? (
                            <div className="text-yellow-400">🔄 Calculating total questions...</div>
                          ) : (
                            <>
                              <div>
                                📊 Total questions available: <span className="font-bold text-terminal-bright">
                                  {recursiveCount || directCount}
                                </span>
                                {isMultiQuiz && recursiveCount !== directCount && (
                                  <span className="text-blue-400"> (from {sourceQuiz?.multiQuizSources?.sources?.length || 0} sources)</span>
                                )}
                              </div>
                              {isMultiQuiz && (
                                <div className="text-blue-400">
                                  ⚡ This is a multi-quiz that combines questions from multiple sources
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* DEBUG: Force console output */}
                  {console.log(`🔍 RENDERING Source ${idx + 1}:`, {
                    quizId: source.quizId,
                    minQuestions: source.minQuestions,
                    maxQuestions: source.maxQuestions,
                    questionCountsLoaded: questionCounts.size,
                    loading
                  })}
                  {source.quizId ? (() => {
                    const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
                    if (!sourceQuiz) {
                      return (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-300">
                          <div className="font-bold mb-1">❌ Error</div>
                          <div>Quiz not found in available quizzes</div>
                        </div>
                      );
                    }

                    const recursiveCount = questionCounts.get(sourceQuiz.id);
                    const directCount = sourceQuiz.questions?.length || 0;
                    const totalQuestions = recursiveCount || directCount;
                    const isLoadingCounts = loading && !questionCounts.has(sourceQuiz.id);
                    const isMultiQuiz = sourceQuiz.multiQuizSources;
                    
                    const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
                    const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0;
                    
                    // FORCE DEBUG OUTPUT
                    console.log(`🔍 VALIDATION DATA for Source ${idx + 1}:`, {
                      sourceTitle: sourceQuiz.title,
                      totalQuestions,
                      minQuestions,
                      maxQuestions,
                      recursiveCount,
                      directCount,
                      isLoadingCounts
                    });
                    
                    // FORCE validation calculation - this WILL show
                    const isValidMin = minQuestions >= 1 && minQuestions <= totalQuestions;
                    const isValidMax = maxQuestions >= 1 && maxQuestions <= totalQuestions;
                    const isValidRange = minQuestions <= maxQuestions;
                    const isValidFixedCount = !source.fixedCount || (source.fixedCount && minQuestions === maxQuestions);
                    const isValid = isValidMin && isValidMax && isValidRange && isValidFixedCount;
                    
                    return (
                      <div key={`source-${idx}-validation-${lastUpdate}-${source.minQuestions}-${source.maxQuestions}`} className="mt-3 space-y-3">
                        {/* FORCE VISIBLE Quiz Info - DEBUGGING */}
                        <div className="p-4 bg-blue-500/20 border-2 border-blue-500/50 rounded-lg mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-blue-400 text-2xl">{isMultiQuiz ? '🔗' : '📄'}</span>
                            <div className="flex-1">
                              <div className="text-lg font-bold text-blue-300 mb-1">
                                {isMultiQuiz ? 'Multi-Quiz' : 'Single Quiz'}: "{sourceQuiz.title}"
                              </div>
                              <div className="text-base font-bold text-white">
                                {isLoadingCounts ? (
                                  <span className="text-yellow-400 animate-pulse">🔄 Calculating total questions...</span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>📊</span>
                                    <span className="bg-white text-blue-600 px-2 py-1 rounded font-bold">
                                      {totalQuestions} TOTAL QUESTIONS IMPORTED
                                    </span>
                                    {isMultiQuiz && recursiveCount && recursiveCount !== directCount && (
                                      <span className="text-blue-300">(from multiple sources)</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* FORCE VISIBLE Validation Status - DEBUGGING */}
                        <div className={`p-4 rounded-lg border-2 ${
                          isLoadingCounts 
                            ? 'text-yellow-300 bg-yellow-500/20 border-yellow-500/50'
                            : isValid 
                              ? 'text-green-300 bg-green-500/20 border-green-500/50' 
                              : 'text-red-300 bg-red-500/20 border-red-500/50'
                        }`}>
                          <div className="font-bold text-xl mb-3 flex items-center gap-2">
                            {isLoadingCounts ? (
                              <>🔄 <span>VALIDATION STATUS: LOADING...</span></>
                            ) : isValid ? (
                              <>✅ <span className="text-green-400">VALIDATION STATUS: VALID</span></>
                            ) : (
                              <>❌ <span className="text-red-400">VALIDATION STATUS: INVALID</span></>
                            )}
                          </div>
                          
                          {isLoadingCounts ? (
                            <div className="text-sm">Calculating question counts...</div>
                          ) : isValid ? (
                            <div className="text-sm space-y-1">
                              <div>✅ Configuration is valid</div>
                              <div>Will select {source.fixedCount ? 
                                `exactly ${minQuestions}` : 
                                `${minQuestions} to ${maxQuestions}`} 
                              questions from {totalQuestions} available</div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="font-medium">Configuration problems:</div>
                              <div className="space-y-1 text-sm">
                                {!isValidMin && minQuestions < 1 && (
                                  <div className="flex items-center gap-2">
                                    <span>❌</span>
                                    <span>Minimum must be at least 1 (you entered: {minQuestions})</span>
                                  </div>
                                )}
                                {!isValidMin && minQuestions > totalQuestions && (
                                  <div className="flex items-center gap-2">
                                    <span>❌</span>
                                    <span>Minimum ({minQuestions}) exceeds available questions ({totalQuestions})</span>
                                  </div>
                                )}
                                {!isValidMax && maxQuestions > totalQuestions && (
                                  <div className="flex items-center gap-2">
                                    <span>❌</span>
                                    <span>Maximum ({maxQuestions}) exceeds available questions ({totalQuestions})</span>
                                  </div>
                                )}
                                {!isValidRange && minQuestions > maxQuestions && (
                                  <div className="flex items-center gap-2">
                                    <span>❌</span>
                                    <span>Minimum ({minQuestions}) cannot be greater than maximum ({maxQuestions})</span>
                                  </div>
                                )}
                                {!isValidFixedCount && (
                                  <div className="flex items-center gap-2">
                                    <span>❌</span>
                                    <span>Fixed count mode requires minimum and maximum to be equal</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="mt-3 p-3 bg-gray-500/10 border border-gray-500/30 rounded text-center text-gray-400">
                      Please select a quiz to see validation and question count information
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

      {/* Overall Validation Summary */}
      {quizSources.length > 0 && (() => {
        const allValidations = quizSources.map((source, idx) => validateSource(source, idx)).filter(Boolean);
        const allValid = allValidations.every(v => v?.isValid);
        const anyLoading = allValidations.some(v => v?.isLoadingCounts);
        
        // Calculate totals for summary
        const totalMinQuestions = allValidations.reduce((sum, v) => sum + (v?.minQuestions || 0), 0);
        const totalMaxQuestions = allValidations.reduce((sum, v) => sum + (v?.maxQuestions || 0), 0);
        const totalAvailableQuestions = allValidations.reduce((sum, v) => sum + (v?.totalQuestions || 0), 0);
        
        // Additional validation rules
        const hasValidSources = allValidations.length > 0;
        const allSourcesSelected = quizSources.every(s => s.quizId);
        
        return (
          <div className={`border p-4 rounded-lg mt-4 ${
            anyLoading 
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : allValid && allSourcesSelected
                ? 'bg-blue-500/10 border-blue-500/30' 
                : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className={`font-medium mb-3 ${
              anyLoading 
                ? 'text-yellow-300'
                : allValid && allSourcesSelected 
                  ? 'text-blue-300' 
                  : 'text-red-300'
            }`}>
              {anyLoading 
                ? '🔄 Validating Sources...'
                : allValid && allSourcesSelected 
                  ? '📊 Multi-Quiz Configuration Summary' 
                  : '⚠️ Configuration Issues Found'
              }
            </div>
            
            {!allSourcesSelected && (
              <div className="text-sm text-red-400 mb-2">
                ❌ Please select a quiz for all sources
              </div>
            )}
            
            {!allValid && allSourcesSelected && (
              <div className="text-sm text-red-400 mb-2">
                ❌ Some sources have invalid configurations (see individual source validation above)
              </div>
            )}
            
            {hasValidSources && allSourcesSelected && (
              <div className="text-sm space-y-1">
                <div className="text-terminal-dim">
                  <span className="font-medium">Sources:</span> {quizSources.length} quiz{quizSources.length !== 1 ? 'es' : ''}
                </div>
                <div className="text-terminal-dim">
                  <span className="font-medium">Total available questions:</span> {totalAvailableQuestions}
                </div>
                <div className="text-terminal-dim">
                  <span className="font-medium">Question range:</span> {totalMinQuestions} - {totalMaxQuestions} questions
                </div>
                
                {allValid && (
                  <div className="text-green-400 text-sm mt-2 flex items-center gap-2">
                    <span>✅</span>
                    <span>Ready to create multi-quiz!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};