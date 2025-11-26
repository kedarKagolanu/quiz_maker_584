import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { LatexRenderer } from "@/components/LatexRenderer";
import { storage } from "@/lib/storage";
import { QuizAttempt, Quiz } from "@/types/quiz";
import { soundEffects } from "@/lib/soundEffects";

export const Results: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      const attempts = await storage.getAttempts();
      const foundAttempt = attempts.find((a) => a.id === id);
      if (foundAttempt) {
        setAttempt(foundAttempt);
        let quizData = await storage.getQuizById(foundAttempt.quizId);
        
        // For multi-quiz, we need to regenerate the questions to match the attempt
        if (quizData && quizData.multiQuizSources && foundAttempt.answers.length !== quizData.questions.length) {


          
          // Try to get the questions from localStorage if available (recent attempt)
          const attemptKey = `quiz_attempt_${foundAttempt.id}_questions`;
          const storedQuestions = localStorage.getItem(attemptKey);
          
          if (storedQuestions) {
            try {
              const parsedQuestions = JSON.parse(storedQuestions);

              quizData = {
                ...quizData,
                questions: parsedQuestions.questions || parsedQuestions,
                media: parsedQuestions.media || quizData.media
              };
            } catch (error) {

            }
          } else {

          }
        }
        
        setQuiz(quizData);
        
        // Play sound based on score
        if (foundAttempt.score >= 70) {
          soundEffects.correctAnswer();
        } else if (foundAttempt.score >= 40) {
          soundEffects.buttonClick();
        } else {
          soundEffects.wrongAnswer();
        }
      }
    };
    loadResults();
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
    const question = quiz.questions[idx];
    return acc + (question && ans === question.a ? 1 : 0);
  }, 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Terminal title="quiz-results">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <TerminalLine prefix="#">Quiz Results</TerminalLine>
          <TerminalButton onClick={() => navigate("/dashboard")}>
            back to dashboard
          </TerminalButton>
        </div>
        
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
            {attempt.answers.map((userAnswer, idx) => {
              // Get the question from the quiz, handling potential index mismatches
              const question = quiz.questions[idx];
              
              // Skip if no question exists at this index
              if (!question) {

                return null;
              }

              // Skip invalid questions (like multi-quiz config placeholders)
              if (!question.q || !question.o || typeof question.a === 'undefined') {

                return null;
              }

              const isCorrect = userAnswer === question.a;
              const timeTaken = attempt.timeTaken[idx] || 0;

              return (
                <div key={idx} className="border border-terminal-accent/30 p-3 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-terminal-bright">
                      Q{idx + 1}: <LatexRenderer text={question.q || ''} media={quiz.media || []} />
                    </span>
                    <span className={isCorrect ? "text-terminal-accent" : "text-destructive"}>
                      {isCorrect ? "✓" : "✗"}
                    </span>
                  </div>
                  <div className="text-sm space-y-1 text-terminal-dim">
                    <div>
                      Your answer: {userAnswer >= 0 && userAnswer < question.o.length && question.o[userAnswer] ? 
                        <span>
                          {String.fromCharCode(65 + userAnswer)}. <LatexRenderer text={question.o[userAnswer]} media={quiz.media || []} />
                        </span> : 
                        "No answer"
                      }
                    </div>
                    {!isCorrect && question.a >= 0 && question.a < question.o.length && question.o[question.a] && (
                      <div>
                        Correct answer: <span>
                          {String.fromCharCode(65 + question.a)}. <LatexRenderer text={question.o[question.a]} media={quiz.media || []} />
                        </span>
                      </div>
                    )}
                    <div>Time taken: {timeTaken}s</div>
                  </div>
                </div>
              );
            }).filter(Boolean)}
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
