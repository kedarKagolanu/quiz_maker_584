import { toast } from "sonner";

/**
 * Centralized Error Handler
 * 
 * Security best practice: Never expose detailed database errors or stack traces to users.
 * This handler logs full errors in development and shows generic messages to users.
 */

export interface ErrorOptions {
  userMessage?: string;
  logToConsole?: boolean;
  showToast?: boolean;
}

/**
 * Handle errors with centralized logging and user-friendly messages
 */
export const handleError = (
  error: unknown,
  options: ErrorOptions = {}
): void => {
  const {
    userMessage = "An error occurred. Please try again.",
    logToConsole = true,
    showToast = true,
  } = options;

  // Only log detailed errors in development mode
  if (import.meta.env.DEV && logToConsole) {
    console.error("Error details (dev only):", error);
  }

  // TODO: In production, send errors to server-side monitoring service
  // Example: Sentry, LogRocket, or custom logging endpoint
  // if (import.meta.env.PROD) {
  //   logErrorToServer(error);
  // }

  // Show user-friendly message
  if (showToast) {
    toast.error(userMessage);
  }
};

/**
 * Extract safe error message for display
 * Prevents leaking sensitive information
 */
export const getSafeErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    return "An error occurred";
  }
  
  if (error instanceof Error) {
    // In development, show actual message. In production, generic message.
    return import.meta.env.DEV ? error.message : "An error occurred";
  }
  
  return "An unexpected error occurred";
};

/**
 * Handle async operations with error handling
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    handleError(error, { userMessage: errorMessage });
    return null;
  }
};
