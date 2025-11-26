import { useState, useCallback } from 'react';
import { Quiz } from '@/types/quiz';
import { getRecursiveQuestionCount, validateRecursiveQuizSource } from '@/lib/recursiveQuizResolver';
import { StorageService } from '@/lib/storage';

export interface QuizSource {
  quizId: string;
  minQuestions: number | string;
  maxQuestions: number | string;
  fixedCount: boolean;
  sectionName?: string;
}

export interface MultiQuizState {
  multiQuizMode: boolean;
  quizSources: QuizSource[];
  preserveQuizOrder: boolean;
  showQuizPicker: number | null;
  activeSourceIndex: number;
  currentFolder: string;
  folderHistory: string[];
}

const initialState: MultiQuizState = {
  multiQuizMode: false,
  quizSources: [],
  preserveQuizOrder: false,
  showQuizPicker: null,
  activeSourceIndex: -1,
  currentFolder: '',
  folderHistory: [''],
};

export const useMultiQuizManager = () => {
  const [state, setState] = useState<MultiQuizState>(initialState);

  const updateState = useCallback((updates: Partial<MultiQuizState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setMultiQuizMode = useCallback((mode: boolean) => {
    updateState({ multiQuizMode: mode });
  }, [updateState]);

  const setPreserveQuizOrder = useCallback((preserve: boolean) => {
    updateState({ preserveQuizOrder: preserve });
  }, [updateState]);

  const addQuizSource = useCallback(() => {
    setState(prev => ({
      ...prev,
      quizSources: [...prev.quizSources, {
        quizId: "",
        minQuestions: 1,
        maxQuestions: 5,
        fixedCount: false
      }]
    }));
  }, []);

  const removeQuizSource = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      quizSources: prev.quizSources.filter((_, i) => i !== index)
    }));
  }, []);

  const updateQuizSource = useCallback((index: number, updates: Partial<QuizSource>) => {
    setState(prev => ({
      ...prev,
      quizSources: prev.quizSources.map((source, i) => 
        i === index ? { ...source, ...updates } : source
      )
    }));
  }, []);

  const openQuizPicker = useCallback((index: number) => {
    updateState({
      showQuizPicker: index,
      activeSourceIndex: index,
      currentFolder: ''
    });
  }, [updateState]);

  const closeQuizPicker = useCallback(() => {
    updateState({
      showQuizPicker: null,
      activeSourceIndex: -1
    });
  }, [updateState]);

  const setCurrentFolder = useCallback((folder: string) => {
    updateState({ currentFolder: folder });
  }, [updateState]);

  const selectQuizForSource = useCallback((index: number, quiz: Quiz) => {
    const updates: Partial<QuizSource> = {
      quizId: quiz.id,
    };
    
    // Auto-populate section name if not set
    if (!state.quizSources[index]?.sectionName) {
      updates.sectionName = quiz.title;
    }
    
    updateQuizSource(index, updates);
    closeQuizPicker();
  }, [state.quizSources, updateQuizSource, closeQuizPicker]);

  const validateQuizSources = useCallback(async (availableQuizzes: Quiz[], storage: StorageService, overallQuestionLimit?: number) => {
    const errors: string[] = [];
    
    // First, validate that sum of minimums doesn't exceed overall limit
    if (overallQuestionLimit) {
      const totalMinimumQuestions = state.quizSources.reduce((sum, source) => {
        const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
        return sum + minQuestions;
      }, 0);

      if (totalMinimumQuestions > overallQuestionLimit) {
        errors.push(`Sum of minimum questions (${totalMinimumQuestions}) exceeds overall question limit (${overallQuestionLimit}). Either reduce minimum values or increase the overall limit.`);
      }
    }
    
    for (let i = 0; i < state.quizSources.length; i++) {
      const source = state.quizSources[i];
      
      if (!source.quizId) {
        errors.push(`Quiz Source #${i + 1}: Please select a quiz`);
        continue;
      }

      const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
      if (!sourceQuiz) {
        errors.push(`Quiz Source #${i + 1}: Selected quiz not found`);
        continue;
      }

      // Use the recursive validation function which now only does basic validation
      try {
        const recursiveErrors = await validateRecursiveQuizSource(source, storage, i);
        errors.push(...recursiveErrors);
      } catch (error) {
        errors.push(`Quiz Source #${i + 1}: Error validating quiz - ${error}`);
      }

      // Fixed count validation (not covered by recursive validator)
      const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
      const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0;
      
      if (source.fixedCount && minQuestions !== maxQuestions) {
        errors.push(`Quiz Source #${i + 1}: Fixed count mode requires minimum and maximum to be equal`);
      }
    }
    
    return errors;
  }, [state.quizSources]);

  const getTotalQuestionRange = useCallback(async (availableQuizzes: Quiz[], storage: StorageService) => {
    let totalMinQuestions = 0;
    let totalMaxQuestions = 0;
    
    for (const source of state.quizSources) {
      const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
      const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0;
      
      if (source.quizId) {
        try {
          const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
          if (sourceQuiz) {
            // Get recursive question count to ensure we don't exceed available questions
            const resolvedInfo = await getRecursiveQuestionCount(sourceQuiz, storage);
            const availableQuestions = resolvedInfo.totalQuestions;
            
            totalMinQuestions += Math.min(minQuestions, availableQuestions);
            totalMaxQuestions += Math.min(maxQuestions, availableQuestions);
          } else {
            // Fallback if quiz not found
            totalMinQuestions += minQuestions;
            totalMaxQuestions += maxQuestions;
          }
        } catch (error) {
          console.error(`Error getting question count for source ${source.quizId}:`, error);
          // Fallback to configured values
          totalMinQuestions += minQuestions;
          totalMaxQuestions += maxQuestions;
        }
      }
    }
    
    return { totalMinQuestions, totalMaxQuestions };
  }, [state.quizSources]);

  const loadMultiQuizConfiguration = useCallback((quiz: Quiz) => {
    if (quiz.multiQuizSources) {
      updateState({
        multiQuizMode: true,
        quizSources: (quiz.multiQuizSources.sources || []).map(s => ({
          quizId: s.quizId,
          minQuestions: s.minQuestions,
          maxQuestions: s.maxQuestions,
          fixedCount: s.fixedCount,
          sectionName: s.sectionName || ''
        })),
        preserveQuizOrder: quiz.multiQuizSources.preserveQuizOrder || false
      });
    } else {
      updateState({
        multiQuizMode: false,
        quizSources: []
      });
    }
  }, [updateState]);

  return {
    state,
    actions: {
      setMultiQuizMode,
      setPreserveQuizOrder,
      addQuizSource,
      removeQuizSource,
      updateQuizSource,
      openQuizPicker,
      closeQuizPicker,
      setCurrentFolder,
      selectQuizForSource,
      validateQuizSources,
      getTotalQuestionRange,
      loadMultiQuizConfiguration,
    }
  };
};