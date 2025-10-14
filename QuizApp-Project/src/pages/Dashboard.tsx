import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizAttempt } from "@/types/quiz";

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const allQuizzes = storage.getQuizzes();
    setMyQuizzes(allQuizzes.filter((q) => q.creator === user.id));
    setAvailableQuizzes(allQuizzes.filter((q) => q.isPublic || q.creator === user.id));
    setAttempts(storage.getUserAttempts(user.id));
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) return null;

  return (
    <Terminal title={`dashboard - ${user.username}`}>
      <TerminalLine prefix="~">Welcome back, {user.username}!</TerminalLine>

      <div className="mt-6 space-y-6">
        <div>
          <TerminalLine prefix="#">Actions</TerminalLine>
          <div className="flex flex-wrap gap-3 mt-2 ml-6">
            <TerminalButton onClick={() => navigate("/create-quiz")}>create quiz</TerminalButton>
            <TerminalButton onClick={() => navigate("/my-quizzes")}>my quizzes ({myQuizzes.length})</TerminalButton>
            <TerminalButton onClick={handleLogout}>logout</TerminalButton>
          </div>
        </div>

        <div>
          <TerminalLine prefix="#">Statistics</TerminalLine>
          <div className="ml-6 space-y-1">
            <TerminalLine prefix="-">Quizzes Created: {myQuizzes.length}</TerminalLine>
            <TerminalLine prefix="-">Quizzes Attempted: {attempts.length}</TerminalLine>
            <TerminalLine prefix="-">
              Average Score: {attempts.length > 0 ? (attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length).toFixed(1) : "N/A"}%
            </TerminalLine>
          </div>
        </div>

        <div>
          <TerminalLine prefix="#">Available Quizzes</TerminalLine>
          {availableQuizzes.length === 0 ? (
            <TerminalLine prefix="-" className="ml-6 text-terminal-dim">
              No quizzes available
            </TerminalLine>
          ) : (
            <div className="ml-6 space-y-2 mt-2">
              {availableQuizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between border border-terminal-accent/30 p-3 rounded">
                  <div>
                    <div className="text-terminal-bright">{quiz.title}</div>
                    <div className="text-sm text-terminal-dim">
                      {quiz.questions.length} questions • {quiz.isPublic ? "Public" : "Private"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <TerminalButton onClick={() => navigate(`/quiz/${quiz.id}`)}>start</TerminalButton>
                    <TerminalButton onClick={() => navigate(`/leaderboard/${quiz.id}`)}>leaderboard</TerminalButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Terminal>
  );
};
