import React, { useState, useEffect } from 'react';
import { Quiz } from '@/types/quiz';
import { QuizDetailInfo, QuizDetailResolver } from '@/lib/quizDetails';
import { storage } from '@/lib/storage';

interface QuizValidationProps {
  quiz?: Quiz;
  quizId?: string;
  userId?: string;
  showDetails?: boolean;
  onValidationChange?: (isValid: boolean, issues: string[]) => void;
  className?: string;
}

export const QuizValidation: React.FC<QuizValidationProps> = ({
  quiz,
  quizId,
  userId,
  showDetails = true,
  onValidationChange,
  className = ''
}) => {
  const [validationDetails, setValidationDetails] = useState<QuizDetailInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [quizDetailResolver] = useState(() => new QuizDetailResolver(storage));

  useEffect(() => {
    loadValidation();
  }, [quiz, quizId, userId]);

  const loadValidation = async () => {
    if (!quiz && !quizId) return;

    setLoading(true);
    try {
      if (quiz) {
        // Direct validation from quiz object
        const issues = await quizDetailResolver.validateQuiz(quiz, userId);
        const mockDetails: QuizDetailInfo = {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          creator: quiz.creator,
          createdAt: quiz.createdAt,
          isPublic: quiz.isPublic,
          isMultiQuiz: !!quiz.multiQuizSources,
          totalQuestions: 0, // Will be calculated
          questionLimit: quiz.questionLimit || null,
          directQuestions: quiz.questions?.length || 0,
          sourceQuizCount: quiz.multiQuizSources?.sources?.length || 0,
          hasTimeConstraints: !!(quiz.timeLimit || quiz.perQuestionTimeLimit),
          totalTimeLimit: quiz.timeLimit,
          perQuestionTimeLimit: quiz.perQuestionTimeLimit,
          allowReview: quiz.allowReview !== false,
          preserveOrder: quiz.multiQuizSources?.preserveQuizOrder || false,
          accessLevel: quiz.isPublic ? 'public' : (quiz.sharedWith?.length ? 'shared' : 'private'),
          sharedWith: quiz.sharedWith,
          accessCode: quiz.accessCode,
          folderPath: quiz.folderPath,
          hasMedia: !!(quiz.media?.length || quiz.questions?.some(q => q.image || q.audio)),
          mediaCount: quiz.media?.length || 0,
          isValid: issues.length === 0,
          validationIssues: issues
        };
        setValidationDetails(mockDetails);
        onValidationChange?.(mockDetails.isValid, mockDetails.validationIssues);
      } else if (quizId) {
        // Load full details from storage
        const details = await quizDetailResolver.getQuizDetails(quizId, userId);
        setValidationDetails(details);
        if (details) {
          onValidationChange?.(details.isValid, details.validationIssues);
        }
      }
    } catch (error) {
      console.error('Error loading validation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-terminal-accent/20 rounded w-32 mb-2"></div>
        <div className="h-3 bg-terminal-accent/20 rounded w-48"></div>
      </div>
    );
  }

  if (!validationDetails) {
    return null;
  }

  const { isValid, validationIssues } = validationDetails;

  if (isValid) {
    return (
      <div className={`flex items-center gap-2 text-green-400 ${className}`}>
        <span>✅</span>
        {showDetails && <span className="text-sm">Valid configuration</span>}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-red-400">
        <span>❌</span>
        {showDetails && (
          <span className="text-sm font-medium">
            {validationIssues.length} validation issue{validationIssues.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      {showDetails && validationIssues.length > 0 && (
        <div className="space-y-1 ml-6">
          {validationIssues.slice(0, 5).map((issue, idx) => (
            <div key={idx} className="text-xs text-red-300">
              • {issue}
            </div>
          ))}
          {validationIssues.length > 5 && (
            <div className="text-xs text-red-300">
              ... and {validationIssues.length - 5} more issues
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MultiQuizSourceValidationProps {
  sources: Array<{
    quizId: string;
    minQuestions: number | string;
    maxQuestions: number | string;
    fixedCount?: boolean;
    sectionName?: string;
  }>;
  availableQuizzes: Quiz[];
  userId?: string;
  onValidationChange?: (sourceIndex: number, isValid: boolean, issues: string[]) => void;
}

export const MultiQuizSourceValidation: React.FC<MultiQuizSourceValidationProps> = ({
  sources,
  availableQuizzes,
  userId,
  onValidationChange
}) => {
  const [sourceValidations, setSourceValidations] = useState<Map<number, { isValid: boolean; issues: string[] }>>(new Map());
  const [quizDetailResolver] = useState(() => new QuizDetailResolver(storage));

  useEffect(() => {
    validateAllSources();
  }, [sources, availableQuizzes]);

  const validateAllSources = async () => {
    const validations = new Map<number, { isValid: boolean; issues: string[] }>();

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      try {
        const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
        if (!sourceQuiz) {
          const issues = [`Source ${i + 1}: Selected quiz not found`];
          validations.set(i, { isValid: false, issues });
          onValidationChange?.(i, false, issues);
          continue;
        }

        // Get quiz details for validation
        const details = await quizDetailResolver.getQuizDetails(source.quizId, userId);
        if (!details) {
          const issues = [`Source ${i + 1}: Unable to load quiz details`];
          validations.set(i, { isValid: false, issues });
          onValidationChange?.(i, false, issues);
          continue;
        }

        // Validate source configuration
        const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
        const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0;
        const issues: string[] = [];

        // Basic range validation
        if (minQuestions < 1) {
          issues.push(`Source ${i + 1}: Minimum questions must be at least 1`);
        }

        if (maxQuestions < 1) {
          issues.push(`Source ${i + 1}: Maximum questions must be at least 1`);
        }

        if (minQuestions > maxQuestions) {
          issues.push(`Source ${i + 1}: Minimum (${minQuestions}) cannot be greater than maximum (${maxQuestions})`);
        }

        // Availability validation
        if (minQuestions > details.totalQuestions) {
          issues.push(`Source ${i + 1}: Minimum (${minQuestions}) exceeds available questions (${details.totalQuestions}) in "${details.title}"`);
        }

        if (maxQuestions > details.totalQuestions) {
          issues.push(`Source ${i + 1}: Maximum (${maxQuestions}) exceeds available questions (${details.totalQuestions}) in "${details.title}"`);
        }

        // Fixed count validation
        if (source.fixedCount && minQuestions !== maxQuestions) {
          issues.push(`Source ${i + 1}: Fixed count mode requires minimum and maximum to be equal`);
        }

        const isValid = issues.length === 0;
        validations.set(i, { isValid, issues });
        onValidationChange?.(i, isValid, issues);

      } catch (error) {
        console.error(`Error validating source ${i + 1}:`, error);
        const issues = [`Source ${i + 1}: Validation error occurred`];
        validations.set(i, { isValid: false, issues });
        onValidationChange?.(i, false, issues);
      }
    }

    setSourceValidations(validations);
  };

  return (
    <div className="space-y-3">
      {sources.map((source, idx) => {
        const validation = sourceValidations.get(idx);
        if (!validation) {
          return (
            <div key={idx} className="text-yellow-400 text-sm">
              ⏳ Validating source {idx + 1}...
            </div>
          );
        }

        const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
        
        return (
          <div key={idx} className="space-y-1">
            <div className="text-sm font-medium text-terminal-bright">
              Source {idx + 1}: {sourceQuiz?.title || 'Unknown Quiz'}
            </div>
            
            {validation.isValid ? (
              <div className="text-green-400 text-sm">
                ✅ Will select {source.fixedCount ? 
                  `exactly ${source.minQuestions}` : 
                  `${source.minQuestions}-${source.maxQuestions}`} 
                questions from this quiz
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-red-400 text-sm font-medium">
                  ❌ Configuration Issues:
                </div>
                <div className="space-y-1 ml-4">
                  {validation.issues.map((issue, issueIdx) => (
                    <div key={issueIdx} className="text-red-300 text-xs">
                      • {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};