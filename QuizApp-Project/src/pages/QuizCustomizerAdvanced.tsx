import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, CustomQuizSource } from "@/types/quiz";
import { validateRecursiveQuizSource } from "@/lib/recursiveQuizResolver";
import { getTotalLeafQuestions } from '@/lib/quizSourceTree';
import { QuizSourceManager } from '@/components/quiz-creator/QuizSourceManager';
import { toast } from "sonner";
import { Plus, Minus, Settings, Play, FileText } from "lucide-react";

export const QuizCustomizerAdvanced: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [customTimeLimit, setCustomTimeLimit] = useState<number | null>(null);
  const [customPerQuestionTimeLimit, setCustomPerQuestionTimeLimit] = useState<number | null>(null);
  const [customRandomize, setCustomRandomize] = useState<boolean | null>(null);
  const [customQuestionLimit, setCustomQuestionLimit] = useState<number | null>(null);
  const [multiQuizMode, setMultiQuizMode] = useState(false);
  const [customQuizSources, setCustomQuizSources] = useState<CustomQuizSource[]>([]);

  useEffect(() => {
    if (!id || !user) return;
    
    const loadQuiz = async () => {
      const fetchedQuiz = await storage.getQuizById(id);
      if (!fetchedQuiz) {
        navigate("/dashboard");
        return;
      }
      
      setQuiz(fetchedQuiz);
      setCustomTimeLimit(fetchedQuiz.timeLimit || null);
      setCustomPerQuestionTimeLimit(fetchedQuiz.perQuestionTimeLimit || null);
      setCustomRandomize(fetchedQuiz.randomize);
      setCustomQuestionLimit(fetchedQuiz.questionLimit || null);
      
      // Load all available quizzes for multi-quiz mode
      const allQuizzesData = await storage.getQuizzes();
      const accessibleQuizzes = allQuizzesData.filter(q => 
        q.isPublic || 
        q.creator === user.id || 
        q.sharedWith?.includes(user.id)
      );
      setAllQuizzes(accessibleQuizzes.filter(q => q.id !== id)); // Exclude current quiz
    };
    
    loadQuiz();
  }, [id, user, navigate]);

  const addQuizSource = () => {
    setCustomQuizSources([...customQuizSources, {
      quizId: '',
      minQuestions: 1,
      maxQuestions: 5,
      fixedCount: false
    }]);
  };

  const removeQuizSource = (index: number) => {
    setCustomQuizSources(customQuizSources.filter((_, i) => i !== index));
  };

  const updateQuizSource = (index: number, field: keyof CustomQuizSource, value: any) => {
    const newSources = [...customQuizSources];
    newSources[index] = { ...newSources[index], [field]: value };
    setCustomQuizSources(newSources);
  };

  const validateQuizSources = async (): Promise<string | null> => {
    for (const source of customQuizSources) {
      if (!source.quizId) return "Please select a quiz for all sources";
      
      const sourceQuiz = allQuizzes.find(q => q.id === source.quizId);
      if (!sourceQuiz) return "Invalid quiz selected";
      
      if (source.minQuestions < 1) return "Minimum questions must be at least 1";
      if (source.maxQuestions < source.minQuestions) return "Maximum questions must be >= minimum questions";
      // Use recursive validation for accurate question counts
      const recursiveErrors = await validateRecursiveQuizSource(source, storage, customQuizSources.indexOf(source));
      if (recursiveErrors.length > 0) {
        return recursiveErrors[0];
      }
      
      if (source.fixedCount && source.minQuestions !== source.maxQuestions) {
        return "For fixed count, min and max questions must be equal";
      }
    }
    return null;
  };

  const getTotalQuestionRange = () => {
    if (multiQuizMode) {
      const min = customQuizSources.reduce((sum, source) => sum + source.minQuestions, 0);
      const max = customQuizSources.reduce((sum, source) => sum + source.maxQuestions, 0);
      return { min, max };
    } else {
      const totalQuestions = quiz?.questions.length || 0;
      const limit = customQuestionLimit || totalQuestions;
      return { min: Math.min(limit, totalQuestions), max: Math.min(limit, totalQuestions) };
    }
  };

  const startQuiz = async () => {
    if (!quiz) return;

    if (multiQuizMode) {
      const validationError = await validateQuizSources();
      if (validationError) {
        toast.error(validationError);
        return;
      }
      if (customQuizSources.length === 0) {
        toast.error("Please add at least one quiz source");
        return;
      }
    }

    // Build URL with custom parameters
    const params = new URLSearchParams();
    
    if (customTimeLimit !== null && customTimeLimit !== quiz.timeLimit) {
      params.set('timeLimit', customTimeLimit.toString());
    }
    
    if (customPerQuestionTimeLimit !== null && customPerQuestionTimeLimit !== quiz.perQuestionTimeLimit) {
      params.set('perQuestionTimeLimit', customPerQuestionTimeLimit.toString());
    }
    
    if (customRandomize !== null && customRandomize !== quiz.randomize) {
      params.set('randomize', customRandomize.toString());
    }

    if (multiQuizMode) {
      params.set('multiQuizMode', 'true');
      params.set('quizSources', JSON.stringify(customQuizSources));
    } else if (customQuestionLimit !== null && customQuestionLimit !== quiz.questions.length) {
      params.set('questionLimit', customQuestionLimit.toString());
    }

    const queryString = params.toString();
    const url = `/quiz/${quiz.id}/take${queryString ? `?${queryString}` : ''}`;
    
    navigate(url);
  };

  if (!quiz) return null;

  const { min: minQuestions, max: maxQuestions } = getTotalQuestionRange();

  return (
    <Terminal title={`customize: ${quiz.title}`}>
      <div className="space-y-6">
        <TerminalLine prefix="#">Quiz Customization Options</TerminalLine>

        {/* Basic Settings */}
        <div className="space-y-4 border border-terminal-accent/30 rounded p-4">
          <TerminalLine prefix=">" className="text-terminal-accent">Basic Settings</TerminalLine>
          
          {/* Time Limit */}
          <div className="ml-4">
            <label className="block text-sm font-medium mb-2">
              Quiz Time Limit (minutes, 0 = no limit)
            </label>
            <input
              type="number"
              min="0"
              value={customTimeLimit ? Math.floor(customTimeLimit / 60) : 0}
              onChange={(e) => setCustomTimeLimit(parseInt(e.target.value) * 60 || null)}
              className="w-32 px-3 py-1 bg-black/20 border border-terminal-accent/30 rounded text-terminal-bright"
            />
            <span className="text-xs text-terminal-dim ml-2">
              Default: {quiz.timeLimit ? `${Math.floor(quiz.timeLimit / 60)} minutes` : 'No limit'}
            </span>
          </div>

          {/* Per Question Time Limit */}
          <div className="ml-4">
            <label className="block text-sm font-medium mb-2">
              Per-Question Time Limit (seconds, 0 = no limit)
            </label>
            <input
              type="number"
              min="0"
              value={customPerQuestionTimeLimit || 0}
              onChange={(e) => setCustomPerQuestionTimeLimit(parseInt(e.target.value) || null)}
              className="w-32 px-3 py-1 bg-black/20 border border-terminal-accent/30 rounded text-terminal-bright"
            />
            <span className="text-xs text-terminal-dim ml-2">
              Default: {quiz.perQuestionTimeLimit ? `${quiz.perQuestionTimeLimit}s` : 'No limit'}
            </span>
            {customPerQuestionTimeLimit && (
              <div className="text-xs text-yellow-300 mt-1">
                ⚠️ Per-question timer mode: No revisiting previous questions
              </div>
            )}
          </div>

          {/* Randomization */}
          <div className="ml-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customRandomize || false}
                onChange={(e) => setCustomRandomize(e.target.checked)}
                className="accent-terminal-accent"
              />
              <span>Randomize question order</span>
            </label>
            <span className="text-xs text-terminal-dim ml-6">
              Default: {quiz.randomize ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Quiz Mode Selection */}
        <div className="space-y-4 border border-terminal-accent/30 rounded p-4">
          <TerminalLine prefix=">" className="text-terminal-accent">Quiz Mode</TerminalLine>
          
          <div className="ml-4 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="quizMode"
                checked={!multiQuizMode}
                onChange={() => setMultiQuizMode(false)}
                className="accent-terminal-accent"
              />
              <span>Single Quiz Mode</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="quizMode"
                checked={multiQuizMode}
                onChange={() => setMultiQuizMode(true)}
                className="accent-terminal-accent"
              />
              <span>Multi-Quiz Composition Mode</span>
            </label>
          </div>
        </div>

        {/* Single Quiz Mode Settings */}
        {!multiQuizMode && (
          <div className="space-y-4 border border-terminal-accent/30 rounded p-4">
            <TerminalLine prefix=">" className="text-terminal-accent">
              Single Quiz Settings
            </TerminalLine>
            
            <div className="ml-4">
              <label className="block text-sm font-medium mb-2">
                Number of Questions (from {quiz.questions.length} available)
              </label>
              <input
                type="number"
                min="1"
                max={quiz.questions.length}
                value={customQuestionLimit || quiz.questions.length}
                onChange={(e) => setCustomQuestionLimit(parseInt(e.target.value) || null)}
                className="w-32 px-3 py-1 bg-black/20 border border-terminal-accent/30 rounded text-terminal-bright"
              />
              <span className="text-xs text-terminal-dim ml-2">
                Default: All {quiz.questions.length} questions
              </span>
            </div>
          </div>
        )}

        {/* Multi-Quiz Mode Settings */}
        {multiQuizMode && (
          <div className="space-y-4 border border-terminal-accent/30 rounded p-4">
            <div className="flex justify-between items-center">
              <TerminalLine prefix=">" className="text-terminal-accent">
                Multi-Quiz Sources
              </TerminalLine>
              <TerminalButton onClick={addQuizSource}>
                <Plus className="w-4 h-4 mr-1" />
                Add Quiz
              </TerminalButton>
            </div>
            
            {customQuizSources.length === 0 ? (
              <div className="ml-4 text-terminal-dim text-sm">
                No quiz sources added. Click "Add Quiz" to start composing your custom quiz.
              </div>
            ) : (
              <div className="ml-4 space-y-3">
                {customQuizSources.map((source, index) => (
                  <div key={index} className="border border-terminal-accent/20 rounded p-3">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-sm font-medium">Quiz Source #{index + 1}</div>
                      <TerminalButton
                        onClick={() => removeQuizSource(index)}
                        className="text-xs bg-red-900/20 hover:bg-red-900/30"
                      >
                        <Minus className="w-3 h-3" />
                      </TerminalButton>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Quiz</label>
                        <select
                          value={source.quizId}
                          onChange={(e) => updateQuizSource(index, 'quizId', e.target.value)}
                          className="w-full px-2 py-1 bg-black/20 border border-terminal-accent/30 rounded text-terminal-bright text-sm"
                        >
                          <option value="">Select a quiz...</option>
                          {allQuizzes.map(q => (
                            <option key={q.id} value={q.id}>
                              {q.title} ({q.questions.length} questions)
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium mb-1">Min Questions</label>
                          <input
                            type="number"
                            min="1"
                            value={source.minQuestions}
                            onChange={(e) => updateQuizSource(index, 'minQuestions', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 bg-black/20 border border-terminal-accent/30 rounded text-terminal-bright text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Max Questions</label>
                          <input
                            type="number"
                            min={source.minQuestions}
                            value={source.maxQuestions}
                            onChange={(e) => updateQuizSource(index, 'maxQuestions', parseInt(e.target.value) || source.minQuestions)}
                            className="w-full px-2 py-1 bg-black/20 border border-terminal-accent/30 rounded text-terminal-bright text-sm"
                          />
                        </div>
                      </div>
                      
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={source.fixedCount || false}
                          onChange={(e) => updateQuizSource(index, 'fixedCount', e.target.checked)}
                          className="accent-terminal-accent"
                        />
                        <span>Fixed count (exact number between min-max)</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="border border-terminal-accent/30 rounded p-4 bg-terminal-accent/5">
          <TerminalLine prefix=">" className="text-terminal-accent mb-2">
            Quiz Summary
          </TerminalLine>
          <div className="ml-4 text-sm space-y-1">
            <div>Questions: {minQuestions === maxQuestions ? minQuestions : `${minQuestions}-${maxQuestions}`}</div>
            <div>Time Limit: {customTimeLimit ? `${Math.floor(customTimeLimit / 60)} minutes` : 'No limit'}</div>
            {customPerQuestionTimeLimit && (
              <div>Per-Question Timer: {customPerQuestionTimeLimit} seconds</div>
            )}
            <div>Randomized: {customRandomize ? 'Yes' : 'No'}</div>
            <div>Mode: {multiQuizMode ? `Multi-Quiz (${customQuizSources.length} sources)` : 'Single Quiz'}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <TerminalButton onClick={() => navigate("/dashboard")}>
            back to dashboard
          </TerminalButton>
          <TerminalButton onClick={startQuiz} className="bg-terminal-accent/20 hover:bg-terminal-accent/30">
            <Play className="w-4 h-4 mr-1" />
            start quiz
          </TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};