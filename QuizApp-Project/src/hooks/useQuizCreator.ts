import { useState, useCallback } from 'react';
import { Quiz } from '@/types/quiz';
import { storage } from '@/lib/storage';
import { validateInput, quizQuestionsSchema, quizTitleSchema } from '@/lib/validation';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

export interface QuizCreatorState {
  title: string;
  isPublic: boolean;
  timeLimit: string;
  perQuestionTimeLimit: string;
  isTimeLimitAutoCalculated: boolean;
  randomize: boolean;
  layout: 'default' | 'split';
  folderPath: string;
  accessCode: string;
  editMode: 'no_edits' | 'pull_requests';
  customQuestionLimit: number | null;
  imageSize: 'small' | 'medium' | 'large' | 'xlarge';
  jsonInput: string;
  jsonError: string;
  errorLine: number | null;
  errorColumn: number | null;
  validationErrors: ValidationError[];
}

interface ValidationError {
  type: 'question_limit' | 'json_parse' | 'json_structure' | 'multi_quiz' | 'general';
  message: string;
  details?: string;
  solution?: string;
}

export interface QuizCreatorActions {
  setTitle: (title: string) => void;
  setIsPublic: (isPublic: boolean) => void;
  setTimeLimit: (timeLimit: string) => void;
  setPerQuestionTimeLimit: (timeLimit: string) => void;
  setIsTimeLimitAutoCalculated: (calculated: boolean) => void;
  setRandomize: (randomize: boolean) => void;
  setLayout: (layout: 'default' | 'split') => void;
  setFolderPath: (path: string) => void;
  setAccessCode: (code: string) => void;
  setEditMode: (mode: 'no_edits' | 'pull_requests') => void;
  setCustomQuestionLimit: (limit: number | null) => void;
  setImageSize: (size: 'small' | 'medium' | 'large' | 'xlarge') => void;
  setJsonInput: (input: string) => void;
  setJsonError: (error: string) => void;
  setErrorLine: (line: number | null) => void;
  setErrorColumn: (column: number | null) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  addValidationError: (error: ValidationError) => void;
  clearValidationErrors: () => void;
  loadQuizForEditing: (quizId: string, userId: string) => Promise<void>;
  generateAccessCode: () => void;
}

const initialState: QuizCreatorState = {
  title: '',
  isPublic: true,
  timeLimit: '',
  perQuestionTimeLimit: '',
  isTimeLimitAutoCalculated: false,
  randomize: false,
  layout: 'default',
  folderPath: '',
  accessCode: '',
  editMode: 'no_edits',
  customQuestionLimit: null,
  imageSize: 'medium',
  jsonInput: '',
  jsonError: '',
  errorLine: null,
  errorColumn: null,
  validationErrors: [],
};

