import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { LatexRenderer } from "@/components/LatexRenderer";
import { storage } from "@/lib/storage";
import { QuizQuestion, QuizAttempt } from "@/types/quiz";
import { toast } from "sonner";

export const QuizTaker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState(storage.getQuizById(id!));
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

  useEffect(() => {
    if (!quiz || !user) {
      navigate("/dashboard");
      return;
    }

    const qs = quiz.randomize ? [...quiz.questions].sort(() => Math.random() - 0.5) : quiz.questions;
    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(-1));
    setTimeTaken(new Array(qs.length).fill(0));

    // Determine quiz mode:
    // Mode 1: Quiz-wide timer (quiz.timeLimit set) - revisits allowed
    // Mode 2: No time limit (no quiz.timeLimit and no perQuestionTimeLimit) - revisits allowed
    // Mode 3: Per-question timer (quiz.perQuestionTimeLimit set) - no revisits, one attempt per question
    const hasPerQuestionTimer = !!quiz.perQuestionTimeLimit;
    setHasPerQuestionTimer(hasPerQuestionTimer);

    // Set quiz-wide timer only for Mode 1 (not Mode 3)
    if (quiz.timeLimit && !hasPerQuestionTimer) {
      setTimeLeft(quiz.timeLimit);
    }
  }, [quiz, user, navigate]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => (t! > 0 ? t! - 1 : 0)), 1000);
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
    if (questionTimeLeft !== null && questionTimeLeft > 0) {
      const timer = setInterval(() => {
        setQuestionTimeLeft((t) => (t! > 0 ? t! - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    } else if (questionTimeLeft === 0) {
      handleNext();
    }
  }, [questionTimeLeft]);

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const newTimeTaken = [...timeTaken];
    newTimeTaken[currentIndex] += timeSpent; // Accumulate time across revisits
    setTimeTaken(newTimeTaken);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Show review screen if no per-question timer, otherwise submit directly
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
    newTimeTaken[currentIndex] += timeSpent; // Accumulate time
    setTimeTaken(newTimeTaken);
    setCurrentIndex(currentIndex - 1);
  };

  const handleJumpToQuestion = (index: number) => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const newTimeTaken = [...timeTaken];
    newTimeTaken[currentIndex] += timeSpent; // Accumulate time
    setTimeTaken(newTimeTaken);
    setCurrentIndex(index);
    setShowReview(false);
  };

  const handleSubmit = () => {
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

    storage.saveAttempt(attempt);
    toast.success(`Quiz completed! Score: ${scorePercentage.toFixed(1)}%`);
    navigate(`/results/${attempt.id}`);
  };

  if (!quiz || questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];

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
                      Q{idx + 1}: {q.l ? <LatexRenderer text={q.q} /> : q.q}
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

  return (
    <Terminal title={`quiz: ${quiz.title}`}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <TerminalLine prefix="#">
            Question {currentIndex + 1} of {questions.length}
          </TerminalLine>
          <div className="flex gap-4 text-sm">
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

        <div className="border border-terminal-accent/30 p-4 rounded">
          <TerminalLine prefix="Q:">
            {currentQuestion.l ? (
              <LatexRenderer text={currentQuestion.q} />
            ) : (
              currentQuestion.q
            )}
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
                  {String.fromCharCode(65 + idx)}. {currentQuestion.l ? <LatexRenderer text={option} /> : option}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <TerminalButton 
            onClick={handlePrevious} 
            disabled={currentIndex === 0 || hasPerQuestionTimer}
          >
            previous
          </TerminalButton>
          <TerminalButton onClick={handleNext} disabled={answers[currentIndex] === -1}>
            {currentIndex === questions.length - 1 ? (hasPerQuestionTimer ? "submit" : "review") : "next"}
          </TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};
