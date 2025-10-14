import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz } from "@/types/quiz";

export const MyQuizzes: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    const allQuizzes = storage.getQuizzes();
    setQuizzes(allQuizzes.filter((q) => q.creator === user.id));
  }, [user, navigate]);

  if (!user) return null;

  return (
    <Terminal title="my-quizzes">
      <TerminalLine>Quizzes you have created</TerminalLine>

      <div className="mt-6 space-y-4">
        {quizzes.length === 0 ? (
          <TerminalLine prefix="-" className="text-terminal-dim">
            You haven't created any quizzes yet
          </TerminalLine>
        ) : (
          quizzes.map((quiz) => (
            <div key={quiz.id} className="border border-terminal-accent/30 p-4 rounded space-y-2">
              <div className="text-terminal-bright text-lg">{quiz.title}</div>
              <div className="text-sm text-terminal-dim space-y-1">
                <div>Questions: {quiz.questions.length}</div>
                <div>Visibility: {quiz.isPublic ? "Public" : "Private"}</div>
                {quiz.timeLimit && <div>Time Limit: {quiz.timeLimit}s</div>}
                <div>Randomize: {quiz.randomize ? "Yes" : "No"}</div>
                <div>Created: {new Date(quiz.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2 mt-3">
                <TerminalButton onClick={() => navigate(`/quiz/${quiz.id}`)}>preview</TerminalButton>
                <TerminalButton onClick={() => navigate(`/leaderboard/${quiz.id}`)}>leaderboard</TerminalButton>
              </div>
            </div>
          ))
        )}

        <div className="flex gap-3 pt-4">
          <TerminalButton onClick={() => navigate("/create-quiz")}>create new quiz</TerminalButton>
          <TerminalButton onClick={() => navigate("/dashboard")}>back to dashboard</TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};
