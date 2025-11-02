import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, LeaderboardEntry } from "@/types/quiz";

export const Leaderboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const foundQuiz = await storage.getQuizById(id!);
      if (!foundQuiz) {
        navigate("/dashboard");
        return;
      }

      setQuiz(foundQuiz);

      const attempts = await storage.getQuizAttempts(id!);
      const users = await storage.getUsers();

      const leaderboard: (LeaderboardEntry & { username?: string })[] = attempts.map((attempt) => {
        const user = users.find((u) => u.id === attempt.userId);
        return {
          username: user?.username || "Unknown",
          score: attempt.score,
          totalTime: attempt.totalTime,
          completedAt: attempt.completedAt,
        };
      });

      leaderboard.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.totalTime - b.totalTime;
      });

      setEntries(leaderboard);
    };
    loadData();
  }, [id, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!quiz) return null;

  return (
    <Terminal title={`leaderboard: ${quiz.title}`}>
      <div className="space-y-4">
        <TerminalLine prefix="#">Top Performers</TerminalLine>

        {entries.length === 0 ? (
          <TerminalLine prefix="-" className="ml-6 text-terminal-dim">
            No attempts yet
          </TerminalLine>
        ) : (
          <div className="ml-6 space-y-2">
            <div className="grid grid-cols-4 gap-4 text-terminal-accent border-b border-terminal-accent/30 pb-2">
              <span>Rank</span>
              <span>Username</span>
              <span>Score</span>
              <span>Time</span>
            </div>
            {entries.map((entry, idx) => (
              <div
                key={idx}
                className="grid grid-cols-4 gap-4 py-2 border-b border-terminal-accent/10"
              >
                <span className="text-terminal-bright">#{idx + 1}</span>
                <span className="flex items-center gap-2">
                  {entry.username}
                  {entry.username && entry.username !== "Unknown" && (
                    <button
                      onClick={() => navigate(`/profile/${entry.username}`)}
                      className="text-terminal-accent hover:text-terminal-bright text-xs underline"
                    >
                      view profile
                    </button>
                  )}
                </span>
                <span>{entry.score.toFixed(1)}%</span>
                <span>{formatTime(entry.totalTime)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <TerminalButton onClick={() => navigate(`/quiz/${quiz.id}`)}>take quiz</TerminalButton>
          <TerminalButton onClick={() => navigate("/dashboard")}>dashboard</TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};
