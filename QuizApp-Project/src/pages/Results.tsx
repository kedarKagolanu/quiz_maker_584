import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { LatexRenderer } from "@/components/LatexRenderer";
import { storage } from "@/lib/storage";
import { QuizAttempt, Quiz } from "@/types/quiz";

export const Results: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    const attempts = storage.getAttempts();
    const foundAttempt = attempts.find((a) => a.id === id);
    if (foundAttempt) {
      setAttempt(foundAttempt);
      setQuiz(storage.getQuizById(foundAttempt.quizId));
    }
  }, [id]);

  if (!attempt || !quiz) {
    return (
      <Terminal title="results">
        <TerminalLine>Loading results...</TerminalLine>
      </Terminal>
    );
  }

  // Map answers back to original question order if quiz was randomized
  const correctAnswers = attempt.answers.reduce((acc, ans, idx) => {
    return acc + (ans === quiz.questions[idx]?.a ? 1 : 0);
  }, 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Terminal title="quiz-results">
      <div className="space-y-6">
        <div>
          <TerminalLine prefix="#">{quiz.title}</TerminalLine>
          <div className="ml-6 mt-2 space-y-1">
            <TerminalLine prefix="•">Score: {attempt.score.toFixed(1)}%</TerminalLine>
            <TerminalLine prefix="•">
              Correct: {correctAnswers}/{quiz.questions.length}
            </TerminalLine>
            <TerminalLine prefix="•">Total Time: {formatTime(attempt.totalTime)}</TerminalLine>
          </div>
        </div>

        <div>
          <TerminalLine prefix="#">Question Breakdown</TerminalLine>
          <div className="ml-6 mt-2 space-y-3">
            {quiz.questions.map((q, idx) => {
              const userAnswer = attempt.answers[idx];
              const isCorrect = userAnswer === q.a;
              const timeTaken = attempt.timeTaken[idx];

              return (
                <div key={idx} className="border border-terminal-accent/30 p-3 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-terminal-bright">
                      Q{idx + 1}: {q.l ? <LatexRenderer text={q.q} /> : q.q}
                    </span>
                    <span className={isCorrect ? "text-terminal-accent" : "text-destructive"}>
                      {isCorrect ? "✓" : "✗"}
                    </span>
                  </div>
                  <div className="text-sm space-y-1 text-terminal-dim">
                    <div>Your answer: {userAnswer >= 0 ? q.o[userAnswer] : "No answer"}</div>
                    {!isCorrect && <div>Correct answer: {q.o[q.a]}</div>}
                    <div>Time taken: {timeTaken}s</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <TerminalButton onClick={() => navigate("/dashboard")}>dashboard</TerminalButton>
          <TerminalButton onClick={() => navigate(`/leaderboard/${quiz.id}`)}>leaderboard</TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};
