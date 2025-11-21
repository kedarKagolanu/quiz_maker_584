import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { LatexRenderer } from "@/components/LatexRenderer";
import { storage } from "@/lib/storage";
import { Quiz, QuizQuestion, QuizAttempt } from "@/types/quiz";
import { toast } from "sonner";
import { soundEffects } from "@/lib/soundEffects";

export const QuizTaker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeTaken, setTimeTaken] = useState<number[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [quizStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [hasPerQuestionTimer, setHasPerQuestionTimer] = useState(false);
  const [questionStatus, setQuestionStatus] = useState<('unattempted' | 'seen' | 'attempted' | 'review')[]>([]);
  const [markedForReview, setMarkedForReview] = useState<boolean[]>([]);
  const [userLayout, setUserLayout] = useState<'default' | 'split' | null>(null);
  const [navPosition, setNavPosition] = useState<'left' | 'right' | 'bottom'>('left');

  useEffect(() => {
    if (!id) return;
    
    const loadQuiz = async () => {
      const fetchedQuiz = await storage.getQuizById(id);
      if (!fetchedQuiz || !user) {
        navigate("/dashboard");
        return;
      }

      // Check for custom settings in URL params
      const urlParams = new URLSearchParams(location.search);
      const customTimeLimit = urlParams.get('timeLimit');
      const customPerQuestionTimeLimit = urlParams.get('perQuestionTimeLimit');
      const customRandomize = urlParams.get('randomize');
      
      // Apply custom settings temporarily
      let quizWithCustomSettings = { ...fetchedQuiz };
      if (customTimeLimit) {
        quizWithCustomSettings.timeLimit = parseInt(customTimeLimit);
        console.log('🎯 Applied custom time limit:', customTimeLimit);
      }
      if (customPerQuestionTimeLimit) {
        quizWithCustomSettings.perQuestionTimeLimit = parseInt(customPerQuestionTimeLimit);
        console.log('🎯 Applied custom per-question time limit:', customPerQuestionTimeLimit);
      }
      if (customRandomize) {
        quizWithCustomSettings.randomize = customRandomize === 'true';
        console.log('🎯 Applied custom randomization:', customRandomize);
      }

      const qs = quizWithCustomSettings.randomize ? [...quizWithCustomSettings.questions].sort(() => Math.random() - 0.5) : quizWithCustomSettings.questions;
      setQuiz(quizWithCustomSettings);
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(-1));
      setTimeTaken(new Array(qs.length).fill(0));
      setQuestionStatus(new Array(qs.length).fill('unattempted'));
      setMarkedForReview(new Array(qs.length).fill(false));
      setUserLayout(fetchedQuiz.layout || 'default');
      soundEffects.quizStart();

      // Determine quiz mode:
      // Mode 1: Quiz-wide timer (quiz.timeLimit set) - revisits allowed
      // Mode 2: No time limit (no quiz.timeLimit and no perQuestionTimeLimit) - revisits allowed
      // Mode 3: Per-question timer (quiz.perQuestionTimeLimit set) - no revisits, one attempt per question
      const hasPerQuestionTimer = !!fetchedQuiz.perQuestionTimeLimit;
      setHasPerQuestionTimer(hasPerQuestionTimer);

      // Set quiz-wide timer only for Mode 1 (not Mode 3)
      if (fetchedQuiz.timeLimit && !hasPerQuestionTimer) {
        setTimeLeft(fetchedQuiz.timeLimit);
      }
      
      // Set per-question timer for Mode 3
      if (fetchedQuiz.perQuestionTimeLimit) {
        setQuestionTimeLeft(fetchedQuiz.perQuestionTimeLimit);
      }
    };
    
    loadQuiz();

    // Warn user before navigating away
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [id, user, navigate]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((t) => {
          if (t === 30 || t === 10) {
            soundEffects.timerWarning();
          }
          return t! > 0 ? t! - 1 : 0;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft]);

  useEffect(() => {
    if (quiz?.perQuestionTimeLimit) {
      setQuestionTimeLeft(quiz.perQuestionTimeLimit);
    } else {
      setQuestionTimeLeft(null);
    }
    setQuestionStartTime(Date.now());
  }, [currentIndex, quiz]);

  useEffect(() => {
    if (questionTimeLeft !== null && questionTimeLeft > 0 && quiz) {
      const timer = setInterval(() => {
        setQuestionTimeLeft((t) => {
          if (t === 5) {
            soundEffects.timerWarning();
          }
          return t! > 0 ? t! - 1 : 0;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else if (questionTimeLeft === 0) {
      handleNext();
    }
  }, [questionTimeLeft, quiz]);

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
    
    const newStatus = [...questionStatus];
    newStatus[currentIndex] = 'attempted';
    setQuestionStatus(newStatus);
    soundEffects.buttonClick();
  };

  const toggleMarkForReview = () => {
    const newMarked = [...markedForReview];
    newMarked[currentIndex] = !newMarked[currentIndex];
    setMarkedForReview(newMarked);
  };

  const jumpToQuestion = (index: number) => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const newTimeTaken = [...timeTaken];
    newTimeTaken[currentIndex] += timeSpent;
    setTimeTaken(newTimeTaken);
    
    const newStatus = [...questionStatus];
    if (newStatus[index] === 'unattempted') {
      newStatus[index] = 'seen';
    }
    setQuestionStatus(newStatus);
    
    setCurrentIndex(index);
    soundEffects.navigate();
  };

  const handleNext = () => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const newTimeTaken = [...timeTaken];
    newTimeTaken[currentIndex] += timeSpent;
    setTimeTaken(newTimeTaken);

    if (currentIndex < questions.length - 1) {
      const newStatus = [...questionStatus];
      const nextIndex = currentIndex + 1;
      if (newStatus[nextIndex] === 'unattempted') {
        newStatus[nextIndex] = 'seen';
      }
      setQuestionStatus(newStatus);
      setCurrentIndex(nextIndex);
      soundEffects.navigate();
    } else {
      if (hasPerQuestionTimer) {
        handleSubmit();
      } else {
        setShowReview(true);
      }
    }
  };

  const handlePrevious = () => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const newTimeTaken = [...timeTaken];
    newTimeTaken[currentIndex] += timeSpent;
    setTimeTaken(newTimeTaken);
    setCurrentIndex(currentIndex - 1);
    soundEffects.navigate();
  };

  const handleJumpToQuestion = (index: number) => {
    jumpToQuestion(index);
    setShowReview(false);
  };

  const getQuestionStatusColor = (index: number) => {
    if (markedForReview[index]) return 'bg-yellow-500 hover:bg-yellow-600';
    if (answers[index] !== -1) return 'bg-green-600 hover:bg-green-700';
    if (questionStatus[index] === 'seen') return 'bg-red-600 hover:bg-red-700';
    return 'bg-white/20 hover:bg-white/30';
  };

  const handleSubmit = async () => {
    if (!user || !quiz) return;

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const finalTimeTaken = [...timeTaken];
    finalTimeTaken[currentIndex] = timeSpent;

    const score = answers.reduce((acc, ans, idx) => {
      return acc + (ans === questions[idx].a ? 1 : 0);
    }, 0);
    const scorePercentage = (score / questions.length) * 100;

    const attempt: QuizAttempt = {
      id: Date.now().toString(),
      quizId: quiz.id,
      userId: user.id,
      answers,
      timeTaken: finalTimeTaken,
      totalTime: Math.floor((Date.now() - quizStartTime) / 1000),
      score: scorePercentage,
      completedAt: Date.now(),
    };

    await storage.saveAttempt(attempt);
    soundEffects.quizComplete();
    toast.success(`Quiz completed! Score: ${scorePercentage.toFixed(1)}%`);
    navigate(`/results/${attempt.id}`);
  };

  if (!quiz || questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  const activeLayout = userLayout || quiz.layout || 'default';

  if (showReview) {
    return (
      <Terminal title={`quiz: ${quiz.title} - Review`}>
        <div className="space-y-4">
          <TerminalLine prefix="#">Review Your Answers</TerminalLine>
          
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="border border-terminal-accent/30 p-3 rounded cursor-pointer hover:border-terminal-accent transition-colors"
                onClick={() => handleJumpToQuestion(idx)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="text-terminal-bright">
                      Q{idx + 1}: <LatexRenderer text={q.q} media={quiz.media} />
                    </span>
                    <div className="text-sm text-terminal-dim mt-1">
                      Your answer: {answers[idx] >= 0 ? `${String.fromCharCode(65 + answers[idx])}. ${q.o[answers[idx]]}` : "Not answered"}
                    </div>
                    <div className="text-sm text-terminal-dim">
                      Time spent: {timeTaken[idx]}s
                    </div>
                  </div>
                  <span className={answers[idx] >= 0 ? "text-terminal-accent" : "text-destructive"}>
                    {answers[idx] >= 0 ? "✓" : "!"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <TerminalButton onClick={() => setShowReview(false)}>back to quiz</TerminalButton>
            <TerminalButton onClick={handleSubmit}>final submit</TerminalButton>
          </div>
        </div>
      </Terminal>
    );
  }

  const renderQuestionNav = () => (
    <div className={`border border-terminal-accent/30 rounded p-3 space-y-2 shrink-0 ${navPosition === 'bottom' ? 'w-full' : 'w-48'}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-bold text-terminal-bright">Questions</div>
        <select
          value={navPosition}
          onChange={(e) => setNavPosition(e.target.value as 'left' | 'right' | 'bottom')}
          className="text-xs bg-terminal-accent/20 px-2 py-1 rounded border border-terminal-accent/30"
        >
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="bottom">Bottom</option>
        </select>
      </div>
      <div className={`grid gap-2 ${navPosition === 'bottom' ? 'grid-cols-12' : 'grid-cols-4'}`}>
        {questions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => jumpToQuestion(idx)}
            className={`w-10 h-10 rounded text-sm font-medium transition-colors ${getQuestionStatusColor(idx)} ${currentIndex === idx ? 'ring-2 ring-terminal-accent' : ''}`}
            title={`Question ${idx + 1}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
      <div className={`text-xs space-y-1 mt-4 pt-3 border-t border-terminal-accent/30 ${navPosition === 'bottom' ? 'flex gap-4' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white/20 rounded"></div>
          <span>Unattempted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-600 rounded"></div>
          <span>Seen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-600 rounded"></div>
          <span>Attempted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>Review</span>
        </div>
      </div>
    </div>
  );

  return (
      <Terminal title={`quiz: ${quiz.title}`}>
        {/* Warning Banner */}
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/50 rounded">
          <div className="flex items-center gap-2 text-yellow-300">
            <span className="text-lg">⚠️</span>
            <span className="text-sm">
              <strong>Warning:</strong> Navigating away or refreshing will restart the quiz from the beginning.
            </span>
          </div>
        </div>

        <div className={`flex gap-4 ${navPosition === 'bottom' ? 'flex-col' : navPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Question Navigation */}
        {renderQuestionNav()}

        {/* Main Quiz Area */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <TerminalLine prefix="#">
              Question {currentIndex + 1} of {questions.length}
            </TerminalLine>
            <div className="flex gap-4 text-sm items-center">
              <button
                onClick={() => setUserLayout(activeLayout === 'split' ? 'default' : 'split')}
                className="text-xs bg-terminal-accent/20 hover:bg-terminal-accent/30 px-2 py-1 rounded"
              >
                Layout: {activeLayout === 'split' ? 'Split' : 'Default'}
              </button>
              {timeLeft !== null && (
                <span className={timeLeft < 30 ? "text-destructive" : "text-terminal-accent"}>
                  Quiz Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              )}
              {questionTimeLeft !== null && (
                <span className={questionTimeLeft < 10 ? "text-destructive" : "text-terminal-bright"}>
                  Question Time: {questionTimeLeft}s
                </span>
              )}
            </div>
          </div>

          {activeLayout === 'split' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-terminal-accent/30 p-4 rounded">
                <TerminalLine prefix="Q:">
                  <LatexRenderer text={currentQuestion.q} media={quiz.media} />
                </TerminalLine>
              </div>
              <div className="space-y-2">
                {currentQuestion.o.map((option, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-2 border border-terminal-accent/30 rounded cursor-pointer hover:border-terminal-accent transition-colors"
                  >
                    <input
                      type="radio"
                      name="answer"
                      checked={answers[currentIndex] === idx}
                      onChange={() => handleAnswer(idx)}
                      className="accent-terminal-accent"
                    />
                    <span>
                      {String.fromCharCode(65 + idx)}. <LatexRenderer text={option} media={quiz.media} />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-terminal-accent/30 p-4 rounded">
              <TerminalLine prefix="Q:">
                <LatexRenderer text={currentQuestion.q} media={quiz.media} />
              </TerminalLine>

              <div className="mt-4 space-y-2">
                {currentQuestion.o.map((option, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-2 border border-terminal-accent/30 rounded cursor-pointer hover:border-terminal-accent transition-colors"
                  >
                    <input
                      type="radio"
                      name="answer"
                      checked={answers[currentIndex] === idx}
                      onChange={() => handleAnswer(idx)}
                      className="accent-terminal-accent"
                    />
                    <span>
                      {String.fromCharCode(65 + idx)}. <LatexRenderer text={option} media={quiz.media} />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <TerminalButton 
                onClick={handlePrevious} 
                disabled={currentIndex === 0 || hasPerQuestionTimer}
              >
                previous
              </TerminalButton>
              <TerminalButton onClick={toggleMarkForReview}>
                {markedForReview[currentIndex] ? 'unmark review' : 'mark for review'}
              </TerminalButton>
              <TerminalButton 
                onClick={() => {
                  if (confirm('Are you sure you want to end the test? Only attempted questions will be graded.')) {
                    handleSubmit();
                  }
                }}
                className="bg-destructive/20 hover:bg-destructive/30"
              >
                end test
              </TerminalButton>
            </div>
            <TerminalButton onClick={handleNext} disabled={answers[currentIndex] === -1}>
              {currentIndex === questions.length - 1 ? (hasPerQuestionTimer ? "submit" : "review") : "next"}
            </TerminalButton>
          </div>
        </div>
      </div>
      </Terminal>
  );
};
