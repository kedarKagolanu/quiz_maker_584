import { Quiz, Question } from '../types/quiz';
import { StorageService } from './storage';

export interface ResolvedQuizInfo {
  totalQuestions: number;
  resolvedQuestions?: Question[];
  sourceTree: SourceTreeNode[];
}

export interface SourceTreeNode {
  quizId: string;
  title: string;
  isMultiQuiz: boolean;
  directQuestions: number;
  totalQuestions: number;
  children?: SourceTreeNode[];
}

/**
 * Recursively calculates the total number of questions in a quiz,
 * including questions from nested multi-quiz sources
 */
export async function getRecursiveQuestionCount(
  quiz: Quiz,
  storage: StorageService,
  visitedQuizIds = new Set<string>()
): Promise<ResolvedQuizInfo> {
  // Prevent infinite recursion
  if (visitedQuizIds.has(quiz.id)) {

    return {
      totalQuestions: 0,
      sourceTree: []
    };
  }

  visitedQuizIds.add(quiz.id);

  let totalQuestions = 0;
  const sourceTree: SourceTreeNode[] = [];

  // If this is not a multi-quiz, return direct question count
  if (!quiz.multiQuizSources || !quiz.multiQuizSources.sources?.length) {
    const directQuestionCount = quiz.questions?.length || 0;
    return {
      totalQuestions: directQuestionCount,
      sourceTree: [{
        quizId: quiz.id,
        title: quiz.title,
        isMultiQuiz: false,
        directQuestions: directQuestionCount,
        totalQuestions: directQuestionCount
      }]
    };
  }

  // This is a multi-quiz, recursively resolve all sources
  for (const source of quiz.multiQuizSources.sources) {
    try {
      const sourceQuiz = await storage.getQuizById(source.quizId);
      if (!sourceQuiz) {

        continue;
      }

      // Recursively get the question count for this source
      const sourceInfo = await getRecursiveQuestionCount(sourceQuiz, storage, new Set(visitedQuizIds));
      
      // Calculate how many questions this source will contribute
      const maxAvailable = sourceInfo.totalQuestions;
      const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
      const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0;
      
      // The actual contribution is limited by what's available
      const actualMin = Math.min(minQuestions, maxAvailable);
      const actualMax = Math.min(maxQuestions, maxAvailable);
      
      // For counting purposes, use the maximum possible contribution
      totalQuestions += actualMax;

      sourceTree.push({
        quizId: sourceQuiz.id,
        title: sourceQuiz.title,
        isMultiQuiz: !!sourceQuiz.multiQuizSources,
        directQuestions: sourceQuiz.questions?.length || 0,
        totalQuestions: sourceInfo.totalQuestions,
        children: sourceInfo.sourceTree
      });

    } catch (error) {

    }
  }

  // Add manual questions from the multi-quiz itself
  const manualQuestions = quiz.questions?.filter(q => !(q as any)._isMultiQuizConfig)?.length || 0;
  if (manualQuestions > 0) {
    totalQuestions += manualQuestions;
    sourceTree.push({
      quizId: 'manual',
      title: 'Manual Questions',
      isMultiQuiz: false,
      directQuestions: manualQuestions,
      totalQuestions: manualQuestions
    });
  }

  visitedQuizIds.delete(quiz.id);

  return {
    totalQuestions,
    sourceTree
  };
}

/**
 * Recursively resolves all available questions from a multi-quiz, including nested multi-quiz sources
 * This version returns ALL available questions without applying range restrictions
 * Use this for validation and counting purposes
 */