export const useQuizCreator = () => {
  const [state, setState] = useState<QuizCreatorState>(initialState);

  const updateState = useCallback((updates: Partial<QuizCreatorState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setTitle = useCallback((title: string) => updateState({ title }), [updateState]);
  const setIsPublic = useCallback((isPublic: boolean) => updateState({ isPublic }), [updateState]);
  const setTimeLimit = useCallback((timeLimit: string) => {
    // Allow empty string or digits (including while typing)
    if (timeLimit === "" || /^\d*$/.test(timeLimit)) {
      updateState({ 
        timeLimit, 
        isTimeLimitAutoCalculated: false,
        // Clear per-question time when setting total time
        ...(timeLimit && timeLimit !== "0" ? { perQuestionTimeLimit: "" } : {})
      });
    }
  }, [updateState]);
  
  const setPerQuestionTimeLimit = useCallback((perQuestionTimeLimit: string) => {
    // Allow empty string or digits (including while typing)
    if (perQuestionTimeLimit === "" || /^\d*$/.test(perQuestionTimeLimit)) {
      const updates: Partial<QuizCreatorState> = { perQuestionTimeLimit };
      
      if (perQuestionTimeLimit && /^\d+$/.test(perQuestionTimeLimit) && parseInt(perQuestionTimeLimit) > 0) {
        // Clear total time when setting per-question time and auto-calculate
        updates.timeLimit = "";
        updates.isTimeLimitAutoCalculated = true;
      } else {
        updates.isTimeLimitAutoCalculated = false;
      }
      
      updateState(updates);
    }
  }, [updateState]);

  const setIsTimeLimitAutoCalculated = useCallback((calculated: boolean) => 
    updateState({ isTimeLimitAutoCalculated: calculated }), [updateState]);
  const setRandomize = useCallback((randomize: boolean) => updateState({ randomize }), [updateState]);
  const setLayout = useCallback((layout: 'default' | 'split') => updateState({ layout }), [updateState]);
  const setFolderPath = useCallback((folderPath: string) => updateState({ folderPath }), [updateState]);
  const setAccessCode = useCallback((accessCode: string) => updateState({ accessCode }), [updateState]);
  const setEditMode = useCallback((editMode: 'no_edits' | 'pull_requests') => updateState({ editMode }), [updateState]);
  const setCustomQuestionLimit = useCallback((customQuestionLimit: number | null) => 
    updateState({ customQuestionLimit }), [updateState]);
  const setImageSize = useCallback((imageSize: 'small' | 'medium' | 'large' | 'xlarge') => 
    updateState({ imageSize }), [updateState]);
  const setJsonInput = useCallback((jsonInput: string) => updateState({ jsonInput }), [updateState]);
  const setJsonError = useCallback((jsonError: string) => updateState({ jsonError }), [updateState]);
  const setErrorLine = useCallback((errorLine: number | null) => updateState({ errorLine }), [updateState]);
  const setErrorColumn = useCallback((errorColumn: number | null) => updateState({ errorColumn }), [updateState]);
  
  const setValidationErrors = useCallback((validationErrors: ValidationError[]) => 
    updateState({ validationErrors }), [updateState]);
  const addValidationError = useCallback((error: ValidationError) => 
    updateState(prev => ({ validationErrors: [...prev.validationErrors, error] })), [updateState]);
  const clearValidationErrors = useCallback(() => 
    updateState({ validationErrors: [] }), [updateState]);

  const generateAccessCode = useCallback(() => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setAccessCode(code);
  }, [setAccessCode]);

  const loadQuizForEditing = useCallback(async (quizId: string, userId: string) => {
    try {
      console.log('📝 Loading quiz for editing:', quizId);
      const quiz = await storage.getQuizById(quizId);
      if (quiz && quiz.creator === userId) {
        console.log('✅ Quiz loaded for editing:', {
          title: quiz.title,
          hasMultiQuizSources: !!quiz.multiQuizSources,
          questionsCount: quiz.questions?.length
        });
        
        updateState({
          title: quiz.title,
          isPublic: quiz.isPublic,
          timeLimit: quiz.timeLimit?.toString() || "",
          perQuestionTimeLimit: quiz.perQuestionTimeLimit?.toString() || "",
          randomize: quiz.randomize,
          layout: quiz.layout || 'default',
          folderPath: quiz.folderPath || "",
          accessCode: quiz.accessCode || "",
          editMode: quiz.editMode || 'no_edits',
          customQuestionLimit: quiz.questionLimit || null,
          imageSize: quiz.imageSize || 'medium',
        });
      }
    } catch (error) {
      handleError(error, {
        userMessage: "Failed to load quiz for editing",
        logToConsole: true
      });
    }
  }, [updateState]);

  const actions: QuizCreatorActions = {
    setTitle,
    setIsPublic,
    setTimeLimit,
    setPerQuestionTimeLimit,
    setIsTimeLimitAutoCalculated,
    setRandomize,
    setLayout,
    setFolderPath,
    setAccessCode,
    setEditMode,
    setCustomQuestionLimit,
    setImageSize,
    setJsonInput,
    setJsonError,
    setErrorLine,
    setErrorColumn,
    setValidationErrors,
    addValidationError,
    clearValidationErrors,
    loadQuizForEditing,
    generateAccessCode,
  };

  return { state, actions };
};