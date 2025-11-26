/**
 * Time validation utilities for quiz time limits
 * Ensures database constraints are respected
 */

export interface TimeSettings {
  timeLimit?: number;
  perQuestionTimeLimit?: number;
}

/**
 * Validates and normalizes time settings to prevent database constraint violations
 * Only one time limit type should be active at a time
 */
export function validateTimeSettings(timeLimit?: string | number, perQuestionTimeLimit?: string | number): TimeSettings {
  // Convert to numbers and normalize
  const totalTime = normalizeTimeValue(timeLimit);
  const perQuestionTime = normalizeTimeValue(perQuestionTimeLimit);
  
  // Database constraint: only one can be set
  if (totalTime && perQuestionTime) {

    return {
      timeLimit: undefined,
      perQuestionTimeLimit: perQuestionTime
    };
  }
  
  return {
    timeLimit: totalTime,
    perQuestionTimeLimit: perQuestionTime
  };
}

/**
 * Normalizes time value from string/number to number or undefined
 */
function normalizeTimeValue(value?: string | number): number | undefined {
  if (value === undefined || value === null || value === "" || value === "0") {
    return undefined;
  }
  
  const numValue = typeof value === 'string' ? parseInt(value) : value;
  return numValue > 0 ? numValue : undefined;
}

/**
 * Checks if time settings would violate database constraints
 */
export function hasTimeConstraintViolation(timeLimit?: number, perQuestionTimeLimit?: number): boolean {
  // Both values are set (not allowed by database constraint)
  return !!(timeLimit && perQuestionTimeLimit);
}