export async function resolveRecursiveQuestions(
  quiz: Quiz,
  storage: StorageService,
  visitedQuizIds = new Set<string>()
): Promise<Question[]> {
  // Prevent infinite recursion
  if (visitedQuizIds.has(quiz.id)) {

    return [];
  }

  visitedQuizIds.add(quiz.id);

  // If this is not a multi-quiz, return direct questions
  if (!quiz.multiQuizSources || !quiz.multiQuizSources.sources?.length) {
    const result = quiz.questions || [];
    visitedQuizIds.delete(quiz.id);
    return result;
  }

  // This is a multi-quiz, recursively resolve all sources
  const allResolvedQuestions: Question[] = [];

  for (const source of quiz.multiQuizSources.sources) {
    try {
      const sourceQuiz = await storage.getQuizById(source.quizId);
      if (!sourceQuiz) {

        continue;
      }

      // Recursively resolve questions from this source
      const sourceQuestions = await resolveRecursiveQuestions(sourceQuiz, storage, new Set(visitedQuizIds));
      
      // Add metadata to track the source
      const questionsWithMetadata = sourceQuestions.map(q => ({
        ...q,
        _sourceQuiz: sourceQuiz.id,
        _sourceTitle: sourceQuiz.title
      }));

      allResolvedQuestions.push(...questionsWithMetadata);

    } catch (error) {

    }
  }

  // Add manual questions from the multi-quiz itself
  const manualQuestions = quiz.questions?.filter(q => !(q as any)._isMultiQuizConfig) || [];
  if (manualQuestions.length > 0) {
    const manualWithMetadata = manualQuestions.map(q => ({
      ...q,
      _sourceQuiz: 'manual',
      _sourceTitle: 'Manual Questions'
    }));
    allResolvedQuestions.push(...manualWithMetadata);
  }

  visitedQuizIds.delete(quiz.id);
  return allResolvedQuestions;
}

/**
 * Recursively collects ALL questions from nested sources without any filtering
 * Filtering is only applied at the root level
 */
