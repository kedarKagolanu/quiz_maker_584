import React from 'react';
import { Quiz } from '@/types/quiz';
import { useRecursiveQuestionCount } from '@/hooks/useRecursiveQuestionCount';

interface QuizQuestionCountProps {
  quiz: Quiz;
  showSourceInfo?: boolean;
}

export const QuizQuestionCount: React.FC<QuizQuestionCountProps> = ({ 
  quiz, 
  showSourceInfo = true 
}) => {
  const { questionCount, loading } = useRecursiveQuestionCount(quiz);

  if (loading) {
    return <span className="text-terminal-dim">Loading...</span>;
  }

  const isMultiQuiz = !!quiz.multiQuizSources;
  
  if (isMultiQuiz && showSourceInfo) {
    return (
      <span>
        {questionCount} questions (including sources)
      </span>
    );
  }
  
  return <span>{questionCount} questions</span>;
};
