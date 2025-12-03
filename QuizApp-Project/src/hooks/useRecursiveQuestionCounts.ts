/**
 * Hook for calculating recursive question counts for quiz collections
 * Missing file that was causing count display issues
 */

import { useState, useEffect } from 'react';
import { Quiz } from '@/types/quiz';

interface QuestionCountResult {
  questionCounts: Map<string, number>;
  isLoading: boolean;
}

export function useRecursiveQuestionCounts(quizzes: Quiz[]): QuestionCountResult {
  const [questionCounts, setQuestionCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!quizzes || quizzes.length === 0) {
      setQuestionCounts(new Map());
      return;
    }

    setIsLoading(true);
    
    try {
      const counts = new Map<string, number>();
      
      quizzes.forEach(quiz => {
        if (!quiz || !quiz.id) return;
        
        // Validate questions data
        let questionCount = 0;
        
        if (quiz.questions && Array.isArray(quiz.questions)) {
          questionCount = quiz.questions.length;
        } else if (quiz.questions && typeof quiz.questions === 'string') {
          try {
            const parsed = JSON.parse(quiz.questions);
            questionCount = Array.isArray(parsed) ? parsed.length : 0;
          } catch {
            questionCount = 0;
          }
        }
        
        counts.set(quiz.id, questionCount);
      });
      
      setQuestionCounts(counts);
    } catch (error) {
      console.error('Error calculating question counts:', error);
      setQuestionCounts(new Map());
    } finally {
      setIsLoading(false);
    }
  }, [quizzes]);

  return { questionCounts, isLoading };
}