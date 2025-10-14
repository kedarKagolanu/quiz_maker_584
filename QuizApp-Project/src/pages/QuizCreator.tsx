import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalInput, TerminalButton, TerminalLine } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz } from "@/types/quiz";
import { toast } from "sonner";

export const QuizCreator: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jsonInput, setJsonInput] = useState("");
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [timeLimit, setTimeLimit] = useState("");
  const [perQuestionTimeLimit, setPerQuestionTimeLimit] = useState("");
  const [randomize, setRandomize] = useState(false);

  const handleCreate = () => {
    if (!user) {
      navigate("/");
      return;
    }

    if (!title || !jsonInput) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const questions = JSON.parse(jsonInput);
      
      if (!Array.isArray(questions) || questions.length === 0) {
        toast.error("Invalid JSON format. Expected an array of questions.");
        return;
      }

      const quiz: Quiz = {
        id: Date.now().toString(),
        title,
        questions,
        creator: user.id,
        createdAt: Date.now(),
        isPublic,
        timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
        perQuestionTimeLimit: perQuestionTimeLimit ? parseInt(perQuestionTimeLimit) : undefined,
        randomize,
      };

      storage.saveQuiz(quiz);
      toast.success("Quiz created successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Invalid JSON format. Please check your input.");
    }
  };

  const exampleJson = `[
  {"q":"What is 2+2?","o":["3","4","5","6"],"a":1},
  {"q":"Capital of France?","o":["London","Berlin","Paris","Rome"],"a":2},
  {"q":"Solve for x: $x^2 = 16$","o":["$x = 2$","$x = 4$","$x = 8$","$x = 16$"],"a":1,"l":true},
  {"q":"What is $\\\\frac{1}{2} + \\\\frac{1}{3}$?","o":["$\\\\frac{2}{5}$","$\\\\frac{5}{6}$","$\\\\frac{3}{5}$","$1$"],"a":1,"l":true}
]`;

  return (
    <Terminal title="create-quiz">
      <TerminalLine>Create a new quiz using JSON format</TerminalLine>
      
      <div className="mt-6 space-y-4">
        <TerminalInput
          label="quiz title:"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <TerminalLine>questions (JSON format):</TerminalLine>
          <textarea
            className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground p-3 rounded focus:outline-none focus:border-terminal-accent font-mono text-sm min-h-[200px]"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={exampleJson}
          />
        </div>

        <div className="space-y-2">
          <TerminalLine>settings:</TerminalLine>
          <div className="ml-6 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="accent-terminal-accent"
              />
              <span>Make quiz public</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={randomize}
                onChange={(e) => setRandomize(e.target.checked)}
                className="accent-terminal-accent"
              />
              <span>Randomize question order</span>
            </label>

            <div className="flex items-center gap-2">
              <span>Quiz time limit (seconds):</span>
              <input
                type="number"
                value={perQuestionTimeLimit ? "" : timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="None"
                disabled={!!perQuestionTimeLimit}
              />
              {perQuestionTimeLimit && (
                <span className="text-terminal-dim text-sm">
                  (Auto: {parseInt(perQuestionTimeLimit) * jsonInput.split('"q"').length - 1}s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span>Per-question time limit (seconds):</span>
              <input
                type="number"
                value={perQuestionTimeLimit}
                onChange={(e) => setPerQuestionTimeLimit(e.target.value)}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24"
                placeholder="None"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <TerminalButton onClick={handleCreate}>create quiz</TerminalButton>
          <TerminalButton onClick={() => navigate("/dashboard")}>cancel</TerminalButton>
        </div>

        <div className="mt-8 border-t border-terminal-accent/30 pt-4">
          <TerminalLine prefix="ℹ">JSON Format Guide:</TerminalLine>
          <div className="ml-6 text-sm space-y-1 text-terminal-dim">
            <div>• <span className="text-terminal-bright">q</span>: question text</div>
            <div>• <span className="text-terminal-bright">o</span>: array of options (must have at least 2)</div>
            <div>• <span className="text-terminal-bright">a</span>: correct answer index (0-based, e.g., 0=first option, 1=second)</div>
            <div>• <span className="text-terminal-bright">l</span>: set to true if question/options have LaTeX (optional)</div>
          </div>
          <div className="ml-6 text-sm space-y-1 text-terminal-dim mt-3">
            <div className="text-terminal-bright">LaTeX Syntax:</div>
            <div>• Wrap math in $ signs: <span className="text-terminal-accent">$x^2 + y^2 = z^2$</span></div>
            <div>• Fractions: <span className="text-terminal-accent">$\frac{'{1}'}{'{2}'}$</span></div>
            <div>• Square root: <span className="text-terminal-accent">$\sqrt{'{16}'}$</span></div>
            <div>• Exponents: <span className="text-terminal-accent">$2^{'{10}'}$</span></div>
            <div>• Greek letters: <span className="text-terminal-accent">$\alpha, \beta, \pi$</span></div>
          </div>
          <div className="ml-6 text-sm space-y-1 text-terminal-dim mt-3">
            <div className="text-terminal-bright">Time Modes (set above, not in JSON):</div>
            <div>• <span className="text-terminal-accent">Quiz timer</span>: Set "Quiz time limit" → timed exam with revisits allowed</div>
            <div>• <span className="text-terminal-accent">No timer</span>: Leave both empty → unlimited time with revisits allowed</div>
            <div>• <span className="text-terminal-accent">Question timer</span>: Set "Per-question time limit" → same time for each question, no revisits</div>
          </div>
        </div>
      </div>
    </Terminal>
  );
};
