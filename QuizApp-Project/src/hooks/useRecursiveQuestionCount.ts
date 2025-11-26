import { useState, useEffect } from 'react';
import { Quiz } from '@/types/quiz';
import { getDisplayQuestionCount } from '@/lib/recursiveQuizResolver';
import { storage } from '@/lib/storage';

/**
 * Hook to get recursive question count for a single quiz
 */
export const useRecursiveQuestionCount = (quiz: Quiz | null) => {
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadQuestionCount = async () => {
      if (!quiz) {
        setQuestionCount(0);
        return;
      }

      setLoading(true);
      try {
        const count = await getDisplayQuestionCount(quiz, storage);
        setQuestionCount(count);
      } catch (error) {
        console.error('Error getting recursive question count:', error);
        // Fallback to direct count
        setQuestionCount(quiz.questions?.length || 0);
      }
      setLoading(false);
    };

    loadQuestionCount();
  }, [quiz?.id, quiz?.multiQuizSources]);

  return { questionCount, loading };
};

/**
 * Hook to get recursive question counts for multiple quizzes
 */
export const useRecursiveQuestionCounts = (quizzes: Quiz[]) => {
  const [questionCounts, setQuestionCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadQuestionCounts = async () => {
      if (quizzes.length === 0) {
        setQuestionCounts(new Map());
        return;
      }

      setLoading(true);
      try {
        const counts = new Map<string, number>();
        
        // Process quizzes in batches to avoid overwhelming the system
        const batchSize = 10;
        for (let i = 0; i < quizzes.length; i += batchSize) {
          const batch = quizzes.slice(i, i + batchSize);
          const batchPromises = batch.map(async (quiz) => {
            try {
              const count = await getDisplayQuestionCount(quiz, storage);
              return { id: quiz.id, count };
            } catch (error) {
              console.error(`Error getting question count for quiz ${quiz.id}:`, error);
              return { id: quiz.id, count: quiz.questions?.length || 0 };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          batchResults.forEach(({ id, count }) => {
            counts.set(id, count);
          });
        }
        
        setQuestionCounts(counts);
      } catch (error) {
        console.error('Error getting question counts:', error);
        // Fallback to direct counts
        const fallbackCounts = new Map();
        quizzes.forEach(quiz => {
          fallbackCounts.set(quiz.id, quiz.questions?.length || 0);
        });
        setQuestionCounts(fallbackCounts);
      }
      setLoading(false);
    };

    loadQuestionCounts();
  }, [quizzes]);

  return { questionCounts, loading };
};