export async function collectAllRecursiveQuestions(
  quiz: Quiz,
  storage: StorageService,
  preserveOrder = false,
  visitedQuizIds = new Set<string>()
): Promise<{
  questions: Question[];
  sections: Array<{
    sectionName: string;
    sourceQuizId: string;
    sourceTitle: string;
    questions: Question[];
    totalAvailable: number;
    originalRange: { min: number; max: number; fixed: boolean };
  }>;
  media: any[];
}> {
  // Prevent infinite recursion
  if (visitedQuizIds.has(quiz.id)) {

    return { questions: [], sections: [], media: quiz.media || [] };
  }

  visitedQuizIds.add(quiz.id);

  // If this is not a multi-quiz, return direct questions as single section
  if (!quiz.multiQuizSources || !quiz.multiQuizSources.sources?.length) {
    const directQuestions = quiz.questions || [];
    visitedQuizIds.delete(quiz.id);
    return {
      questions: directQuestions,
      sections: [{
        sectionName: quiz.title,
        sourceQuizId: quiz.id,
        sourceTitle: quiz.title,
        questions: directQuestions,
        originalRange: { min: directQuestions.length, max: directQuestions.length, fixed: true }
      }],
      media: quiz.media || []
    };
  }

  // This is a multi-quiz, collect ALL questions from each source (no range restrictions applied here)
  const allQuestions: Question[] = [];
  const sections: Array<{
    sectionName: string;
    sourceQuizId: string;
    sourceTitle: string;
    questions: Question[];
    originalRange: { min: number; max: number; fixed: boolean };
  }> = [];
  const mergedMedia: any[] = [...(quiz.media || [])];

  for (const source of quiz.multiQuizSources.sources) {
    try {
      const sourceQuiz = await storage.getQuizById(source.quizId);
      if (!sourceQuiz) {

        continue;
      }

      // Get ALL available questions from this source (recursively) - NO FILTERING HERE
      const availableQuestions = await resolveRecursiveQuestions(sourceQuiz, storage, new Set(visitedQuizIds));
      
      if (availableQuestions.length === 0) {

        continue;
      }

      // Store range restrictions for later use at ROOT level only
      const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
      const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0;
      const fixedCount = source.fixedCount || false;



      // Take ALL questions from this source - no filtering at intermediate levels
      const selectedQuestions = [...availableQuestions];

      // Add enhanced metadata to questions
      const questionsWithMetadata = selectedQuestions.map((q, idx) => ({
        ...q,
        _sourceQuiz: sourceQuiz.id,
        _sourceTitle: sourceQuiz.title,
        _sectionName: source.sectionName || sourceQuiz.title,
        _selectionIndex: idx,
        _totalAvailable: availableQuestions.length,
        _rangeMin: minQuestions,
        _rangeMax: maxQuestions,
        _fixedCount: fixedCount
      }));

      // Merge media from source quiz
      if (sourceQuiz.media && sourceQuiz.media.length > 0) {
        sourceQuiz.media.forEach(mediaItem => {
          const exists = mergedMedia.find(m => m.id === mediaItem.id || (m.name === mediaItem.name && m.data === mediaItem.data));
          if (!exists) {
            mergedMedia.push({...mediaItem});
          }
        });
      }

      // Create section info with ALL questions from this source
      sections.push({
        sectionName: source.sectionName || sourceQuiz.title,
        sourceQuizId: sourceQuiz.id,
        sourceTitle: sourceQuiz.title,
        questions: questionsWithMetadata,
        totalAvailable: availableQuestions.length,
        originalRange: { min: minQuestions, max: maxQuestions, fixed: fixedCount }
      });

      allQuestions.push(...questionsWithMetadata);



    } catch (error) {

    }
  }

  // Add manual questions if any
  const manualQuestions = quiz.questions?.filter(q => !(q as any)._isMultiQuizConfig) || [];
  if (manualQuestions.length > 0) {
    const manualWithMetadata = manualQuestions.map((q, idx) => ({
      ...q,
      _sourceQuiz: 'manual',
      _sourceTitle: 'Manual Questions',
      _sectionName: 'Manual Entry',
      _selectionIndex: idx,
      _totalAvailable: manualQuestions.length
    }));

    sections.push({
      sectionName: 'Manual Entry',
      sourceQuizId: 'manual',
      sourceTitle: 'Manual Questions',
      questions: manualWithMetadata,
      originalRange: { min: manualQuestions.length, max: manualQuestions.length, fixed: true }
    });

    allQuestions.push(...manualWithMetadata);
  }

  visitedQuizIds.delete(quiz.id);



  return {
    questions: allQuestions,
    sections,
    media: mergedMedia
  };
}

/**
 * Applies root-level filtering to collected questions based on range restrictions
 * This is where the actual question selection happens
 */
export function applyRootLevelFiltering(
  sections: Array<{
    sectionName: string;
    sourceQuizId: string;
    sourceTitle: string;
    questions: Question[];
    totalAvailable: number;
    originalRange: { min: number; max: number; fixed: boolean };
  }>,
  preserveOrder = false
): {
  questions: Question[];
  sections: Array<{
    sectionName: string;
    sourceQuizId: string;
    sourceTitle: string;
    questions: Question[];
    totalAvailable: number;
    originalRange: { min: number; max: number; fixed: boolean };
    actualSelected: number;
  }>;
} {
  const filteredQuestions: Question[] = [];
  const filteredSections = [];



  for (const section of sections) {
    const { questions: allQuestions, originalRange, totalAvailable } = section;
    const { min: minQuestions, max: maxQuestions, fixed: fixedCount } = originalRange;

    // Apply range restrictions NOW (only at root level)
    const actualMin = Math.max(0, Math.min(minQuestions, allQuestions.length));
    const actualMax = Math.max(actualMin, Math.min(maxQuestions, allQuestions.length));
    
    let selectedCount: number;
    if (fixedCount) {
      selectedCount = actualMin;
    } else {
      selectedCount = actualMin === actualMax ? actualMin : 
        Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin;
    }



    // Select questions based on order preference
    let selectedQuestions: Question[];
    if (preserveOrder) {
      // Preserve order: randomly select indices but maintain their relative order
      if (selectedCount >= allQuestions.length) {
        selectedQuestions = [...allQuestions];
      } else {
        const indices = Array.from({length: allQuestions.length}, (_, i) => i);
        // Shuffle indices to randomly select which questions
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        // Take first N indices and sort them to preserve order
        const selectedIndices = indices.slice(0, selectedCount).sort((a, b) => a - b);
        selectedQuestions = selectedIndices.map(i => allQuestions[i]);
      }
    } else {
      // Random order: use Fisher-Yates shuffle
      const shuffledQuestions = [...allQuestions];
      for (let i = shuffledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
      }
      selectedQuestions = shuffledQuestions.slice(0, selectedCount);
    }

    filteredQuestions.push(...selectedQuestions);
    filteredSections.push({
      ...section,
      questions: selectedQuestions,
      actualSelected: selectedQuestions.length
    });


  }



  return {
    questions: filteredQuestions,
    sections: filteredSections
  };
}

