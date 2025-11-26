import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder } from "@/types/quiz";
import { Clock, Shuffle, Settings, Play } from "lucide-react";
import { toast } from "sonner";
import { useMultiQuizManager } from "@/hooks/useMultiQuizManager";
import { QuizSourceManager } from "@/components/quiz-creator/QuizSourceManager";
import { MediaUploader, type MediaItem } from "@/components/quiz-creator/MediaUploader";
import { ValidationErrorDisplay, ValidationErrors } from "@/components/ValidationErrorDisplay";

export const QuizCustomizer: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [customSettings, setCustomSettings] = useState({
    timeLimit: null as number | null,
    perQuestionTimeLimit: null as number | null,
    randomize: false,
    questionLimit: null as number | null,
    useDefault: true
  });
  const [loading, setLoading] = useState(true);
  
  // Multi-quiz management
  const { state: multiQuizState, actions: multiQuizActions } = useMultiQuizManager();
  
  // Additional state for advanced features
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [uploadedMedia] = useState<MediaItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{
    type: 'question_limit' | 'json_parse' | 'json_structure' | 'multi_quiz' | 'general';
    message: string;
    details?: string;
    solution?: string;
  }>>([]);

  useEffect(() => {
    if (!user || !id) {
      navigate("/");
      return;
    }
    loadQuiz();
    loadFoldersAndQuizzes();
  }, [user, id, navigate]);

  const loadFoldersAndQuizzes = useCallback(async () => {
    if (!user) return;
    
    try {
      const allQuizzes = await storage.getQuizzes();
      const allFolders = await storage.getFolders();
      
      // Get all accessible quizzes (public + user's own + shared quizzes) - exactly like Dashboard
      const accessibleQuizzes = allQuizzes.filter(
        (q) => (q.isPublic || q.creator === user.id || q.sharedWith?.includes(user.id)) && q.id !== id
      ); // Exclude current quiz being customized
      
      // Get all accessible folders (public + user's own + shared folders) - exactly like Dashboard
      const accessibleFolders = allFolders.filter(
        (f) => f.isPublic || f.creator === user.id || f.sharedWith?.includes(user.id)
      );
      
      setAvailableQuizzes(accessibleQuizzes);
      setFolders(accessibleFolders);
      
      multiQuizActions.setCurrentFolder('');
    } catch (error) {
      console.error("Failed to load folders and quizzes:", error);
    }
  }, [user, id, multiQuizActions]);

  const loadQuiz = async () => {
    if (!id) return;
    
    try {
      const quizData = await storage.getQuizById(id);
      if (!quizData) {
        toast.error("Quiz not found");
        navigate("/dashboard");
        return;
      }
      
      setQuiz(quizData);
      
      // Initialize custom settings with quiz defaults
      setCustomSettings({
        timeLimit: quizData.timeLimit,
        perQuestionTimeLimit: quizData.perQuestionTimeLimit,
        randomize: quizData.randomize || false,
        questionLimit: quizData.questionLimit || null,
        useDefault: true
      });
      
      // Load multi-quiz configuration if present
      if (quizData.multiQuizSources) {
        multiQuizActions.loadMultiQuizConfiguration(quizData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to load quiz:", error);
      toast.error("Failed to load quiz");
      navigate("/dashboard");
    }
  };

  const handleStartQuiz = async () => {
    if (!quiz) return;
    
    // Clear previous validation errors
    setValidationErrors([]);
    
    // Validate question limit if set
    if (customSettings.questionLimit) {
      if (multiQuizState.multiQuizMode) {
        // For multi-quiz, we need to calculate total minimum questions
        let totalMinQuestions = 0;
        for (const source of multiQuizState.quizSources) {
          const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
          totalMinQuestions += minQuestions;
        }
        if (customSettings.questionLimit < totalMinQuestions) {
          const error = ValidationErrors.questionLimit(customSettings.questionLimit, totalMinQuestions);
          setValidationErrors([error]);
          toast.error(`Question limit (${customSettings.questionLimit}) is less than minimum required questions (${totalMinQuestions}) from your sources`);
          return;
        }
      } else {
        // For single quiz, validate against total questions
        if (customSettings.questionLimit > (quiz.questions?.length || 0)) {
          const error = ValidationErrors.questionLimit(customSettings.questionLimit, quiz.questions?.length || 0);
          setValidationErrors([error]);
          toast.error(`Question limit (${customSettings.questionLimit}) cannot be greater than total questions (${quiz.questions?.length || 0})`);
          return;
        }
      }
    }
    
    // Validate multi-quiz settings if enabled
    if (multiQuizState.multiQuizMode) {
      try {
        // Pass the overall question limit for validation
        const overallLimit = customSettings.questionLimit || quiz.questionLimit || quiz.customQuestionLimit;
        const validationMessages = await multiQuizActions.validateQuizSources(availableQuizzes, storage, overallLimit);
        if (validationMessages.length > 0) {
          console.error('❌ Multi-quiz validation failed:', validationMessages);
          const errors = validationMessages.map(msg => ({
            type: 'multi_quiz' as const,
            message: 'Multi-quiz configuration error',
            details: msg,
            solution: 'Please check your quiz source configurations and ensure all minimum/maximum values are valid.'
          }));
          setValidationErrors(errors);
          toast.error(`Configuration error: ${validationMessages[0]}`);
          return;
        }
        if (multiQuizState.quizSources.length === 0) {
          const error = ValidationErrors.multiQuizMinimum('Multi-quiz sources', 1, 0);
          setValidationErrors([error]);
          toast.error("Please add at least one quiz source for multi-quiz mode");
          return;
        }
        console.log('✅ Multi-quiz validation passed');
      } catch (error) {
        console.error('❌ Error during multi-quiz validation:', error);
        const validationError = {
          type: 'multi_quiz' as const,
          message: 'Validation error during multi-quiz setup',
          details: error instanceof Error ? error.message : String(error),
          solution: 'Please check your network connection and try again, or contact support if the problem persists.'
        };
        setValidationErrors([validationError]);
        toast.error(`Validation error: ${error}`);
        return;
      }
    }
    
    // Create URL params for custom settings
    const params = new URLSearchParams();
    
    if (!customSettings.useDefault) {
      if (customSettings.timeLimit !== null) {
        params.set('timeLimit', customSettings.timeLimit.toString());
      }
      if (customSettings.perQuestionTimeLimit !== null) {
        params.set('perQuestionTimeLimit', customSettings.perQuestionTimeLimit.toString());
      }
      params.set('randomize', customSettings.randomize.toString());
      if (customSettings.questionLimit !== null) {
        params.set('questionLimit', customSettings.questionLimit.toString());
      }
    }
    
    // Add multi-quiz parameters
    if (multiQuizState.multiQuizMode) {
      params.set('multiQuizMode', 'true');
      params.set('quizSources', JSON.stringify(multiQuizState.quizSources));
      params.set('preserveQuizOrder', multiQuizState.preserveQuizOrder.toString());
    }
    
    const queryString = params.toString();
    navigate(`/quiz/${quiz.id}/take${queryString ? '?' + queryString : ''}`);
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "No limit";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    return `${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <Terminal title="loading quiz...">
        <TerminalLine prefix=">">Loading quiz settings...</TerminalLine>
      </Terminal>
    );
  }

  if (!quiz) {
    return (
      <Terminal title="quiz not found">
        <TerminalLine prefix="!">Quiz not found</TerminalLine>
        <TerminalButton onClick={() => navigate("/dashboard")}>back to dashboard</TerminalButton>
      </Terminal>
    );
  }

  return (
    <Terminal title={`customize: ${quiz.title}`}>
      <div className="space-y-6">
        {/* Quiz Info */}
        <div>
          <TerminalLine prefix="#">{quiz.title}</TerminalLine>
          {quiz.desc && (
            <TerminalLine prefix="-" className="text-terminal-dim ml-6">
              {quiz.desc}
            </TerminalLine>
          )}
          <TerminalLine prefix="?" className="text-terminal-bright ml-6">
            {quiz.questions?.length || 0} questions{quiz.multiQuizSources ? " (base only - recursive calculation at runtime)" : ""}
          </TerminalLine>
        </div>

        {/* Validation Errors Display */}
        {validationErrors.length > 0 && (
          <ValidationErrorDisplay 
            errors={validationErrors} 
            className="my-4"
          />
        )}

        {/* Settings Toggle */}
        <div>
          <TerminalLine prefix="#">Quiz Settings</TerminalLine>
          
          <div className="ml-6 mt-3 space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={customSettings.useDefault}
                onChange={(e) => setCustomSettings(prev => ({ ...prev, useDefault: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-terminal-bright">
                Use default quiz settings
                {customSettings.useDefault && (
                  <span className="text-terminal-dim ml-2">(recommended)</span>
                )}
              </span>
            </label>

            {/* Advanced Settings Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-terminal-accent/30">
              <div className="text-lg font-bold text-terminal-bright">🔧 Advanced Customization</div>
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 py-2 px-4 rounded font-medium transition-colors"
              >
                {showAdvancedSettings ? '🔼 Hide Advanced' : '🔽 Show Advanced'}
              </button>
            </div>

            {!customSettings.useDefault && (
              <div className="space-y-4 p-4 border border-terminal-accent/30 rounded">
                <TerminalLine prefix=">" className="text-terminal-accent">
                  Custom Settings for This Attempt
                </TerminalLine>

                {/* Overall Time Limit */}
                <div>
                  <label className="block text-terminal-bright mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Overall Time Limit
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={customSettings.timeLimit || ""}
                      onChange={(e) => setCustomSettings(prev => ({ 
                        ...prev, 
                        timeLimit: e.target.value ? parseInt(e.target.value) : null,
                        perQuestionTimeLimit: e.target.value ? null : prev.perQuestionTimeLimit // Clear per-question when overall is set
                      }))}
                      placeholder="No limit"
                      className="w-20 bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
                    />
                    <span className="text-terminal-dim">seconds</span>
                    <span className="text-terminal-accent">
                      ({formatTime(customSettings.timeLimit)})
                    </span>
                  </div>
                  <div className="text-xs text-terminal-dim mt-1">
                    Default: {formatTime(quiz.timeLimit)}
                  </div>
                  {customSettings.perQuestionTimeLimit && (
                    <div className="text-xs text-yellow-400 mt-1">
                      ⚠️ Cannot use both time limits. Clear per-question limit to use overall limit.
                    </div>
                  )}
                </div>

                {/* Per Question Time Limit */}
                <div>
                  <label className="block text-terminal-bright mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Per Question Time Limit
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={customSettings.perQuestionTimeLimit || ""}
                      onChange={(e) => setCustomSettings(prev => ({ 
                        ...prev, 
                        perQuestionTimeLimit: e.target.value ? parseInt(e.target.value) : null,
                        timeLimit: e.target.value ? null : prev.timeLimit // Clear overall when per-question is set
                      }))}
                      placeholder="No limit"
                      className="w-20 bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
                    />
                    <span className="text-terminal-dim">seconds</span>
                    <span className="text-terminal-accent">
                      ({formatTime(customSettings.perQuestionTimeLimit)})
                    </span>
                    {customSettings.perQuestionTimeLimit && parseInt(customSettings.perQuestionTimeLimit.toString()) > 0 && (
                      <span className="text-green-400 text-sm ml-2">
                        ≈ {Math.ceil((customSettings.perQuestionTimeLimit * (quiz.questions?.length || 0)) / 60)}min total
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-terminal-dim mt-1">
                    Default: {formatTime(quiz.perQuestionTimeLimit)}
                  </div>
                  {customSettings.timeLimit && (
                    <div className="text-xs text-yellow-400 mt-1">
                      ⚠️ Cannot use both time limits. Clear overall limit to use per-question limit.
                    </div>
                  )}
                </div>

                {/* Randomize Questions */}
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={customSettings.randomize}
                      onChange={(e) => setCustomSettings(prev => ({ ...prev, randomize: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-terminal-bright">
                      <Shuffle className="w-4 h-4 inline mr-2" />
                      Randomize question order
                    </span>
                  </label>
                </div>

                {/* Question Limit */}
                <div>
                  <label className="block text-terminal-bright mb-2">
                    🎯 Question Limit
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={customSettings.questionLimit || ""}
                      onChange={(e) => setCustomSettings(prev => ({ 
                        ...prev, 
                        questionLimit: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      placeholder="All questions"
                      min="1"
                      max={quiz.questions.length}
                      className="w-20 bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
                    />
                    <span className="text-terminal-dim">out of {quiz.questions?.length || 0} questions{quiz.multiQuizSources ? " (base only)" : ""}</span>
                  </div>
                  <div className="text-xs text-terminal-dim mt-1">
                    Limit how many questions to include (requires randomization)
                  </div>
                  <div className="text-xs text-terminal-dim mt-1 ml-7">
                    Default: {quiz.randomize ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings Panel */}
            {showAdvancedSettings && (
              <div className="space-y-6 mt-6">
                {/* Multi-Quiz Mode */}
                <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🔗</span>
                    <div>
                      <div className="font-bold text-terminal-bright">Multi-Quiz Composition</div>
                      <div className="text-sm text-terminal-dim">Combine questions from multiple quizzes</div>
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={multiQuizState.multiQuizMode}
                      onChange={(e) => multiQuizActions.setMultiQuizMode(e.target.checked)}
                      className="accent-terminal-accent scale-125"
                    />
                    <span className="font-medium">Enable Multi-Quiz Mode</span>
                  </label>

                  {multiQuizState.multiQuizMode && (
                    <div className="mb-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={multiQuizState.preserveQuizOrder}
                          onChange={(e) => multiQuizActions.setPreserveQuizOrder(e.target.checked)}
                          className="accent-terminal-accent scale-110"
                        />
                        <span className="font-medium text-blue-300">🔄 Preserve Quiz Order</span>
                      </label>
                      <div className="text-xs text-terminal-dim mt-1 ml-6 space-y-1">
                        <div>✅ <strong>Enabled:</strong> Questions stay grouped by source quiz</div>
                        <div>❌ <strong>Disabled:</strong> Fully random mix across all sources</div>
                      </div>
                    </div>
                  )}

                  {multiQuizState.multiQuizMode && (
                    <QuizSourceManager
                      quizSources={multiQuizState.quizSources}
                      availableQuizzes={availableQuizzes}
                      folders={folders}
                      showQuizPicker={multiQuizState.showQuizPicker}
                      currentFolder={multiQuizState.currentFolder}
                      onAddSource={multiQuizActions.addQuizSource}
                      onRemoveSource={multiQuizActions.removeQuizSource}
                      onUpdateSource={multiQuizActions.updateQuizSource}
                      onOpenPicker={multiQuizActions.openQuizPicker}
                      onClosePicker={multiQuizActions.closeQuizPicker}
                      onFolderChange={multiQuizActions.setCurrentFolder}
                      onQuizSelect={multiQuizActions.selectQuizForSource}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings Summary */}
        {(customSettings.useDefault || multiQuizState.multiQuizMode) && (
          <div className="p-4 border border-terminal-accent/30 rounded">
            <TerminalLine prefix=">" className="text-terminal-accent mb-3">
              {customSettings.useDefault && !multiQuizState.multiQuizMode ? 'Default Quiz Settings' : 'Quiz Configuration Summary'}
            </TerminalLine>
            <div className="ml-6 space-y-2 text-sm">
              {customSettings.useDefault && !multiQuizState.multiQuizMode ? (
                <>
                  <div>
                    <Clock className="w-4 h-4 inline mr-2 text-terminal-dim" />
                    Overall time limit: <span className="text-terminal-bright">{formatTime(quiz.timeLimit)}</span>
                  </div>
                  <div>
                    <Clock className="w-4 h-4 inline mr-2 text-terminal-dim" />
                    Per question time limit: <span className="text-terminal-bright">{formatTime(quiz.perQuestionTimeLimit)}</span>
                  </div>
                  <div>
                    <Shuffle className="w-4 h-4 inline mr-2 text-terminal-dim" />
                    Question order: <span className="text-terminal-bright">{quiz.randomize ? 'Random' : 'Fixed'}</span>
                  </div>
                </>
              ) : (
                <>
                  {multiQuizState.multiQuizMode && (
                    <div className="space-y-1">
                      <div>
                        <span className="text-terminal-accent">🔗 Multi-Quiz Mode:</span> 
                        <span className="text-terminal-bright ml-2">
                          {multiQuizState.quizSources.length} source{multiQuizState.quizSources.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {multiQuizState.quizSources.length > 0 && (
                        <div className="text-terminal-dim text-xs ml-6">
                          {multiQuizState.quizSources.length} source{multiQuizState.quizSources.length !== 1 ? 's' : ''} configured
                        </div>
                      )}
                      <div className="text-terminal-dim text-xs ml-6">
                        Quiz order: {multiQuizState.preserveQuizOrder ? 'Preserved' : 'Fully randomized'}
                      </div>
                    </div>
                  )}
                  {!customSettings.useDefault && (
                    <>
                      <div>
                        <Clock className="w-4 h-4 inline mr-2 text-terminal-dim" />
                        Custom time limit: <span className="text-terminal-bright">{formatTime(customSettings.timeLimit)}</span>
                      </div>
                      <div>
                        <Clock className="w-4 h-4 inline mr-2 text-terminal-dim" />
                        Custom per-question limit: <span className="text-terminal-bright">{formatTime(customSettings.perQuestionTimeLimit)}</span>
                      </div>
                      <div>
                        <Shuffle className="w-4 h-4 inline mr-2 text-terminal-dim" />
                        Randomization: <span className="text-terminal-bright">{customSettings.randomize ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      {customSettings.questionLimit && (
                        <div>
                          <span className="text-terminal-dim">🎯 Question limit:</span>
                          <span className="text-terminal-bright ml-2">{customSettings.questionLimit} questions</span>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <TerminalButton onClick={handleStartQuiz} className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Start Quiz
            {(!customSettings.useDefault || multiQuizState.multiQuizMode) && (
              <span className="text-xs">
                ({!customSettings.useDefault ? 'custom' : ''}{!customSettings.useDefault && multiQuizState.multiQuizMode ? '+' : ''}{multiQuizState.multiQuizMode ? 'multi-quiz' : ''})
              </span>
            )}
          </TerminalButton>
          
          <TerminalButton onClick={() => navigate("/dashboard")}>
            back to dashboard
          </TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};