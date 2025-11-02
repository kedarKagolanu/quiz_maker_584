import { z } from "zod";

/**
 * Input Validation Schemas
 * All user inputs must be validated to prevent injection attacks and data corruption
 */

// Username validation
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores");

// Password validation
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Email validation (for Supabase Auth)
export const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .max(255, "Email must be at most 255 characters");

// Quiz title validation
export const quizTitleSchema = z
  .string()
  .trim()
  .min(1, "Quiz title cannot be empty")
  .max(200, "Quiz title must be at most 200 characters");

// Quiz description validation
export const quizDescSchema = z
  .string()
  .trim()
  .max(1000, "Quiz description must be at most 1000 characters")
  .optional();

// Folder name validation
export const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Folder name cannot be empty")
  .max(255, "Folder name must be at most 255 characters")
  .regex(/^[^<>:"/\\|?*\x00-\x1F]+$/, "Folder name contains invalid characters");

// Question text validation
export const questionTextSchema = z
  .string()
  .trim()
  .min(1, "Question text cannot be empty")
  .max(1000, "Question text must be at most 1000 characters");

// Answer text validation
export const answerTextSchema = z
  .string()
  .trim()
  .min(1, "Answer text cannot be empty")
  .max(500, "Answer text must be at most 500 characters");

// Login/Signup form schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"), // Less strict for login
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
});

export const folderFormSchema = z.object({
  name: folderNameSchema,
});

// Quiz question validation
export const quizQuestionSchema = z.object({
  q: z.string().trim().min(1, "Question text cannot be empty").max(1000, "Question text too long"),
  o: z.array(z.string().trim().min(1, "Option cannot be empty").max(500, "Option text too long"))
    .min(2, "At least 2 options required")
    .max(10, "Maximum 10 options allowed"),
  a: z.number().int().min(0, "Answer index must be non-negative"),
  desc: z.string().trim().max(2000, "Description too long").optional(),
  img: z.string().optional(),
  audio: z.string().optional(),
});

// Complete quiz questions array validation
export const quizQuestionsSchema = z.array(quizQuestionSchema)
  .min(1, "Quiz must have at least one question")
  .max(100, "Maximum 100 questions allowed");

// Quiz validation for creation/update
export const quizSchema = z.object({
  id: z.string(),
  title: quizTitleSchema,
  desc: quizDescSchema,
  questions: quizQuestionsSchema,
  creator: z.string().uuid("Invalid creator ID"),
  createdAt: z.number().positive(),
  isPublic: z.boolean(),
  timeLimit: z.number().int().positive().optional(),
  perQuestionTimeLimit: z.number().int().positive().optional(),
  randomize: z.boolean().optional(),
  media: z.array(z.object({
    type: z.enum(['image', 'audio']),
    name: z.string(),
    data: z.string(),
  })).optional(),
  layout: z.enum(['default', 'split']).optional(),
  folderPath: z.string().max(1000).optional(),
  sharedWith: z.array(z.string().uuid()).optional(),
  forkedFrom: z.string().optional(),
});

// Helper function to safely validate and return errors
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Validation failed" };
  }
}
