import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz } from "@/types/quiz";
import { Clock, Shuffle, Settings, Play } from "lucide-react";
import { toast } from "sonner";

export const QuizCustomizer: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [customSettings, setCustomSettings] = useState({
    timeLimit: null as number | null,
    perQuestionTimeLimit: null as number | null,
    randomize: false,
    useDefault: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) {
      navigate("/");
      return;
    }
    loadQuiz();
  }, [user, id, navigate]);

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
        useDefault: true
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to load quiz:", error);
      toast.error("Failed to load quiz");
      navigate("/dashboard");
    }
  };

  const handleStartQuiz = () => {
    if (!quiz) return;
    
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
            {quiz.questions.length} questions
          </TerminalLine>
        </div>

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
                        timeLimit: e.target.value ? parseInt(e.target.value) : null 
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
                        perQuestionTimeLimit: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      placeholder="No limit"
                      className="w-20 bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
                    />
                    <span className="text-terminal-dim">seconds</span>
                    <span className="text-terminal-accent">
                      ({formatTime(customSettings.perQuestionTimeLimit)})
                    </span>
                  </div>
                  <div className="text-xs text-terminal-dim mt-1">
                    Default: {formatTime(quiz.perQuestionTimeLimit)}
                  </div>
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
                  <div className="text-xs text-terminal-dim mt-1 ml-7">
                    Default: {quiz.randomize ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Default Settings Display */}
        {customSettings.useDefault && (
          <div className="p-4 border border-terminal-accent/30 rounded">
            <TerminalLine prefix=">" className="text-terminal-accent mb-3">
              Default Quiz Settings
            </TerminalLine>
            <div className="ml-6 space-y-2 text-sm">
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
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <TerminalButton onClick={handleStartQuiz} className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Start Quiz
            {!customSettings.useDefault && (
              <span className="text-xs">(custom)</span>
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