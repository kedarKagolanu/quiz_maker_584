import { useState, useCallback } from 'react';
import { Quiz } from '@/types/quiz';

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

  const validateQuizSources = useCallback((availableQuizzes: Quiz[]) => {
    const errors: string[] = [];
    
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

      const totalQuestions = sourceQuiz.questions?.length || 0;
      const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
      const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0;
      
      // Comprehensive validation
      if (minQuestions < 1) {
        errors.push(`Quiz Source #${i + 1}: Minimum questions must be at least 1`);
      }
      
      if (maxQuestions < 1) {
        errors.push(`Quiz Source #${i + 1}: Maximum questions must be at least 1`);
      }
      
      if (minQuestions > totalQuestions) {
        errors.push(`Quiz Source #${i + 1}: Minimum (${minQuestions}) exceeds available questions (${totalQuestions}) in "${sourceQuiz.title}"`);
      }

      if (maxQuestions > totalQuestions) {
        errors.push(`Quiz Source #${i + 1}: Maximum (${maxQuestions}) exceeds available questions (${totalQuestions}) in "${sourceQuiz.title}"`);
      }

      if (minQuestions > maxQuestions) {
        errors.push(`Quiz Source #${i + 1}: Minimum (${minQuestions}) cannot be greater than maximum (${maxQuestions})`);
      }
      
      // Fixed count validation
      if (source.fixedCount && minQuestions !== maxQuestions) {
        errors.push(`Quiz Source #${i + 1}: Fixed count mode requires minimum and maximum to be equal`);
      }
    }
    
    return errors;
  }, [state.quizSources]);

  const getTotalQuestionRange = useCallback(() => {
    const totalMinQuestions = state.quizSources.reduce((sum, s) => {
      const minQuestions = typeof s.minQuestions === 'string' ? parseInt(s.minQuestions) || 0 : s.minQuestions || 0;
      return sum + minQuestions;
    }, 0);
    
    const totalMaxQuestions = state.quizSources.reduce((sum, s) => {
      const maxQuestions = typeof s.maxQuestions === 'string' ? parseInt(s.maxQuestions) || 0 : s.maxQuestions || 0;
      return sum + maxQuestions;
    }, 0);
    
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