import { useState, useEffect } from 'react';
import { QuizDetailInfo, QuizDetailResolver } from '@/lib/quizDetails';
import { storage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';

// Singleton instance
const quizDetailResolver = new QuizDetailResolver(storage);

/**
 * Hook for getting details of a single quiz
 */
export const useQuizDetails = (quizId?: string) => {
  const { user } = useAuth();
  const [details, setDetails] = useState<QuizDetailInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quizId && user) {
      loadDetails();
    } else {
      setDetails(null);
    }
  }, [quizId, user?.id]);

  const loadDetails = async () => {
    if (!quizId || !user) return;

    setLoading(true);
    setError(null);
    try {
      const result = await quizDetailResolver.getQuizDetails(quizId, user.id);
      setDetails(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz details');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    if (quizId) {
      quizDetailResolver.clearCache(quizId);
      loadDetails();
    }
  };

  return { details, loading, error, refresh };
};

/**
 * Hook for getting details of multiple quizzes
 */
export const useMultipleQuizDetails = (quizIds: string[]) => {
  const { user } = useAuth();
  const [detailsMap, setDetailsMap] = useState<Map<string, QuizDetailInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quizIds.length > 0 && user) {
      loadAllDetails();
    } else {
      setDetailsMap(new Map());
    }
  }, [JSON.stringify(quizIds), user?.id]);

  const loadAllDetails = async () => {
    if (quizIds.length === 0 || !user) return;

    setLoading(true);
    setError(null);
    try {
      const result = await quizDetailResolver.getMultipleQuizDetails(quizIds, user.id);
      setDetailsMap(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz details');
    } finally {
      setLoading(false);
    }
  };

  const refresh = (specificQuizIds?: string[]) => {
    const idsToRefresh = specificQuizIds || quizIds;
    idsToRefresh.forEach(id => quizDetailResolver.clearCache(id));
    loadAllDetails();
  };

  return { detailsMap, loading, error, refresh };
};

/**
 * Hook for getting accessible quizzes with details
 */
export const useAccessibleQuizzes = (folderPath?: string) => {
  const { user } = useAuth();
  const [quizzesWithDetails, setQuizzesWithDetails] = useState<Array<QuizDetailInfo & { quiz: any }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAccessibleQuizzes();
    }
  }, [user?.id, folderPath]);

  const loadAccessibleQuizzes = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const result = await quizDetailResolver.getAccessibleQuizzes(user.id, folderPath);
      setQuizzesWithDetails(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accessible quizzes');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    quizDetailResolver.clearCache();
    loadAccessibleQuizzes();
  };

  return { quizzesWithDetails, loading, error, refresh };
};

/**
 * Hook for getting folder tree with quiz counts
 */
export const useFolderTreeWithDetails = () => {
  const { user } = useAuth();
  const [folderTree, setFolderTree] = useState<Array<{
    folder: any;
    quizCount: number;
    totalQuestions: number;
    subfolderCount: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadFolderTree();
    }
  }, [user?.id]);

  const loadFolderTree = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const result = await quizDetailResolver.getFolderTreeWithDetails(user.id);
      setFolderTree(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folder tree');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    quizDetailResolver.clearCache();
    loadFolderTree();
  };

  return { folderTree, loading, error, refresh };
};