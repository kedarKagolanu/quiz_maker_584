import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalButton, TerminalLine } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz } from "@/types/quiz";
import { toast } from "sonner";
import { Settings, Timer, Shuffle, Target, Link, Save, ArrowLeft } from "lucide-react";

export const UnifiedQuizAdvanced: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "customize"; // customize | create | edit
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  
  // Main settings
  const [questionLimit, setQuestionLimit] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [perQuestionTimeLimit, setPerQuestionTimeLimit] = useState<string>("");
  const [randomize, setRandomize] = useState(false);
  const [imageSize, setImageSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  
  // Multi-quiz settings
  const [multiQuizMode, setMultiQuizMode] = useState(false);
  const [quizSources, setQuizSources] = useState<Array<{
    quizId: string;
    minQuestions: number;
    maxQuestions: number;
    fixedCount: boolean;
  }>>([]);
  
  // Custom quiz generation
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      // Load available quizzes
      const userQuizzes = await storage.getUserQuizzes(user.id);
      setAvailableQuizzes(userQuizzes);
      
      // Load current quiz if in customize/edit mode
      if (quizId) {
        const currentQuiz = await storage.getQuizById(quizId);
        if (currentQuiz) {
          setQuiz(currentQuiz);
          setQuestionLimit(currentQuiz.questionLimit || null);
          setTimeLimit(currentQuiz.timeLimit?.toString() || "");
          setPerQuestionTimeLimit(currentQuiz.perQuestionTimeLimit?.toString() || "");
          setRandomize(currentQuiz.randomize || false);
          setImageSize(currentQuiz.imageSize || 'medium');
        }
      }
    };
    loadData();
  }, [quizId, user]);

  const validateConfiguration = () => {
    if (!multiQuizMode) return { isValid: true, warnings: [], errors: [] };
    
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check if sources are selected
    const validSources = quizSources.filter(s => s.quizId);
    if (validSources.length === 0) {
      errors.push("No quiz sources selected");
      return { isValid: false, warnings, errors };
    }
    
    // Check question availability
    for (const source of validSources) {
      const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
      if (!sourceQuiz) {
        errors.push(`Quiz source not found: ${source.quizId}`);
        continue;
      }
      
      const available = sourceQuiz.questions?.length || 0;
      if (source.minQuestions > available) {
        errors.push(`${sourceQuiz.title}: requests ${source.minQuestions} questions but only ${available} available`);
      }
      if (source.maxQuestions > available) {
        errors.push(`${sourceQuiz.title}: max ${source.maxQuestions} questions but only ${available} available`);
      }
      if (source.minQuestions > source.maxQuestions) {
        errors.push(`${sourceQuiz.title}: minimum (${source.minQuestions}) cannot be greater than maximum (${source.maxQuestions})`);
      }
    }
    
    // Check total questions vs question limit
    const totalMin = validSources.reduce((sum, s) => sum + s.minQuestions, 0);
    const totalMax = validSources.reduce((sum, s) => sum + s.maxQuestions, 0);
    
    if (questionLimit) {
      if (totalMin > questionLimit) {
        warnings.push(`Minimum questions (${totalMin}) exceeds question limit (${questionLimit}). Quiz will be truncated.`);
      }
      if (totalMax < questionLimit) {
        warnings.push(`Maximum possible questions (${totalMax}) is less than question limit (${questionLimit}). You might get fewer questions than expected.`);
      }
    }
    
    return { 
      isValid: errors.length === 0, 
      warnings, 
      errors,
      totalMin,
      totalMax
    };
  };

  const generateCustomQuiz = async () => {
    if (!multiQuizMode || !user) return;
    
    const validation = validateConfiguration();
    if (!validation.isValid) {
      toast.error("Please fix configuration errors before generating quiz");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const allQuestions: any[] = [];
      
      // Collect questions from all sources
      for (const source of quizSources.filter(s => s.quizId)) {
        const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
        if (!sourceQuiz || !sourceQuiz.questions) continue;
        
        let questionsToTake;
        if (source.fixedCount) {
          questionsToTake = source.minQuestions;
        } else {
          questionsToTake = Math.floor(
            Math.random() * (source.maxQuestions - source.minQuestions + 1)
          ) + source.minQuestions;
        }
        
        // Shuffle and take questions
        const shuffled = [...sourceQuiz.questions].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, Math.min(questionsToTake, shuffled.length));
        
        allQuestions.push(...selectedQuestions);
      }
      
      // Apply question limit if set - always randomize when limiting
      let finalQuestions = allQuestions;
      if (questionLimit && allQuestions.length > questionLimit) {
        // Always randomize when applying question limit
        finalQuestions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, questionLimit);
      }
      
      // Apply randomization if enabled
      if (randomize) {
        finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
      }
      
      setCustomQuestions(finalQuestions);
      toast.success(`Generated quiz with ${finalQuestions.length} questions!`);
      
    } catch (error) {

      toast.error("Failed to generate custom quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  const startCustomQuiz = () => {
    if (customQuestions.length === 0) {
      toast.error("No questions available. Generate a quiz first.");
      return;
    }
    
    const customQuiz: Quiz = {
      id: `custom_${Date.now()}`,
      title: `Custom Quiz - ${new Date().toLocaleDateString()}`,
      questions: customQuestions,
      creator: user!.id,
      createdAt: Date.now(),
      isPublic: false,
      timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
      perQuestionTimeLimit: perQuestionTimeLimit ? parseInt(perQuestionTimeLimit) : undefined,
      randomize: false, // Already randomized
      questionLimit: null, // Already applied
    };
    
    // Store temporarily and navigate to quiz
    localStorage.setItem('tempCustomQuiz', JSON.stringify(customQuiz));
    navigate(`/quiz/custom_${Date.now()}/take`);
  };

  const saveSettings = async () => {
    if (!quiz || !user) return;
    
    const updatedQuiz: Quiz = {
      ...quiz,
      questionLimit: questionLimit || undefined,
      timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
      perQuestionTimeLimit: perQuestionTimeLimit ? parseInt(perQuestionTimeLimit) : undefined,
      randomize,
      imageSize,
    };
    
    try {
      await storage.updateQuiz(updatedQuiz);
      toast.success("Quiz settings saved!");
      setQuiz(updatedQuiz);
    } catch (error) {

      toast.error("Failed to save settings");
    }
  };

  const validation = validateConfiguration();

  return (
    <Terminal title="🔧 Advanced Quiz Configuration">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <TerminalLine prefix="📋">
              {mode === "customize" ? `Customizing: ${quiz?.title || "Loading..."}` : 
               mode === "create" ? "Creating New Advanced Quiz" : 
               "Editing Quiz Settings"}
            </TerminalLine>
            <div className="text-sm text-terminal-dim mt-1">
              Configure advanced settings, merge quizzes, and customize timing
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-terminal-accent hover:text-terminal-bright"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        {/* Basic Settings */}
        <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-6 h-6 text-terminal-accent" />
            <div>
              <div className="font-bold text-terminal-bright text-lg">Basic Configuration</div>
              <div className="text-sm text-terminal-dim">Core quiz behavior settings</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timing Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-terminal-bright font-medium">
                <Timer className="w-5 h-5" />
                <span>Timing Configuration</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-terminal-bright mb-2">
                  Quiz Time Limit (seconds)
                </label>
                <input
                  type="number"
                  value={perQuestionTimeLimit ? "" : timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  disabled={!!perQuestionTimeLimit}
                  className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded disabled:opacity-50"
                  placeholder="Unlimited"
                />
                <div className="text-xs text-terminal-dim mt-1">
                  Total time for entire quiz (allows revisiting questions)
                </div>
                {perQuestionTimeLimit && (
                  <div className="text-xs text-yellow-400 mt-1">
                    Auto-calculated: {parseInt(perQuestionTimeLimit) * (quiz?.questions?.length || 1)}s
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-terminal-bright mb-2">
                  Per-Question Time Limit (seconds)
                </label>
                <input
                  type="number"
                  value={perQuestionTimeLimit}
                  onChange={(e) => setPerQuestionTimeLimit(e.target.value)}
                  className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                  placeholder="Unlimited"
                />
                <div className="text-xs text-terminal-dim mt-1">
                  Time per question (disables going back to previous questions)
                </div>
              </div>
            </div>

            {/* Question Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-terminal-bright font-medium">
                <Target className="w-5 h-5" />
                <span>Question Configuration</span>
              </div>

              <div>
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={randomize}
                    onChange={(e) => setRandomize(e.target.checked)}
                    className="accent-terminal-accent scale-125"
                  />
                  <div>
                    <div className="font-medium text-terminal-bright">Randomize Questions</div>
                    <div className="text-xs text-terminal-dim">Shuffle question order for each attempt</div>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-terminal-bright mb-2">
                  Question Limit
                </label>
                <input
                  type="number"
                  value={questionLimit || ""}
                  onChange={(e) => setQuestionLimit(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                  placeholder="Use all questions"
                  min="1"
                />
                <div className="text-xs text-terminal-dim mt-1">
                  Maximum questions to include (requires randomization)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Quiz Merging */}
        <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Link className="w-6 h-6 text-terminal-accent" />
            <div>
              <div className="font-bold text-terminal-bright text-lg">Multi-Quiz Merging</div>
              <div className="text-sm text-terminal-dim">Combine questions from multiple quizzes</div>
            </div>
          </div>

          <label className="flex items-center gap-3 mb-6">
            <input
              type="checkbox"
              checked={multiQuizMode}
              onChange={(e) => setMultiQuizMode(e.target.checked)}
              className="accent-terminal-accent scale-125"
            />
            <div>
              <div className="font-medium text-terminal-bright">Enable Multi-Quiz Mode</div>
              <div className="text-xs text-terminal-dim">Create custom quizzes by combining questions from multiple sources</div>
            </div>
          </label>

          {multiQuizMode && (
            <div className="space-y-4 border-l-4 border-terminal-accent/50 pl-4">
              {/* Quiz Sources */}
              <div>
                <div className="font-medium text-terminal-bright mb-3">Quiz Sources Configuration</div>
                
                {quizSources.length === 0 ? (
                  <div className="text-center py-8 text-terminal-dim bg-terminal-accent/5 rounded border border-terminal-accent/20">
                    <div className="text-3xl mb-2">📚</div>
                    <div>No quiz sources added yet</div>
                    <div className="text-xs mt-1">Add sources to start merging quizzes</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quizSources.map((source, idx) => (
                      <div key={idx} className="bg-terminal-accent/10 border border-terminal-accent/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="bg-terminal-accent/30 text-terminal-bright px-3 py-1 rounded font-bold text-sm">
                            SOURCE #{idx + 1}
                          </span>
                          <button
                            onClick={() => {
                              const newSources = quizSources.filter((_, i) => i !== idx);
                              setQuizSources(newSources);
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20 px-2 py-1 rounded text-sm"
                          >
                            🗑️ Remove
                          </button>
                        </div>

                        <div className="grid gap-4">
                          <div>
                            <label className="block text-sm font-medium text-terminal-bright mb-2">
                              Select Quiz:
                            </label>
                            <select
                              value={source.quizId}
                              onChange={(e) => {
                                const newSources = [...quizSources];
                                newSources[idx].quizId = e.target.value;
                                setQuizSources(newSources);
                              }}
                              className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                            >
                              <option value="">🔍 Choose a quiz...</option>
                              {availableQuizzes.map(quiz => (
                                <option key={quiz.id} value={quiz.id}>
                                  📚 {quiz.title} ({quiz.questions?.length || 0} questions)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-terminal-bright mb-2">
                                {source.fixedCount ? 'Exact Questions:' : 'Minimum Questions:'}
                              </label>
                              <input
                                type="number"
                                value={source.minQuestions}
                                onChange={(e) => {
                                  const newSources = [...quizSources];
                                  const val = parseInt(e.target.value) || 1;
                                  newSources[idx].minQuestions = val;
                                  if (newSources[idx].fixedCount) {
                                    newSources[idx].maxQuestions = val;
                                  }
                                  setQuizSources(newSources);
                                }}
                                className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                                min="1"
                                placeholder="1"
                              />
                            </div>

                            {!source.fixedCount && (
                              <div>
                                <label className="block text-sm font-medium text-terminal-bright mb-2">
                                  Maximum Questions:
                                </label>
                                <input
                                  type="number"
                                  value={source.maxQuestions}
                                  onChange={(e) => {
                                    const newSources = [...quizSources];
                                    newSources[idx].maxQuestions = Math.max(parseInt(e.target.value) || 1, source.minQuestions);
                                    setQuizSources(newSources);
                                  }}
                                  className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                                  min={source.minQuestions}
                                  placeholder="5"
                                />
                              </div>
                            )}

                            <div className="flex items-end">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={source.fixedCount}
                                  onChange={(e) => {
                                    const newSources = [...quizSources];
                                    newSources[idx].fixedCount = e.target.checked;
                                    if (e.target.checked) {
                                      newSources[idx].maxQuestions = newSources[idx].minQuestions;
                                    }
                                    setQuizSources(newSources);
                                  }}
                                  className="accent-terminal-accent scale-125"
                                />
                                <div>
                                  <div className="text-sm font-medium text-terminal-bright">Fixed Count</div>
                                  <div className="text-xs text-terminal-dim">
                                    {source.fixedCount ? '📌 Exact number' : '🎲 Random range'}
                                  </div>
                                </div>
                              </label>
                            </div>
                          </div>

                          {source.quizId && (
                            <div className="text-xs text-blue-300 bg-blue-500/10 p-2 rounded border border-blue-500/30">
                              💡 Will include {source.fixedCount ? 
                                `exactly ${source.minQuestions}` : 
                                `${source.minQuestions}-${source.maxQuestions}`} 
                              questions from this quiz
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setQuizSources([...quizSources, {
                      quizId: "",
                      minQuestions: 1,
                      maxQuestions: 5,
                      fixedCount: false
                    }]);
                  }}
                  className="w-full bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 py-3 px-4 rounded font-medium transition-colors"
                >
                  ➕ {quizSources.length === 0 ? 'Add First Quiz Source' : 'Add Another Quiz Source'}
                </button>
              </div>

              {/* Validation Results */}
              {validation && (
                <div className="space-y-3">
                  {validation.errors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 p-3 rounded">
                      <div className="font-medium text-red-300 mb-2">❌ Configuration Errors:</div>
                      <ul className="text-sm text-red-300 space-y-1">
                        {validation.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validation.warnings.length > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded">
                      <div className="font-medium text-orange-300 mb-2">⚠️ Warnings:</div>
                      <ul className="text-sm text-orange-300 space-y-1">
                        {validation.warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validation.isValid && validation.totalMin !== undefined && (
                    <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded">
                      <div className="font-medium text-blue-300 mb-2">📊 Quiz Summary:</div>
                      <div className="text-sm text-blue-300 space-y-1">
                        <div>Questions from sources: <span className="font-bold text-green-400">{validation.totalMin}</span>
                          {validation.totalMax !== validation.totalMin && <span> - <span className="font-bold text-blue-400">{validation.totalMax}</span></span>}</div>
                        {questionLimit && <div>Final quiz limit: <span className="font-bold text-purple-400">{questionLimit}</span></div>}
                        <div>Expected final count: <span className="font-bold text-yellow-400">
                          {questionLimit && validation.totalMin > questionLimit ? questionLimit : validation.totalMin}
                          {questionLimit && validation.totalMax && validation.totalMax !== validation.totalMin ? 
                            ` - ${Math.min(questionLimit, validation.totalMax)}` : ''}
                        </span></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generate Custom Quiz */}
              <div className="flex gap-3">
                <button
                  onClick={generateCustomQuiz}
                  disabled={!validation.isValid || isGenerating}
                  className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 py-3 px-4 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? '⏳ Generating...' : '🎲 Generate Custom Quiz'}
                </button>
                
                {customQuestions.length > 0 && (
                  <button
                    onClick={startCustomQuiz}
                    className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 py-3 px-4 rounded font-medium transition-colors"
                  >
                    ▶️ Start Quiz ({customQuestions.length} questions)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-terminal-accent/30">
          {mode !== "create" && quiz && (
            <TerminalButton onClick={saveSettings} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Settings
            </TerminalButton>
          )}
          
          <TerminalButton onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};

export default UnifiedQuizAdvanced;
