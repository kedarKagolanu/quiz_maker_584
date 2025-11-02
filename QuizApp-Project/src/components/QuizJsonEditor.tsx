import React, { useState, useRef, useEffect } from "react";
import { TerminalLine, TerminalInput, TerminalButton } from "@/components/Terminal";
import { toast } from "sonner";
import { QuizQuestion } from "@/types/quiz";
import { Trash2, Plus } from "lucide-react";

interface QuizJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onError: (error: string, line: number | null, column: number | null) => void;
}

export const QuizJsonEditor: React.FC<QuizJsonEditorProps> = ({ value, onChange, onError }) => {
  const [viewMode, setViewMode] = useState<"raw" | "readable">("raw");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse JSON when switching to readable mode
  useEffect(() => {
    if (viewMode === "readable") {
      try {
        const parsed = JSON.parse(value || "[]");
        setQuestions(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        setQuestions([]);
      }
    }
  }, [viewMode, value]);

  const handleRawChange = (newValue: string) => {
    onChange(newValue);
    onError("", null, null);
  };

  const handleReadableChange = () => {
    // Convert questions array back to JSON
    const json = JSON.stringify(questions, null, 2);
    onChange(json);
    onError("", null, null);
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      q: "",
      o: ["", ""],
      a: 0,
    };
    setQuestions([...questions, newQuestion]);
  };

  const deleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    setTimeout(handleReadableChange, 0);
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
    setTimeout(handleReadableChange, 0);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].o.push("");
    setQuestions(updated);
    setTimeout(handleReadableChange, 0);
  };

  const deleteOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].o.length <= 2) {
      toast.error("At least 2 options required");
      return;
    }
    updated[qIndex].o.splice(oIndex, 1);
    // Adjust answer index if needed
    if (updated[qIndex].a >= updated[qIndex].o.length) {
      updated[qIndex].a = updated[qIndex].o.length - 1;
    }
    setQuestions(updated);
    setTimeout(handleReadableChange, 0);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].o[oIndex] = value;
    setQuestions(updated);
    setTimeout(handleReadableChange, 0);
  };

  const lineNumbers = value.split('\n').map((_, i) => i + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <TerminalLine>questions (JSON format):</TerminalLine>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("raw")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === "raw"
                ? "bg-terminal-accent text-terminal"
                : "bg-terminal-accent/20 text-terminal-foreground hover:bg-terminal-accent/30"
            }`}
          >
            Raw JSON
          </button>
          <button
            onClick={() => {
              setViewMode("readable");
            }}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === "readable"
                ? "bg-terminal-accent text-terminal"
                : "bg-terminal-accent/20 text-terminal-foreground hover:bg-terminal-accent/30"
            }`}
          >
            Readable Form
          </button>
        </div>
      </div>

      {viewMode === "raw" ? (
        <div className="relative border border-terminal-accent/30 rounded flex overflow-hidden">
          {/* Line numbers column */}
          <div className="w-12 bg-terminal-accent/10 border-r border-terminal-accent/30 text-right pr-2 pt-3 text-sm text-terminal-dim select-none overflow-hidden flex-shrink-0">
            <div className="font-mono leading-6">
              {lineNumbers.map((num) => (
                <div key={num} className="h-6">
                  {num}
                </div>
              ))}
            </div>
          </div>
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="flex-1 bg-terminal text-terminal-foreground p-3 focus:outline-none font-mono text-sm min-h-[200px] resize-none leading-6"
            value={value}
            onChange={(e) => handleRawChange(e.target.value)}
            onScroll={(e) => {
              const lineNumbersDiv = e.currentTarget.previousElementSibling?.firstElementChild as HTMLElement;
              if (lineNumbersDiv) {
                lineNumbersDiv.style.transform = `translateY(-${e.currentTarget.scrollTop}px)`;
              }
            }}
            placeholder={`[\n  {"q":"What is 2+2?","o":["3","4","5","6"],"a":1},\n  {"q":"Capital of France?","o":["London","Berlin","Paris","Rome"],"a":2}\n]`}
          />
        </div>
      ) : (
        <div className="border border-terminal-accent/30 rounded p-4 bg-terminal max-h-[500px] overflow-y-auto space-y-4">
          {questions.length === 0 ? (
            <div className="text-terminal-dim text-center py-8">
              No questions yet. Switch to Raw JSON mode to add questions or click below to start.
            </div>
          ) : (
            questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="border border-terminal-accent/30 rounded p-4 bg-terminal-accent/5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-terminal-dim mb-1 block">
                      Question {qIdx + 1}:
                    </label>
                    <input
                      type="text"
                      value={q.q}
                      onChange={(e) => updateQuestion(qIdx, "q", e.target.value)}
                      className="w-full bg-terminal border border-terminal-accent/30 rounded px-3 py-2 text-terminal-foreground focus:outline-none focus:border-terminal-accent"
                      placeholder="Enter question text"
                    />
                  </div>
                  <button
                    onClick={() => deleteQuestion(qIdx)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-terminal-dim mb-2 block">Options:</label>
                  <div className="space-y-2">
                    {q.o.map((option, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIdx}`}
                          checked={q.a === oIdx}
                          onChange={() => updateQuestion(qIdx, "a", oIdx)}
                          className="accent-terminal-accent"
                          title="Mark as correct answer"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          className="flex-1 bg-terminal border border-terminal-accent/30 rounded px-3 py-1.5 text-terminal-foreground focus:outline-none focus:border-terminal-accent"
                          placeholder={`Option ${oIdx + 1}`}
                        />
                        <button
                          onClick={() => deleteOption(qIdx, oIdx)}
                          className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          title="Delete option"
                          disabled={q.o.length <= 2}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addOption(qIdx)}
                    className="mt-2 px-3 py-1 bg-terminal-accent/20 hover:bg-terminal-accent/30 text-terminal-foreground rounded text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Option
                  </button>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={q.l || false}
                      onChange={(e) => updateQuestion(qIdx, "l", e.target.checked)}
                      className="accent-terminal-accent"
                    />
                    <span className="text-terminal-dim">Contains LaTeX math formulas</span>
                  </label>
                </div>
              </div>
            ))
          )}

          <button
            onClick={addQuestion}
            className="w-full py-3 bg-terminal-accent/20 hover:bg-terminal-accent/30 text-terminal-foreground rounded flex items-center justify-center gap-2 border border-terminal-accent/30 border-dashed"
          >
            <Plus className="w-4 h-4" />
            Add New Question
          </button>
        </div>
      )}
    </div>
  );
};
