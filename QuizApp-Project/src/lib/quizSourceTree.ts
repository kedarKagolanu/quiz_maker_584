import { Quiz } from '@/types/quiz';
import { StorageService } from './storage';

export interface QuizSourceNode {
  quiz: Quiz;
  children: QuizSourceNode[];
  isLeaf: boolean;
  totalQuestions: number;
  leafQuestions: number; // Questions from leaf nodes only
}

/**
 * Build a complete source tree for a multi-quiz, identifying leaf nodes
 */
export async function buildQuizSourceTree(
  quiz: Quiz,
  storage: StorageService,
  visitedIds: Set<string> = new Set()
): Promise<QuizSourceNode> {
  // Prevent cycles
  if (visitedIds.has(quiz.id)) {

    return {
      quiz,
      children: [],
      isLeaf: true,
      totalQuestions: 0,
      leafQuestions: 0
    };
  }
  
  visitedIds.add(quiz.id);
  
  // If no multi-quiz sources, this is a leaf node
  if (!quiz.multiQuizSources || !quiz.multiQuizSources.sources || quiz.multiQuizSources.sources.length === 0) {
    const questionCount = quiz.questions?.length || 0;
    return {
      quiz,
      children: [],
      isLeaf: true,
      totalQuestions: questionCount,
      leafQuestions: questionCount
    };
  }
  
  // Build children from sources
  const children: QuizSourceNode[] = [];
  let totalLeafQuestions = 0;
  
  for (const source of quiz.multiQuizSources.sources) {
    try {
      const sourceQuiz = await storage.getQuizById(source.quizId);
      if (!sourceQuiz) {

        continue;
      }
      
      const childNode = await buildQuizSourceTree(sourceQuiz, storage, new Set(visitedIds));
      children.push(childNode);
      totalLeafQuestions += childNode.leafQuestions;
    } catch (error) {

    }
  }
  
  visitedIds.delete(quiz.id);
  
  return {
    quiz,
    children,
    isLeaf: false,
    totalQuestions: quiz.questions?.length || 0,
    leafQuestions: totalLeafQuestions
  };
}

/**
 * Get total available questions from leaf nodes only
 */
export async function getTotalLeafQuestions(
  quiz: Quiz,
  storage: StorageService
): Promise<number> {
  try {
    const tree = await buildQuizSourceTree(quiz, storage);
    console.log('Quiz source tree analysis:', {
      isMultiQuiz: !tree.isLeaf,
      totalSources: tree.children.length,
      leafQuestions: tree.leafQuestions,
      directQuestions: tree.totalQuestions
    });
    return tree.leafQuestions;
  } catch (error) {

    return quiz.questions?.length || 0;
  }
}

/**
 * Collect all questions from leaf nodes
 */
export async function collectLeafQuestions(
  quiz: Quiz,
  storage: StorageService,
  visitedIds: Set<string> = new Set()
): Promise<any[]> {
  // Prevent cycles
  if (visitedIds.has(quiz.id)) {
    return [];
  }
  
  visitedIds.add(quiz.id);
  
  // If no multi-quiz sources, return direct questions
  if (!quiz.multiQuizSources || !quiz.multiQuizSources.sources || quiz.multiQuizSources.sources.length === 0) {
    return quiz.questions || [];
  }
  
  // Collect from all source leaf nodes
  const allQuestions: any[] = [];
  
  for (const source of quiz.multiQuizSources.sources) {
    try {
      const sourceQuiz = await storage.getQuizById(source.quizId);
      if (!sourceQuiz) continue;
      
      const sourceQuestions = await collectLeafQuestions(sourceQuiz, storage, new Set(visitedIds));
      allQuestions.push(...sourceQuestions);
    } catch (error) {

    }
  }
  
  visitedIds.delete(quiz.id);
  return allQuestions;
}
