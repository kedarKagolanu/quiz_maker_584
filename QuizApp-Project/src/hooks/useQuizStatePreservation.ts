import { useEffect, useState } from 'react';
import { QuizQuestion } from '@/types/quiz';

interface QuizState {
  answers: number[];
  timeTaken: number[];
  currentIndex: number;
  questionStatus: ('unattempted' | 'seen' | 'attempted' | 'review')[];
  markedForReview: boolean[];
  quizStartTime: number;
  questionStartTime: number;
  timeLeft?: number | null;
  questionTimeLeft?: number | null;
}

export const useQuizStatePreservation = (
  quizId: string,
  questionsLength: number,
  enabled: boolean = true
) => {
  const [isStateRestored, setIsStateRestored] = useState(false);
  const storageKey = `quiz_state_${quizId}`;

  // Save state to localStorage
  const saveState = (state: QuizState) => {
    if (!enabled) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        ...state,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save quiz state:', error);
    }
  };

  // Load state from localStorage
  const loadState = (): QuizState | null => {
    if (!enabled) return null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;
      
      const parsed = JSON.parse(saved);
      
      // Check if state is recent (within 24 hours)
      const isRecent = (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000;
      if (!isRecent) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      // Validate state structure
      if (parsed.answers?.length === questionsLength) {
        return {
          answers: parsed.answers,
          timeTaken: parsed.timeTaken || new Array(questionsLength).fill(0),
          currentIndex: Math.min(parsed.currentIndex || 0, questionsLength - 1),
          questionStatus: parsed.questionStatus || new Array(questionsLength).fill('unattempted'),
          markedForReview: parsed.markedForReview || new Array(questionsLength).fill(false),
          quizStartTime: parsed.quizStartTime || Date.now(),
          questionStartTime: parsed.questionStartTime || Date.now(),
          timeLeft: parsed.timeLeft,
          questionTimeLeft: parsed.questionTimeLeft
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to load quiz state:', error);
      return null;
    }
  };

  // Clear state from localStorage
  const clearState = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear quiz state:', error);
    }
  };

  // Create fresh state
  const createFreshState = (): QuizState => {
    if (questionsLength === 0) {
      return {
        answers: [],
        timeTaken: [],
        currentIndex: 0,
        questionStatus: [],
        markedForReview: [],
        quizStartTime: Date.now(),
        questionStartTime: Date.now()
      };
    }
    
    return {
      answers: new Array(questionsLength).fill(-1),
      timeTaken: new Array(questionsLength).fill(0),
      currentIndex: 0,
      questionStatus: new Array(questionsLength).fill('unattempted'),
      markedForReview: new Array(questionsLength).fill(false),
      quizStartTime: Date.now(),
      questionStartTime: Date.now()
    };
  };

  return {
    saveState,
    loadState,
    clearState,
    createFreshState,
    isStateRestored,
    setIsStateRestored
  };
};