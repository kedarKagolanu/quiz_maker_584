import React from 'react';

interface ValidationError {
  type: 'question_limit' | 'json_parse' | 'json_structure' | 'multi_quiz' | 'general';
  message: string;
  details?: string;
  solution?: string;
}

interface ValidationErrorDisplayProps {
  errors: ValidationError[];
  className?: string;
}

export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({ 
  errors, 
  className = "" 
}) => {
  if (errors.length === 0) return null;

  const getErrorIcon = (type: ValidationError['type']) => {
    switch (type) {
      case 'question_limit': return '🔢';
      case 'json_parse': return '📝';
      case 'json_structure': return '🔧';
      case 'multi_quiz': return '🔗';
      default: return '❌';
    }
  };

  const getErrorColor = (type: ValidationError['type']) => {
    switch (type) {
      case 'json_parse': return 'border-red-500/50 bg-red-500/10 text-red-300';
      case 'json_structure': return 'border-orange-500/50 bg-orange-500/10 text-orange-300';
      case 'question_limit': return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300';
      case 'multi_quiz': return 'border-purple-500/50 bg-purple-500/10 text-purple-300';
      default: return 'border-red-500/50 bg-red-500/10 text-red-300';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {errors.map((error, index) => (
        <div
          key={index}
          className={`border rounded-lg p-4 ${getErrorColor(error.type)}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">
              {getErrorIcon(error.type)}
            </span>
            <div className="flex-1 space-y-2">
              <div className="font-medium">
                {error.message}
              </div>
              {error.details && (
                <div className="text-sm opacity-90">
                  {error.details}
                </div>
              )}
              {error.solution && (
                <div className="text-sm p-2 bg-black/20 rounded border border-current/20">
                  <div className="font-medium mb-1">💡 Solution:</div>
                  {error.solution}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper function to create validation errors
export const createValidationError = (
  type: ValidationError['type'],
  message: string,
  details?: string,
  solution?: string
): ValidationError => ({
  type,
  message,
  details,
  solution
});

// Pre-defined error creators for common validation issues
export const ValidationErrors = {
  questionLimit: (current: number, minimum: number) =>
    createValidationError(
      'question_limit',
      `Question limit too low: ${current} < ${minimum}`,
      `You've set a custom question limit of ${current}, but your quiz sources require a minimum of ${minimum} questions.`,
      `Either increase your question limit to at least ${minimum}, or reduce the minimum questions required from your sources.`
    ),

  jsonParse: (error: string, line?: number, column?: number) =>
    createValidationError(
      'json_parse',
      'JSON Syntax Error',
      line && column 
        ? `Parse error at line ${line}, column ${column}: ${error}`
        : `Parse error: ${error}`,
      'Check for missing commas, unclosed brackets, or invalid characters. Use a JSON validator to help identify the exact issue.'
    ),

  jsonStructure: (field: string, expected: string, received: string) =>
    createValidationError(
      'json_structure',
      `Invalid field: ${field}`,
      `Expected ${expected}, but received ${received}`,
      `Make sure all required fields (q, o, a) are present and have the correct data types.`
    ),

  multiQuizMinimum: (sourceName: string, minimum: number, available: number) =>
    createValidationError(
      'multi_quiz',
      `Source "${sourceName}" minimum too high`,
      `You've set a minimum of ${minimum} questions, but only ${available} are available.`,
      `Reduce the minimum questions for this source or select a different quiz with more questions.`
    ),

  multiQuizRange: (sourceName: string, minimum: number, maximum: number) =>
    createValidationError(
      'multi_quiz',
      `Source "${sourceName}" invalid range`,
      `Minimum (${minimum}) cannot be greater than maximum (${maximum}).`,
      'Adjust the minimum and maximum values so that minimum ≤ maximum.'
    )
};