/**
 * Gets the display question count for a quiz (for UI purposes)
 * Returns either direct question count or recursive count for multi-quizzes
 */
export async function getDisplayQuestionCount(
  quiz: Quiz,
  storage: StorageService
): Promise<number> {
  try {
    // Use the new leaf-based counting system
    const { getTotalLeafQuestions } = await import('./quizSourceTree');
    return await getTotalLeafQuestions(quiz, storage);
  } catch (error) {

    // Fallback to direct question count
    return quiz.questions?.length || 0;
  }
}

/**
 * Gets display question counts for multiple quizzes efficiently
 */
export async function getDisplayQuestionCounts(
  quizzes: Quiz[],
  storage: StorageService
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  
  // Process quizzes in parallel for better performance
  await Promise.all(
    quizzes.map(async (quiz) => {
      try {
        const count = await getDisplayQuestionCount(quiz, storage);
        counts.set(quiz.id, count);
      } catch (error) {

        counts.set(quiz.id, quiz.questions?.length || 0);
      }
    })
  );
  
  return counts;
}

/**
 * Validates that a multi-quiz source configuration is valid considering recursive question counts
 */
export async function validateRecursiveQuizSource(
  sourceConfig: { quizId: string; minQuestions: number | string; maxQuestions: number | string },
  storage: StorageService,
  sourceIndex: number
): Promise<string[]> {
  const errors: string[] = [];
  
  try {
    const sourceQuiz = await storage.getQuizById(sourceConfig.quizId);
    if (!sourceQuiz) {
      errors.push(`Quiz Source #${sourceIndex + 1}: Selected quiz not found`);
      return errors;
    }

    const minQuestions = typeof sourceConfig.minQuestions === 'string' ? parseInt(sourceConfig.minQuestions) || 0 : sourceConfig.minQuestions || 0;
    const maxQuestions = typeof sourceConfig.maxQuestions === 'string' ? parseInt(sourceConfig.maxQuestions) || 0 : sourceConfig.maxQuestions || 0;

    // Only validate basic logic, not against available questions
    // The actual question generation will handle the recursive resolution
    // and intelligently select questions from nested sources
    
    // Basic validations only
    if (minQuestions < 1) {
      errors.push(`Quiz Source #${sourceIndex + 1}: Minimum questions must be at least 1`);
    }
    
    if (maxQuestions < 1) {
      errors.push(`Quiz Source #${sourceIndex + 1}: Maximum questions must be at least 1`);
    }

    if (minQuestions > maxQuestions) {
      errors.push(`Quiz Source #${sourceIndex + 1}: Minimum (${minQuestions}) cannot be greater than maximum (${maxQuestions})`);
    }

    // Note: We don't validate against available questions here because:
    // 1. The recursive resolver will handle nested sources intelligently
    // 2. Question selection happens during generation, not validation
    // 3. This matches the behavior in the create/edit page

  } catch (error) {
    errors.push(`Quiz Source #${sourceIndex + 1}: Error validating quiz - ${error}`);
  }

  return errors;
}
