import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalInput, TerminalButton, TerminalLine } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder } from "@/types/quiz";
import { toast } from "sonner";
import { QuizJsonEditor } from "@/components/QuizJsonEditor";
import { quizQuestionsSchema, quizTitleSchema, validateInput } from "@/lib/validation";
import { handleError } from "@/lib/errorHandler";

export const QuizCreator: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editQuizId = searchParams.get("edit");
  
  const [jsonInput, setJsonInput] = useState("");
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [timeLimit, setTimeLimit] = useState("");
  const [perQuestionTimeLimit, setPerQuestionTimeLimit] = useState("");
  const [randomize, setRandomize] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<{type: 'image' | 'audio', name: string, data: string}[]>([]);
  const [layout, setLayout] = useState<'default' | 'split'>('default');
  const [folderPath, setFolderPath] = useState<string>("");
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [accessCode, setAccessCode] = useState("");
  const [editMode, setEditMode] = useState<'no_edits' | 'pull_requests'>('no_edits');
  const [customQuestionLimit, setCustomQuestionLimit] = useState<number | null>(null);
  const [multiQuizMode, setMultiQuizMode] = useState(false);
  const [quizSources, setQuizSources] = useState<Array<{quizId: string, minQuestions: number, maxQuestions: number, fixedCount: boolean}>>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [jsonError, setJsonError] = useState("");
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [errorColumn, setErrorColumn] = useState<number | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) {
      const loadFoldersAndQuizzes = async () => {
        const allFolders = await storage.getFolders();
        const userFolders = allFolders.filter((f) => f.creator === user.id);
        setFolders(userFolders);
        
        const userQuizzes = await storage.getUserQuizzes(user.id);
        setAvailableQuizzes(userQuizzes);
      };
      loadFoldersAndQuizzes();
    }
  }, [user]);

  useEffect(() => {
    if (editQuizId) {
      const loadQuiz = async () => {
        const quiz = await storage.getQuizById(editQuizId);
        if (quiz && quiz.creator === user?.id) {
          setTitle(quiz.title);
          setJsonInput(JSON.stringify(quiz.questions, null, 2));
          setIsPublic(quiz.isPublic);
          setTimeLimit(quiz.timeLimit?.toString() || "");
          setPerQuestionTimeLimit(quiz.perQuestionTimeLimit?.toString() || "");
          setRandomize(quiz.randomize);
          setUploadedMedia(quiz.media || []);
          setLayout(quiz.layout || 'default');
          setFolderPath(quiz.folderPath || "");
          setAccessCode(quiz.accessCode || "");
          setEditMode(quiz.editMode || 'no_edits');
          setCustomQuestionLimit(quiz.questionLimit || null);
        }
      };
      loadQuiz();
    }
  }, [editQuizId, user]);

  const handleCreate = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    if (!jsonInput) {
      toast.error("Please provide quiz questions JSON");
      return;
    }

    // Validate title
    const titleValidation = validateInput(quizTitleSchema, title);
    if (titleValidation.success === false) {
      toast.error(titleValidation.error);
      return;
    }
    const validatedTitle = titleValidation.data;

    try {
      setJsonError("");
      setErrorLine(null);
      setErrorColumn(null);
      
      // Parse JSON
      const questions = JSON.parse(jsonInput);
      
      // Validate with Zod schema
      const validation = validateInput(quizQuestionsSchema, questions);
      if (validation.success === false) {
        setJsonError(`❌ ${validation.error}`);
        toast.error(validation.error);
        return;
      }
      
      // Use validated data (already validated so type is safe)
      const validatedQuestions = validation.data as any;

      if (editQuizId) {
        const existingQuiz = await storage.getQuizById(editQuizId);
        if (existingQuiz && existingQuiz.creator === user.id) {
          const updatedQuiz: Quiz = {
            ...existingQuiz,
            title: validatedTitle,
            questions: validatedQuestions,
            isPublic,
            timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
            perQuestionTimeLimit: perQuestionTimeLimit ? parseInt(perQuestionTimeLimit) : undefined,
            randomize,
            media: uploadedMedia,
            layout,
            folderPath: folderPath || undefined,
            accessCode: !isPublic && accessCode ? accessCode : undefined,
            editMode,
            questionLimit: customQuestionLimit || undefined,
          };
          await storage.updateQuiz(updatedQuiz);
          toast.success("Quiz updated successfully!");
          navigate("/my-quizzes");
        }
      } else {
        const quiz: Quiz = {
          id: Date.now().toString(),
          title: validatedTitle,
          questions: validatedQuestions,
          creator: user.id,
          createdAt: Date.now(),
          isPublic,
          timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
          perQuestionTimeLimit: perQuestionTimeLimit ? parseInt(perQuestionTimeLimit) : undefined,
          randomize,
          media: uploadedMedia,
          layout,
          folderPath: folderPath || undefined,
          accessCode: !isPublic && accessCode ? accessCode : undefined,
          editMode,
          questionLimit: customQuestionLimit || undefined,
        };
        await storage.saveQuiz(quiz);
        toast.success("Quiz created successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      handleError(error, { 
        userMessage: "Failed to create quiz. Please check your JSON format.",
        logToConsole: true 
      });
      
      const errorMsg = error.message || "Unknown error";
      const match = errorMsg.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        const lines = jsonInput.substring(0, pos).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        setErrorLine(line);
        setErrorColumn(column);
        setJsonError(`❌ JSON Syntax Error at line ${line}, column ${column}: ${errorMsg}`);
      } else {
        setJsonError(`❌ JSON Syntax Error: ${errorMsg}`);
      }
      toast.error("Invalid JSON format. Check the error message below.");
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedMedia(prev => [...prev, { type, name: file.name, data: result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const copyMediaReference = (index: number, type: 'image' | 'audio') => {
    const tag = type === 'image' ? `[img:${index + 1}]` : `[audio:${index + 1}]`;
    navigator.clipboard.writeText(tag);
    toast.success(`Copied ${tag}! Paste it anywhere in your questions or options.`);
  };

  const deleteMedia = (index: number) => {
    setUploadedMedia(prev => prev.filter((_, i) => i !== index));
    toast.success("Media deleted");
  };

  const jumpToErrorLine = () => {
    if (errorLine !== null && textareaRef.current) {
      const lines = jsonInput.split('\n');
      let position = 0;
      for (let i = 0; i < errorLine - 1; i++) {
        position += lines[i].length + 1; // +1 for newline
      }
      if (errorColumn !== null) {
        position += errorColumn - 1;
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(position, position);
      textareaRef.current.scrollTop = (errorLine - 1) * 20; // Approximate line height
    }
  };

  const lineNumbers = jsonInput.split('\n').map((_, i) => i + 1).join('\n');

  const exampleJson = `[
  {"q":"What is 2+2?","o":["3","4","5","6"],"a":1},
  {"q":"Capital of France?","o":["London","Berlin","Paris","Rome"],"a":2},
  {"q":"Solve for x: $x^2 = 16$","o":["$x = 2$","$x = 4$","$x = 8$","$x = 16$"],"a":1},
  {"q":"What is $\\\\frac{1}{2} + \\\\frac{1}{3}$?","o":["$\\\\frac{2}{5}$","$\\\\frac{5}{6}$","$\\\\frac{3}{5}$","$1$"],"a":1}
]`;

  return (
    <Terminal title={editQuizId ? "edit-quiz" : "create-quiz"}>
      <TerminalLine>{editQuizId ? "Edit your quiz" : "Create a new quiz using JSON format"}</TerminalLine>
      
      <div className="mt-6 space-y-4">
        <TerminalInput
          label="quiz title:"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <QuizJsonEditor
            value={jsonInput}
            onChange={setJsonInput}
            onError={(error, line, column) => {
              setJsonError(error);
              setErrorLine(line);
              setErrorColumn(column);
            }}
          />
          {jsonError && (
            <div 
              className="mt-2 p-3 bg-red-900/20 border border-red-500/50 rounded text-red-300 text-sm font-mono whitespace-pre-wrap cursor-pointer hover:bg-red-900/30 transition-colors"
              onDoubleClick={jumpToErrorLine}
              title="Double-click to jump to error"
            >
              {jsonError}
              <div className="text-xs mt-1 opacity-70">💡 Double-click to jump to error location</div>
            </div>
          )}
          
          {/* Image upload tips */}
          <div className="mt-3 p-3 bg-terminal-accent/5 border border-terminal-accent/20 rounded text-xs text-terminal-dim space-y-1">
            <div className="font-medium text-terminal-bright">📸 Media Upload Tips:</div>
            <div>• <strong>Image size:</strong> Keep images under 500KB for optimal performance</div>
            <div>• <strong>Resolution:</strong> 1200x800px or smaller recommended</div>
            <div>• <strong>Format:</strong> JPG, PNG, or WebP supported</div>
            <div>• <strong>Audio:</strong> MP3 format, under 2MB recommended</div>
            <div>• Large files may cause slow loading or upload failures</div>
          </div>
        </div>

        <div>
          <TerminalLine>upload media (images & audio):</TerminalLine>
          <div className="flex gap-3 mt-2">
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleMediaUpload(e, 'image')}
                className="text-terminal-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-terminal-accent file:text-terminal cursor-pointer"
              />
            </div>
            <div>
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => handleMediaUpload(e, 'audio')}
                className="text-terminal-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-terminal-accent file:text-terminal cursor-pointer"
              />
            </div>
          </div>
          {uploadedMedia.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadedMedia.map((media, idx) => (
                <div key={idx} className="border border-terminal-accent/30 p-3 rounded flex items-center gap-3">
                  {media.type === 'image' ? (
                    <img src={media.data} alt={media.name} className="w-20 h-20 object-cover rounded" />
                  ) : (
                    <div className="w-20 h-20 bg-terminal-accent/20 rounded flex items-center justify-center text-3xl">
                      🔊
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {media.type === 'image' ? '🖼️' : '🔊'} {media.type.toUpperCase()} #{idx + 1}
                    </p>
                    <p className="text-xs text-terminal-dim truncate">{media.name}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => copyMediaReference(idx, media.type)}
                        className="bg-terminal-accent/20 hover:bg-terminal-accent/30 text-terminal-foreground px-3 py-1 rounded text-xs"
                      >
                        Copy [{media.type === 'image' ? 'img' : 'audio'}:{idx + 1}]
                      </button>
                      <button
                        onClick={() => deleteMedia(idx)}
                        className="bg-red-900/20 hover:bg-red-900/30 text-red-300 px-3 py-1 rounded text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <TerminalLine>settings:</TerminalLine>
          <div className="ml-6 space-y-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="accent-terminal-accent"
                />
                <span>Make quiz public</span>
              </label>
              {folderPath && (
                <div className="text-xs text-terminal-dim ml-6">
                  💡 Tip: If folder "{folderPath}" is public, new quizzes will be public by default
                </div>
              )}
            </div>
            
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
              <span>Quiz layout:</span>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as 'default' | 'split')}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
              >
                <option value="default">Default (Vertical)</option>
                <option value="split">Split (Question Left, Options Right)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span>Save to folder:</span>
              <select
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
              >
                <option value="">Root</option>
                {folders.map((folder) => {
                  const fullPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
                  return (
                    <option key={folder.id} value={fullPath}>
                      {fullPath}
                    </option>
                  );
                })}
              </select>
            </div>

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
                  (Auto: {parseInt(perQuestionTimeLimit) * Math.max(1, jsonInput.split('"q"').length - 1)}s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span>Question limit (for randomization):</span>
              <input
                type="number"
                value={customQuestionLimit || ""}
                onChange={(e) => setCustomQuestionLimit(e.target.value ? parseInt(e.target.value) : null)}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24"
                placeholder="All"
                min="1"
              />
              <span className="text-terminal-dim text-sm">
                Limit number of questions when randomizing (leave empty for all)
              </span>
            </div>

            <div className="space-y-4 border-t border-terminal-accent/30 pt-4 mt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="multiQuizMode"
                  checked={multiQuizMode}
                  onChange={(e) => setMultiQuizMode(e.target.checked)}
                  className="accent-terminal-accent"
                />
                <label htmlFor="multiQuizMode" className="text-sm">
                  🔗 Multi-Quiz Mode (Merge questions from multiple quizzes)
                </label>
              </div>

              {multiQuizMode && (
                <div className="space-y-3 border border-terminal-accent/30 p-4 rounded">
                  <div className="text-sm font-bold text-terminal-bright">Quiz Sources:</div>
                  
                  {quizSources.map((source, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border border-terminal-accent/20 rounded">
                      <select
                        value={source.quizId}
                        onChange={(e) => {
                          const newSources = [...quizSources];
                          newSources[idx].quizId = e.target.value;
                          setQuizSources(newSources);
                        }}
                        className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded flex-1"
                      >
                        <option value="">Select Quiz</option>
                        {availableQuizzes.map(quiz => (
                          <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                        ))}
                      </select>
                      
                      <input
                        type="number"
                        value={source.minQuestions}
                        onChange={(e) => {
                          const newSources = [...quizSources];
                          newSources[idx].minQuestions = parseInt(e.target.value) || 1;
                          setQuizSources(newSources);
                        }}
                        className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-16"
                        placeholder="Min"
                        min="1"
                      />
                      
                      {!source.fixedCount && (
                        <input
                          type="number"
                          value={source.maxQuestions}
                          onChange={(e) => {
                            const newSources = [...quizSources];
                            newSources[idx].maxQuestions = parseInt(e.target.value) || 1;
                            setQuizSources(newSources);
                          }}
                          className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-16"
                          placeholder="Max"
                          min={source.minQuestions}
                        />
                      )}
                      
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={source.fixedCount}
                          onChange={(e) => {
                            const newSources = [...quizSources];
                            newSources[idx].fixedCount = e.target.checked;
                            if (e.target.checked) {
                              newSources[idx].maxQuestions = newSources[idx].minQuestions;
                            }
                            setQuizSources(newSources);
                          }}
                          className="accent-terminal-accent"
                        />
                        Fixed
                      </label>
                      
                      <button
                        onClick={() => {
                          const newSources = quizSources.filter((_, i) => i !== idx);
                          setQuizSources(newSources);
                        }}
                        className="text-red-400 hover:text-red-300 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      setQuizSources([...quizSources, {
                        quizId: "",
                        minQuestions: 1,
                        maxQuestions: 5,
                        fixedCount: false
                      }]);
                    }}
                    className="text-sm text-terminal-accent hover:text-terminal-bright"
                  >
                    + Add Quiz Source
                  </button>
                  
                  {quizSources.length > 0 && (
                    <div className="text-xs text-terminal-dim">
                      Total questions: {quizSources.reduce((sum, s) => sum + (s.fixedCount ? s.minQuestions : s.minQuestions), 0)} - {quizSources.reduce((sum, s) => sum + s.maxQuestions, 0)}
                    </div>
                  )}
                </div>
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

            {!isPublic && (
              <div className="border border-terminal-accent/30 bg-terminal-accent/5 rounded p-3 space-y-2">
                <div className="text-terminal-bright text-sm font-medium">📋 Private Quiz Access Code</div>
                <div className="text-terminal-dim text-xs">
                  Share this code with specific users to grant them access to your private quiz.
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Access code:</span>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-32"
                    placeholder="e.g., MATH101"
                  />
                  <button
                    onClick={() => setAccessCode(Math.random().toString(36).substring(2, 10).toUpperCase())}
                    className="bg-terminal-accent/20 hover:bg-terminal-accent/30 text-terminal-foreground px-3 py-1 rounded text-sm"
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span>Edit mode:</span>
              <select
                value={editMode}
                onChange={(e) => setEditMode(e.target.value as 'no_edits' | 'pull_requests')}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
              >
                <option value="no_edits">No edits accepted</option>
                <option value="pull_requests">Pull requests accepted</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <TerminalButton onClick={handleCreate}>{editQuizId ? "update quiz" : "create quiz"}</TerminalButton>
          <TerminalButton onClick={() => navigate(editQuizId ? `/quiz/${editQuizId}/customize-advanced` : "/dashboard")}>
            🔧 advanced settings
          </TerminalButton>
          <TerminalButton onClick={() => navigate(editQuizId ? "/my-quizzes" : "/dashboard")}>cancel</TerminalButton>
        </div>

        <div className="mt-8 border-t border-terminal-accent/30 pt-4">
          <TerminalLine prefix="ℹ">JSON Format Guide:</TerminalLine>
          <div className="ml-6 text-sm space-y-1 text-terminal-dim">
            <div>• <span className="text-terminal-bright">q</span>: question text (LaTeX always enabled)</div>
            <div>• <span className="text-terminal-bright">o</span>: array of options (must have at least 2, LaTeX always enabled)</div>
            <div>• <span className="text-terminal-bright">a</span>: correct answer index (0-based, e.g., 0=first option, 1=second)</div>
          </div>
          <div className="ml-6 text-sm space-y-1 text-terminal-dim mt-3">
            <div className="text-terminal-bright">LaTeX Syntax (always enabled):</div>
            <div>• Wrap math in $ signs: <span className="text-terminal-accent">$x^2 + y^2 = z^2$</span></div>
            <div>• Fractions: <span className="text-terminal-accent">$\frac{'{1}'}{'{2}'}$</span></div>
            <div>• Square root: <span className="text-terminal-accent">$\sqrt{'{16}'}$</span></div>
            <div>• Exponents: <span className="text-terminal-accent">$2^{'{10}'}$</span></div>
            <div>• Greek letters: <span className="text-terminal-accent">$\alpha, \beta, \pi$</span></div>
            <div>• Regular text: Just type normally without $ signs</div>
          </div>
          <div className="ml-6 text-sm space-y-1 text-terminal-dim mt-3">
            <div className="text-terminal-bright">Adding Images & Audio:</div>
            <div>• Upload images/audio in the "upload media" section above</div>
            <div>• Each file gets a number (#1, #2, #3, etc.)</div>
            <div>• Click "Copy [img:1]" or "Copy [audio:1]" to get the reference tag</div>
            <div>• Paste the tag anywhere in your question or option text</div>
            <div className="text-terminal-accent">Example: {`{"q":"What animal? [img:1]","o":["Cat [img:2]","Dog"],"a":0}`}</div>
            <div className="text-terminal-accent">Example: {`{"q":"Identify the sound [audio:1]","o":["Piano","Guitar"],"a":0}`}</div>
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