import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalInput, TerminalButton, TerminalLine } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizFolder } from "@/types/quiz";
import { toast } from "sonner";
import { QuizJsonEditor } from "@/components/QuizJsonEditor";
import { QuizPreview } from "@/components/QuizPreview";
import { quizQuestionsSchema, quizTitleSchema, validateInput } from "@/lib/validation";
import { handleError } from "@/lib/errorHandler";
import { useQuizCreator } from "@/hooks/useQuizCreator";
import { useMultiQuizManager } from "@/hooks/useMultiQuizManager";
import { MediaUploader, type MediaItem } from "@/components/quiz-creator/MediaUploader";
import { QuizSettings } from "@/components/quiz-creator/QuizSettings";
import { AdvancedSettings } from "@/components/quiz-creator/AdvancedSettings";

export const QuizCreator: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editQuizId = searchParams.get("edit");
  
  // Use extracted hooks
  const { state: quizState, actions: quizActions } = useQuizCreator();
  const { state: multiQuizState, actions: multiQuizActions } = useMultiQuizManager();
  
  // Local component state (not extracted to hooks)
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem[]>([]);
  const [viewMode, setViewMode] = useState<'readable' | 'render'>('readable');
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [folderHistory, setFolderHistory] = useState<string[]>(['']);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Preview and image size controls
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  
  // Advanced settings visibility
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    if (user) {
      const loadFoldersAndQuizzes = async () => {
        const allFolders = await storage.getFolders();
        const userFolders = allFolders.filter((f) => f.creator === user.id);
        setFolders(userFolders);
        
        const userQuizzes = await storage.getUserQuizzes(user.id);
        setAvailableQuizzes(userQuizzes);
        
        // Initialize with root folder
        multiQuizActions.setCurrentFolder('');
      };
      loadFoldersAndQuizzes();
    }
  }, [user]);

  useEffect(() => {
    if (editQuizId) {
      const loadQuiz = async () => {
        console.log('📝 Loading quiz for editing:', editQuizId);
        const quiz = await storage.getQuizById(editQuizId);
        if (quiz && quiz.creator === user?.id) {
          console.log('✅ Quiz loaded for editing:', {
            title: quiz.title,
            hasMultiQuizSources: !!quiz.multiQuizSources,
            questionsCount: quiz.questions?.length
          });
          
          quizActions.setTitle(quiz.title);
          quizActions.setIsPublic(quiz.isPublic);
          quizActions.setTimeLimit(quiz.timeLimit?.toString() || "");
          quizActions.setPerQuestionTimeLimit(quiz.perQuestionTimeLimit?.toString() || "");
          quizActions.setRandomize(quiz.randomize);
          setUploadedMedia((quiz.media || []).map(media => ({
          ...media,
          size: media.size || 'medium'
        })));
          quizActions.setLayout(quiz.layout || 'default');
          quizActions.setFolderPath(quiz.folderPath || "");
          quizActions.setAccessCode(quiz.accessCode || "");
          quizActions.setEditMode(quiz.editMode || 'no_edits');
          quizActions.setCustomQuestionLimit(quiz.questionLimit || null);
          quizActions.setImageSize(quiz.imageSize || 'medium');
          
          // Handle multi-quiz vs single quiz
          if (quiz.multiQuizSources) {
            console.log('🔗 Loading multi-quiz configuration:', quiz.multiQuizSources);
            multiQuizActions.loadMultiQuizConfiguration(quiz);
            
            // For multi-quiz, only set JSON for manual questions (exclude config placeholder)
            const manualQuestions = quiz.questions?.filter(q => !(q as any)._isMultiQuizConfig) || [];
            if (manualQuestions.length > 0) {
              quizActions.setJsonInput(JSON.stringify(manualQuestions, null, 2));
            } else {
              quizActions.setJsonInput("");
            }
          } else {
            console.log('📄 Loading single quiz');
            multiQuizActions.setMultiQuizMode(false);
            quizActions.setJsonInput(JSON.stringify(quiz.questions, null, 2));
          }
        }
      };
      loadQuiz();
    }
  }, [editQuizId, user]);

  const handleCreate = async () => {
    console.log('🚀 handleCreate called', {
      user: !!user,
      multiQuizMode: multiQuizState.multiQuizMode,
      jsonInput: quizState.jsonInput?.substring(0, 50) + '...',
      quizSourcesCount: multiQuizState.quizSources.length,
      title: quizState.title
    });

    if (!user) {
      navigate("/");
      return;
    }

    if (!quizState.jsonInput && !multiQuizState.multiQuizMode) {
      toast.error("Please provide quiz questions JSON or enable Multi-Quiz Mode");
      return;
    }

    if (multiQuizState.multiQuizMode && multiQuizState.quizSources.length === 0) {
      toast.error("Multi-Quiz Mode: Please add at least one quiz source");
      return;
    }

    if (!multiQuizState.multiQuizMode && !quizState.jsonInput) {
      toast.error("Please provide quiz questions JSON");
      return;
    }

    // Validate title
    const titleValidation = validateInput(quizTitleSchema, quizState.title);
    if (titleValidation.success === false) {
      toast.error(titleValidation.error);
      return;
    }
    const validatedTitle = titleValidation.data;

    // Validate multi-quiz mode settings
    if (multiQuizState.multiQuizMode) {
      if (multiQuizState.quizSources.length === 0) {
        toast.error("Multi-Quiz Mode: Please add at least one quiz source");
        return;
      }

      // Validate each quiz source using extracted validation
      const validationErrors = multiQuizActions.validateQuizSources(availableQuizzes);
      if (validationErrors.length > 0) {
        toast.error(validationErrors[0]);
        return;
      }

      // Validate question limit against total
      const { totalMinQuestions } = multiQuizActions.getTotalQuestionRange();
      if (quizState.customQuestionLimit && quizState.customQuestionLimit < totalMinQuestions) {
        console.error(`❌ Question limit validation failed: ${quizState.customQuestionLimit} < ${totalMinQuestions}`);
        toast.error(`❌ Question limit (${quizState.customQuestionLimit}) is less than minimum required questions (${totalMinQuestions}) from your sources`);
        return;
      }
      
      console.log('✅ Multi-quiz validation completed successfully');
    } else {
      console.log('📄 Single quiz mode - skipping multi-quiz validation');
    }

    // Validate question limit against total questions for single quiz mode
    if (!multiQuizState.multiQuizMode && quizState.customQuestionLimit && quizState.jsonInput) {
      try {
        const questions = JSON.parse(quizState.jsonInput);
        if (Array.isArray(questions) && quizState.customQuestionLimit > questions.length) {
          toast.error(`❌ Question limit (${quizState.customQuestionLimit}) cannot be greater than total questions (${questions.length})`);
          return;
        }
      } catch (e) {
        // JSON validation will catch this later
      }
    }

    try {
      console.log('🔄 Starting quiz creation process');
      quizActions.setJsonError("");
      quizActions.setErrorLine(null);
      quizActions.setErrorColumn(null);
      
      let questions: any[] = [];
      
      if (multiQuizState.multiQuizMode) {
        console.log('🔗 Multi-Quiz Mode: Processing configuration', { quizSources: multiQuizState.quizSources });
        
        // For multi-quiz mode, we DON'T generate questions now
        // Instead, we store the configuration and generate questions dynamically when quiz is taken
        
        // Validate that we have at least one source
        if (multiQuizState.quizSources.length === 0) {
          toast.error("Multi-Quiz Mode: Please add at least one quiz source");
          return;
        }
        
        // Create a placeholder questions array with configuration metadata
        questions = [{
          q: "Multi-Quiz Configuration",
          a: "This quiz will dynamically generate questions from multiple sources",
          options: [],
          _isMultiQuizConfig: true
        }];
        
        console.log('📝 Created placeholder question for multi-quiz', questions);
        
        // Add manual questions if provided
        if (quizState.jsonInput && quizState.jsonInput.trim()) {
          try {
            const extraQuestions = JSON.parse(quizState.jsonInput);
            if (Array.isArray(extraQuestions)) {
              questions.push(...extraQuestions.map(q => ({
                ...q,
                _sourceQuiz: 'manual',
                _sourceTitle: 'Manual Entry'
              })));
              console.log('➕ Added manual questions:', extraQuestions.length);
            }
          } catch (e) {
            console.error('❌ Error parsing additional JSON questions:', e);
            toast.error("Invalid JSON format for additional questions");
            return;
          }
        }
        
        console.log('📊 Multi-Quiz Configuration Saved - Questions will be generated dynamically');
        
      } else {
        console.log('📄 Single Quiz Mode: Parsing JSON');
        // Parse JSON for single quiz mode
        if (!quizState.jsonInput || !quizState.jsonInput.trim()) {
          toast.error("Please provide quiz questions JSON");
          return;
        }
        questions = JSON.parse(quizState.jsonInput);
        console.log('✅ Parsed questions from JSON:', questions.length);
      }
      
      // Validate with Zod schema (skip validation for multi-quiz placeholder)
      console.log('🔍 Validation check:', { 
        multiQuizMode: multiQuizState.multiQuizMode, 
        questionsLength: questions.length,
        isMultiQuizConfig: questions[0]?._isMultiQuizConfig,
        firstQuestion: questions[0]?.q?.substring(0, 30)
      });

      if (multiQuizState.multiQuizMode && questions.length >= 1 && questions[0]._isMultiQuizConfig) {
        // Skip validation for multi-quiz placeholder
        console.log('✅ Skipping validation for multi-quiz placeholder');
      } else {
        console.log('🔍 Running validation on questions...');
        const validation = validateInput(quizQuestionsSchema, questions);
        if (validation.success === false) {
          console.error('❌ Validation failed:', validation.error);
          quizActions.setJsonError(`❌ ${validation.error}`);
          toast.error(validation.error);
          return;
        }
        console.log('✅ Validation passed');
      }
      
      // Use validated data (already validated so type is safe, or use questions directly for multi-quiz)
      let validatedQuestions: any;
      if (multiQuizState.multiQuizMode && questions.length >= 1 && questions[0]._isMultiQuizConfig) {
        // For multi-quiz mode, use questions directly without validation
        console.log('📝 Using questions directly for multi-quiz mode');
        validatedQuestions = questions;
      } else {
        // For single quiz mode, use already validated data from above
        console.log('📝 Using validated questions for single quiz mode');
        const validation = validateInput(quizQuestionsSchema, questions);
        if (validation.success === false) {
          console.error('❌ Second validation failed:', validation.error);
          quizActions.setJsonError(`❌ ${validation.error}`);
          toast.error(validation.error);
          return;
        }
        validatedQuestions = validation.data;
      }

      // Extract multi-quiz metadata if present
      const multiQuizMetadata = (validatedQuestions as any)._multiQuizMetadata;
      
      console.log('💾 Preparing to save quiz with:', {
        editQuizId,
        multiQuizMode: multiQuizState.multiQuizMode,
        questionsCount: validatedQuestions.length,
        multiQuizSourcesConfig: multiQuizState.multiQuizMode ? {
          sources: multiQuizState.quizSources.map(s => ({
            quizId: s.quizId,
            minQuestions: typeof s.minQuestions === 'string' ? parseInt(s.minQuestions) || 1 : s.minQuestions,
            maxQuestions: typeof s.maxQuestions === 'string' ? parseInt(s.maxQuestions) || 1 : s.maxQuestions,
            fixedCount: s.fixedCount
          })),
          metadata: multiQuizMetadata,
          hasManualQuestions: !!(quizState.jsonInput && quizState.jsonInput.trim())
        } : 'none'
      });
      
      if (editQuizId) {
        const existingQuiz = await storage.getQuizById(editQuizId);
        if (existingQuiz && existingQuiz.creator === user.id) {
          const updatedQuiz: Quiz = {
            ...existingQuiz,
            title: validatedTitle,
            questions: validatedQuestions,
            isPublic: quizState.isPublic,
            timeLimit: (quizState.timeLimit && quizState.timeLimit !== "" && quizState.timeLimit !== "0") ? parseInt(quizState.timeLimit) : undefined,
            perQuestionTimeLimit: (quizState.perQuestionTimeLimit && quizState.perQuestionTimeLimit !== "" && quizState.perQuestionTimeLimit !== "0") ? parseInt(quizState.perQuestionTimeLimit) : undefined,
            randomize: quizState.randomize,
            media: uploadedMedia,
            layout: quizState.layout,
            folderPath: quizState.folderPath || undefined,
            accessCode: !quizState.isPublic && quizState.accessCode ? quizState.accessCode : undefined,
            editMode: quizState.editMode,
            questionLimit: quizState.customQuestionLimit || undefined,
            imageSize: quizState.imageSize,
            // Store multi-quiz metadata if this was generated from multiple sources
            multiQuizSources: multiQuizState.multiQuizMode ? {
              sources: multiQuizState.quizSources.map(s => ({
                quizId: s.quizId,
                minQuestions: typeof s.minQuestions === 'string' ? parseInt(s.minQuestions) || 1 : s.minQuestions,
                maxQuestions: typeof s.maxQuestions === 'string' ? parseInt(s.maxQuestions) || 1 : s.maxQuestions,
                fixedCount: s.fixedCount,
                sectionName: s.sectionName
              })),
              metadata: multiQuizMetadata,
              hasManualQuestions: !!(quizState.jsonInput && quizState.jsonInput.trim()),
              preserveQuizOrder: multiQuizState.preserveQuizOrder
            } : undefined,
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
          isPublic: quizState.isPublic,
          timeLimit: (quizState.timeLimit && quizState.timeLimit !== "" && quizState.timeLimit !== "0") ? parseInt(quizState.timeLimit) : undefined,
          perQuestionTimeLimit: (quizState.perQuestionTimeLimit && quizState.perQuestionTimeLimit !== "" && quizState.perQuestionTimeLimit !== "0") ? parseInt(quizState.perQuestionTimeLimit) : undefined,
          randomize: quizState.randomize,
          media: uploadedMedia,
          layout: quizState.layout,
          folderPath: quizState.folderPath || undefined,
          accessCode: !quizState.isPublic && quizState.accessCode ? quizState.accessCode : undefined,
          editMode: quizState.editMode,
          questionLimit: quizState.customQuestionLimit || undefined,
          imageSize: quizState.imageSize,
          // Store multi-quiz metadata if this was generated from multiple sources
          multiQuizSources: multiQuizState.multiQuizMode ? {
            sources: multiQuizState.quizSources.map(s => ({
              quizId: s.quizId,
              minQuestions: typeof s.minQuestions === 'string' ? parseInt(s.minQuestions) || 1 : s.minQuestions,
              maxQuestions: typeof s.maxQuestions === 'string' ? parseInt(s.maxQuestions) || 1 : s.maxQuestions,
              fixedCount: s.fixedCount,
              sectionName: s.sectionName
            })),
            metadata: multiQuizMetadata,
            hasManualQuestions: !!(quizState.jsonInput && quizState.jsonInput.trim()),
            preserveQuizOrder: multiQuizState.preserveQuizOrder
          } : undefined,
        };
        
        console.log('🚀 Calling storage.saveQuiz with quiz object:', {
          id: quiz.id,
          title: quiz.title,
          hasMultiQuizSources: !!quiz.multiQuizSources,
          multiQuizSourcesDetail: quiz.multiQuizSources
        });
        
        await storage.saveQuiz(quiz);
        console.log('✅ Quiz saved successfully to database');
        
        // Verify the quiz was saved with multi-quiz sources
        if (multiQuizState.multiQuizMode) {
          try {
            const savedQuiz = await storage.getQuizById(quiz.id);
            console.log('🔍 Verification: Retrieved quiz from database:', {
              id: savedQuiz?.id,
              title: savedQuiz?.title,
              hasMultiQuizSources: !!savedQuiz?.multiQuizSources,
              multiQuizSourcesFromDB: savedQuiz?.multiQuizSources
            });
          } catch (error) {
            console.error('❌ Error verifying saved quiz:', error);
          }
        }
        
        if (multiQuizState.multiQuizMode && multiQuizMetadata) {
          toast.success(`🎉 Multi-Quiz created successfully! Combined ${multiQuizMetadata.sources.length} sources into ${multiQuizMetadata.totalQuestions} questions.`);
        } else {
          toast.success("Quiz created successfully!");
        }
        navigate("/dashboard");
      }
    } catch (error: any) {
      handleError(error, { 
        userMessage: "Failed to create quiz. Please check your JSON format.",
        logToConsole: true 
      });
      
      const errorMsg = error.message || "Unknown error";
      const match = errorMsg.match(/position (\\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        const lines = quizState.jsonInput.substring(0, pos).split('\\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        quizActions.setErrorLine(line);
        quizActions.setErrorColumn(column);
        quizActions.setJsonError(`❌ JSON Syntax Error at line ${line}, column ${column}: ${errorMsg}`);
      } else {
        quizActions.setJsonError(`❌ JSON Syntax Error: ${errorMsg}`);
      }
      toast.error("Invalid JSON format. Check the error message below.");
    }
  };

  // Media upload handlers
  const handleMediaUpload = useCallback((media: MediaItem[]) => {
    setUploadedMedia(media);
  }, []);

  const handleMediaDelete = useCallback((index: number) => {
    setUploadedMedia(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleMediaSizeChange = useCallback((index: number, size: 'small' | 'medium' | 'large' | 'xlarge') => {
    setUploadedMedia(prev => prev.map((media, i) => 
      i === index ? { ...media, size } : media
    ));
  }, []);

  const getParsedQuestions = useCallback(() => {
    try {
      if (!quizState.jsonInput) return [];
      const parsed = JSON.parse(quizState.jsonInput);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [quizState.jsonInput]);

  const jumpToErrorLine = useCallback(() => {
    if (quizState.errorLine !== null && textareaRef.current) {
      const lines = quizState.jsonInput.split('\\n');
      let position = 0;
      for (let i = 0; i < quizState.errorLine - 1; i++) {
        position += lines[i].length + 1; // +1 for newline
      }
      if (quizState.errorColumn !== null) {
        position += quizState.errorColumn - 1;
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(position, position);
      textareaRef.current.scrollTop = (quizState.errorLine - 1) * 20; // Approximate line height
    }
  }, [quizState.errorLine, quizState.errorColumn, quizState.jsonInput]);

  const lineNumbers = quizState.jsonInput.split('\\n').map((_, i) => i + 1).join('\\n');

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
          value={quizState.title}
          onChange={(e) => quizActions.setTitle(e.target.value)}
        />

        <div>
          <div className="mb-4 flex items-center gap-4">
            <div className="text-terminal-bright font-medium">JSON Editor:</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('readable')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'readable' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                📝 Readable Mode
              </button>
              <button
                onClick={() => setViewMode('render')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'render' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                🎯 Render View
              </button>
            </div>
          </div>

          {viewMode === 'readable' ? (
            <QuizJsonEditor
              value={quizState.jsonInput}
              onChange={quizActions.setJsonInput}
              onError={(error, line, column) => {
                quizActions.setJsonError(error);
                quizActions.setErrorLine(line);
                quizActions.setErrorColumn(column);
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="text-green-300 font-bold mb-3 flex items-center gap-2">
                  🎯 <span>Live Render View - Matches Quiz Taking 100%</span>
                </div>
                <QuizPreview
                  questions={getParsedQuestions()}
                  media={uploadedMedia}
                  imageSize={quizState.imageSize}
                  currentQuestionIndex={previewQuestionIndex}
                  onQuestionChange={setPreviewQuestionIndex}
                  onImageSizeChange={quizActions.setImageSize}
                />
              </div>
            </div>
          )}
          {quizState.jsonError && (
            <div 
              className="mt-2 p-3 bg-red-900/20 border border-red-500/50 rounded text-red-300 text-sm font-mono whitespace-pre-wrap cursor-pointer hover:bg-red-900/30 transition-colors"
              onDoubleClick={jumpToErrorLine}
              title="Double-click to jump to error"
            >
              {quizState.jsonError}
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
            <div className="mt-4 space-y-3">
              <div className="text-sm font-bold text-terminal-bright">📁 Uploaded Media ({uploadedMedia.length}):</div>
              {uploadedMedia.map((media, idx) => (
                <div key={idx} className="border border-terminal-accent/30 p-4 rounded-lg bg-terminal-accent/5">
                  <div className="flex items-start gap-4">
                    {media.type === 'image' ? (
                      <div className="flex flex-col items-center gap-2">
                        <img 
                          src={media.data} 
                          alt={media.name} 
                          className="w-24 h-24 object-cover rounded border-2 border-gray-500"
                          style={{
                            maxHeight: media.size === 'small' ? '60px' : 
                                     media.size === 'large' ? '120px' : 
                                     media.size === 'xlarge' ? '160px' : '96px',
                            maxWidth: media.size === 'small' ? '80px' : 
                                    media.size === 'large' ? '160px' : 
                                    media.size === 'xlarge' ? '200px' : '120px'
                          }}
                        />
                        <div className="text-xs text-center text-gray-400">
                          Preview at {media.size || 'medium'} size
                        </div>
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-terminal-accent/20 rounded flex items-center justify-center text-3xl border-2 border-gray-500">
                        🔊
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-sm font-bold text-terminal-bright">
                          {media.type === 'image' ? '🖼️' : '🔊'} {media.type.toUpperCase()} #{idx + 1}
                        </p>
                        <p className="text-xs text-terminal-dim truncate">{media.name}</p>
                      </div>
                      
                      {media.type === 'image' && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-terminal-bright">Size in Quiz:</div>
                          <select
                            value={media.size || 'medium'}
                            onChange={(e) => {
                              const newMedia = [...uploadedMedia];
                              newMedia[idx].size = e.target.value as 'small' | 'medium' | 'large' | 'xlarge';
                              setUploadedMedia(newMedia);
                            }}
                            className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded text-xs w-32"
                          >
                            <option value="small">Small (150px)</option>
                            <option value="medium">Medium (300px)</option>
                            <option value="large">Large (450px)</option>
                            <option value="xlarge">X-Large (600px)</option>
                          </select>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyMediaReference(idx, media.type)}
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-1 rounded text-xs font-medium border border-blue-500/30"
                        >
                          📋 Copy [{media.type === 'image' ? 'img' : 'audio'}:{idx + 1}]
                        </button>
                        <button
                          onClick={() => deleteMedia(idx)}
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-3 py-1 rounded text-xs font-medium border border-red-500/30"
                        >
                          🗑️ Delete
                        </button>
                      </div>
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
                  checked={quizState.isPublic}
                  onChange={(e) => quizActions.setIsPublic(e.target.checked)}
                  className="accent-terminal-accent"
                />
                <span>Make quiz public</span>
              </label>
              {quizState.folderPath && (
                <div className="text-xs text-terminal-dim ml-6">
                  💡 Tip: If folder "{quizState.folderPath}" is public, new quizzes will be public by default
                </div>
              )}
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={quizState.randomize}
                onChange={(e) => quizActions.setRandomize(e.target.checked)}
                className="accent-terminal-accent"
              />
              <span>Randomize question order</span>
            </label>

            <div className="flex items-center gap-2">
              <span>Quiz layout:</span>
              <select
                value={quizState.layout}
                onChange={(e) => quizActions.setLayout(e.target.value as 'default' | 'split')}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
              >
                <option value="default">Default (Vertical)</option>
                <option value="split">Split (Question Left, Options Right)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span>Save to folder:</span>
              <select
                value={quizState.folderPath}
                onChange={(e) => quizActions.setFolderPath(e.target.value)}
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
                type="text"
                value={quizState.timeLimit}
                onChange={(e) => quizActions.setTimeLimit(e.target.value)}
                className={`bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24 transition-opacity ${
                  quizState.isTimeLimitAutoCalculated ? 'opacity-50' : ''
                }`}
                placeholder="None"
                title={quizState.isTimeLimitAutoCalculated ? "Auto-calculated from per-question limit" : "Total time for entire quiz"}
              />
              {quizState.isTimeLimitAutoCalculated && (
                <span className="text-blue-400 text-sm">
                  (Auto-calculated: {quizState.timeLimit}s)
                </span>
              )}
              <span className="text-terminal-dim text-sm">
                Total time for entire quiz
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span>Per-question time limit (seconds):</span>
              <input
                type="text"
                value={quizState.perQuestionTimeLimit}
                onChange={(e) => quizActions.setPerQuestionTimeLimit(e.target.value)}
                className={`bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24 ${
                  quizState.perQuestionTimeLimit === "0" || !quizState.perQuestionTimeLimit ? 'opacity-60' : ''
                }`}
                placeholder="0 (disabled)"
              />
              <span className="text-terminal-dim text-sm">
                {quizState.perQuestionTimeLimit === "0" || !quizState.perQuestionTimeLimit 
                  ? "Per-question timer disabled - free navigation" 
                  : "Each question gets this time (locks previous questions)"
                }
              </span>
            </div>

            {(quizState.perQuestionTimeLimit && quizState.perQuestionTimeLimit !== "0") && (
              <div className="text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-400/30 p-2 rounded">
                ⚠️ Per-question timer mode: Once you move to the next question, you cannot go back to previous questions.
              </div>
            )}

            <div className="flex items-center gap-2">
              <span>Question limit (for randomization):</span>
              <input
                type="text"
                value={quizState.customQuestionLimit || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    quizActions.setCustomQuestionLimit(null);
                  } else if (/^\d*$/.test(value)) {
                    if (value === "0") {
                      // Allow typing "0" but don't set it yet
                      return;
                    }
                    const num = parseInt(value);
                    if (!isNaN(num)) {
                      quizActions.setCustomQuestionLimit(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value !== "" && !/^\d+$/.test(value)) {
                    quizActions.setCustomQuestionLimit(1);
                  }
                }}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24"
                placeholder="All"
              />
              <span className="text-terminal-dim text-sm">
                Randomly select this many questions from the total
              </span>
            </div>


            {/* Advanced Features Section */}
            <div className="space-y-4 border-t border-terminal-accent/30 pt-6 mt-6">
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-terminal-bright">🔧 Advanced Features</div>
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 py-2 px-4 rounded font-medium transition-colors"
                >
                  {showAdvancedSettings ? '🔼 Hide Advanced' : '🔽 Show Advanced'}
                </button>
              </div>
              
              <div className="text-sm text-terminal-dim space-y-1 mb-4">
                <div>• <strong>Question Limit:</strong> Randomly select a subset of questions</div>
                <div>• <strong>Multi-Quiz Mode:</strong> Combine questions from multiple existing quizzes</div>
                <div>• <strong>Access Control:</strong> Set private access codes and edit permissions</div>
                <div>• <strong>Time Controls:</strong> Configure quiz and per-question time limits</div>
              </div>

              {showAdvancedSettings && (
                <div className="space-y-6">
              
              {/* Question Limit */}
              <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <div className="font-bold text-terminal-bright">Question Limit</div>
                    <div className="text-sm text-terminal-dim">Limit how many questions to include when randomizing</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={quizState.customQuestionLimit || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        quizActions.setCustomQuestionLimit(null);
                      } else if (/^\\d+$/.test(value)) {
                        const num = parseInt(value);
                        if (num >= 1) {
                          quizActions.setCustomQuestionLimit(num);
                        }
                      }
                    }}
                    className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded w-24"
                    placeholder="All"
                  />
                  <span className="text-terminal-dim">
                    questions {quizState.customQuestionLimit ? `(out of total)` : '(use all questions)'}
                  </span>
                </div>
                <div className="text-xs text-orange-400 mt-2">
                  ⚠️ Requires "Randomize question order" to be enabled
                </div>
              </div>

              {/* Multi-Quiz Merging */}
              <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🔗</span>
                  <div>
                    <div className="font-bold text-terminal-bright">Multi-Quiz Merging</div>
                    <div className="text-sm text-terminal-dim">Combine questions from multiple existing quizzes</div>
                  </div>
                </div>
                
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="multiQuizMode"
                    checked={multiQuizState.multiQuizMode}
                    onChange={(e) => multiQuizActions.setMultiQuizMode(e.target.checked)}
                    className="accent-terminal-accent scale-125"
                  />
                  <span className="font-medium">Enable Multi-Quiz Mode</span>
                </label>

                {multiQuizState.multiQuizMode && (
                  <div className="mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={multiQuizState.preserveQuizOrder}
                        onChange={(e) => multiQuizActions.setPreserveQuizOrder(e.target.checked)}
                        className="accent-terminal-accent scale-110"
                      />
                      <span className="font-medium text-blue-300">🔄 Preserve Quiz Order</span>
                    </label>
                    <div className="text-xs text-terminal-dim mt-1 ml-6 space-y-1">
                      <div>✅ <strong>Enabled:</strong> [Q1 shuffled, Q2 shuffled, Q3 shuffled] - questions stay in quiz groups</div>
                      <div>❌ <strong>Disabled:</strong> [Q1, Q3, Q2 mixed] - fully random mix across all sources</div>
                    </div>
                  </div>
                )}

                {multiQuizState.multiQuizMode && (
                  <div className="space-y-4 border border-yellow-500/30 bg-yellow-500/5 rounded p-4">
                    <div className="flex items-center gap-2 text-yellow-300 font-medium">
                      <span>⚡</span>
                      <span>Quiz Sources Configuration</span>
                    </div>
                    
                    {multiQuizState.quizSources.length === 0 ? (
                      <div className="text-center py-4 text-terminal-dim">
                        <div className="text-2xl mb-2">📝</div>
                        <div>No quiz sources added yet</div>
                        <div className="text-xs">Click "Add First Quiz Source" to get started</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {multiQuizState.quizSources.map((source, idx) => (
                          <div key={idx} className="bg-terminal-accent/10 border border-terminal-accent/30 rounded-lg p-3">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="bg-terminal-accent/30 text-terminal-bright px-2 py-1 rounded text-xs font-bold">
                                SOURCE #{idx + 1}
                              </span>
                              <button
                                onClick={() => multiQuizActions.removeQuizSource(idx)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 px-2 py-1 rounded text-xs"
                              >
                                🗑️ Remove
                              </button>
                            </div>
                            
                            <div className="grid gap-3">
                              <div>
                                <label className="text-sm font-medium text-terminal-bright mb-1 block">Select Quiz:</label>
                                
                                {/* Quiz Selection Button */}
                                <div className="space-y-2 relative">
                                  <button
                                    type="button"
                                    onClick={() => multiQuizActions.openQuizPicker(idx)}
                                    className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded hover:bg-terminal-accent/10 transition-colors text-left"
                                  >
                                    {source.quizId ? (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span className="text-green-400">📚 {availableQuizzes.find(q => q.id === source.quizId)?.title || 'Unknown'}</span>
                                          <div className="text-xs text-terminal-dim">
                                            {availableQuizzes.find(q => q.id === source.quizId)?.questions?.length || 0} questions
                                          </div>
                                        </div>
                                        <span className="text-blue-400">✓</span>
                                      </div>
                                    ) : (
                                      <span className="text-terminal-dim">🔍 Click to choose a quiz...</span>
                                    )}
                                  </button>
                                  
                                  {/* Quiz Picker - RIGHT HERE IN THIS SECTION */}
                                  {multiQuizState.showQuizPicker === idx && (
                                    <div className="mt-4 p-4 bg-terminal border border-terminal-accent rounded-lg shadow-lg">
                                      <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-terminal-bright">Select Quiz</h3>
                                        <button
                                          onClick={() => multiQuizActions.closeQuizPicker()}
                                          className="text-terminal-dim hover:text-terminal-bright text-xl"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                      
                                      {/* Breadcrumb Navigation */}
                                      <div className="flex items-center gap-1 text-xs text-terminal-dim mb-3 p-2 bg-terminal-accent/5 rounded">
                                        <button
                                          onClick={() => multiQuizActions.setCurrentFolder('')}
                                          className="hover:text-terminal-bright transition-colors"
                                        >
                                          🏠 Root
                                        </button>
                                        {multiQuizState.currentFolder.split('/').filter(Boolean).map((folder, folderIdx, arr) => {
                                          const path = arr.slice(0, folderIdx + 1).join('/');
                                          return (
                                            <React.Fragment key={folderIdx}>
                                              <span>/</span>
                                              <button
                                                onClick={() => multiQuizActions.setCurrentFolder(path)}
                                                className="hover:text-terminal-bright transition-colors"
                                              >
                                                📁 {folder}
                                              </button>
                                            </React.Fragment>
                                          );
                                        })}
                                      </div>
                                      
                                      {/* File Manager View */}
                                      <div className="max-h-64 overflow-y-auto border border-terminal-accent/20 rounded bg-terminal-accent/5 p-2">
                                        {/* Folders */}
                                        {folders
                                          .filter(folder => {
                                            const folderPath = folder.parentPath || '';
                                            return folderPath === multiQuizState.currentFolder;
                                          })
                                          .map(folder => {
                                            const fullPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
                                            return (
                                              <div
                                                key={folder.id}
                                                onClick={() => multiQuizActions.setCurrentFolder(fullPath)}
                                                className="flex items-center gap-3 p-2 hover:bg-terminal-accent/20 rounded cursor-pointer transition-colors"
                                              >
                                                <span className="text-lg">📂</span>
                                                <div className="flex-1">
                                                  <div className="font-medium text-terminal-bright text-sm">{folder.name}</div>
                                                  <div className="text-xs text-terminal-dim">Folder</div>
                                                </div>
                                              </div>
                                            );
                                          })
                                        }
                                        
                                        {/* Quizzes */}
                                        {availableQuizzes
                                          .filter(quiz => {
                                            const quizFolderPath = quiz.folderPath || '';
                                            return quizFolderPath === multiQuizState.currentFolder;
                                          })
                                          .map(quiz => (
                                            <div
                                              key={quiz.id}
                                              onClick={() => multiQuizActions.selectQuizForSource(idx, quiz)}
                                              className="flex items-center gap-3 p-2 hover:bg-terminal-accent/20 rounded cursor-pointer transition-colors hover:border-blue-400/50 hover:bg-blue-500/10"
                                            >
                                              <span className="text-lg">📚</span>
                                              <div className="flex-1">
                                                <div className="font-medium text-terminal-bright text-sm">{quiz.title}</div>
                                                <div className="text-xs text-terminal-dim">{quiz.questions?.length || 0} questions</div>
                                              </div>
                                              <div className="text-xs text-terminal-dim bg-terminal-accent/20 px-2 py-1 rounded">
                                                Select
                                              </div>
                                            </div>
                                          ))
                                        }
                                        
                                        {/* Empty folder message */}
                                        {folders.filter(f => (f.parentPath || '') === multiQuizState.currentFolder).length === 0 &&
                                         availableQuizzes.filter(q => (q.folderPath || '') === multiQuizState.currentFolder).length === 0 && (
                                          <div className="text-center p-8 text-terminal-dim">
                                            <div className="text-4xl mb-2">📁</div>
                                            <div>This folder is empty</div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="mt-4 text-xs text-terminal-dim text-center">
                                        Click on folders to navigate, click on quizzes to select
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Clear Selection Button */}
                                  {source.quizId && (
                                    <button
                                      type="button"
                                      onClick={() => multiQuizActions.updateQuizSource(idx, { quizId: '', sectionName: '' })}
                                      className="text-xs text-red-400 hover:text-red-300 underline"
                                    >
                                      Clear selection
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-terminal-bright mb-1 block">
                                  Section Name:
                                </label>
                                <input
                                  type="text"
                                  value={source.sectionName || ''}
                                  onChange={(e) => multiQuizActions.updateQuizSource(idx, { sectionName: e.target.value })}
                                  placeholder={source.quizId ? availableQuizzes.find(q => q.id === source.quizId)?.title || 'Section Name' : 'Section Name'}
                                  className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                                />
                                <div className="text-xs text-terminal-dim mt-1">
                                  {source.quizId ? (
                                    <span>Auto-populated from quiz: "{availableQuizzes.find(q => q.id === source.quizId)?.title}" (you can edit this)</span>
                                  ) : (
                                    <span>Will be auto-populated when you select a quiz</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <label className="text-sm font-medium text-terminal-bright mb-1 block">
                                    {source.fixedCount ? 'Exact Questions:' : 'Minimum Questions:'}
                                  </label>
                                  <input
                                    type="text"
                                    value={source.minQuestions || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      
                                      // Allow empty string or digits (including 0)
                                      if (value === "" || /^\d*$/.test(value)) {
                                        if (value === "") {
                                          multiQuizActions.updateQuizSource(idx, { minQuestions: "" });
                                        } else {
                                          const val = parseInt(value) || 0;
                                          const updates: any = { minQuestions: val };
                                          if (multiQuizState.quizSources[idx].fixedCount) {
                                            updates.maxQuestions = val;
                                          }
                                          multiQuizActions.updateQuizSource(idx, updates);
                                        }
                                      }
                                    }}
                                    onBlur={() => {
                                      // On blur, ensure minimum value of 1
                                      const source = multiQuizState.quizSources[idx];
                                      if (!source.minQuestions || source.minQuestions < 1) {
                                        const updates: any = { minQuestions: 1 };
                                        if (source.fixedCount) {
                                          updates.maxQuestions = 1;
                                        }
                                        multiQuizActions.updateQuizSource(idx, updates);
                                      }
                                    }}
                                    className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                                    placeholder="1"
                                  />
                                </div>
                                
                                {!source.fixedCount && (
                                  <div className="flex-1">
                                    <label className="text-sm font-medium text-terminal-bright mb-1 block">Maximum Questions:</label>
                                    <input
                                      type="text"
                                      value={source.maxQuestions || ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        
                                        // Allow empty string or digits (including 0)
                                        if (value === "" || /^\d*$/.test(value)) {
                                          if (value === "") {
                                            multiQuizActions.updateQuizSource(idx, { maxQuestions: "" });
                                          } else {
                                            const val = parseInt(value) || 0;
                                            multiQuizActions.updateQuizSource(idx, { maxQuestions: val });
                                          }
                                        }
                                      }}
                                      onBlur={() => {
                                        // On blur, ensure minimum value based on minQuestions
                                        const source = multiQuizState.quizSources[idx];
                                        const minVal = Math.max(source.minQuestions || 1, 1);
                                        if (!source.maxQuestions || source.maxQuestions < minVal) {
                                          multiQuizActions.updateQuizSource(idx, { maxQuestions: minVal });
                                        }
                                      }}
                                      className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                                      placeholder="5"
                                    />
                                  </div>
                                )}
                                
                                <div className="flex flex-col items-center gap-2">
                                  <label className="text-xs font-medium text-terminal-bright">Fixed Count?</label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={source.fixedCount}
                                      onChange={(e) => {
                                        const updates: any = { fixedCount: e.target.checked };
                                        if (e.target.checked) {
                                          updates.maxQuestions = multiQuizState.quizSources[idx].minQuestions;
                                        }
                                        multiQuizActions.updateQuizSource(idx, updates);
                                      }}
                                      className="accent-terminal-accent scale-125"
                                    />
                                    <span className="text-xs text-terminal-dim">
                                      {source.fixedCount ? '📌 Exact' : '🎲 Range'}
                                    </span>
                                  </label>
                                </div>
                              </div>
                              
                              {source.quizId && (() => {
                                const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
                                const totalQuestions = sourceQuiz?.questions?.length || 0;
                                const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions;
                                const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions;
                                
                                // Fixed validation: only check individual source limits, not combined totals
                                const isValidMin = minQuestions <= totalQuestions && minQuestions > 0;
                                const isValidMax = maxQuestions <= totalQuestions && maxQuestions >= minQuestions;
                                const isValid = isValidMin && isValidMax;
                                
                                return (
                                  <div className={`text-xs p-2 rounded border ${
                                    isValid 
                                      ? 'text-green-300 bg-green-500/10 border-green-500/30' 
                                      : 'text-red-300 bg-red-500/10 border-red-500/30'
                                  }`}>
                                    {isValid ? (
                                      <>
                                        ✅ Will include {source.fixedCount ? 
                                          `exactly ${minQuestions}` : 
                                          `${minQuestions}-${maxQuestions}`} 
                                        questions from this quiz (has {totalQuestions} total)
                                      </>
                                    ) : (
                                      <>
                                        ❌ Invalid range: Quiz "{sourceQuiz?.title}" has only {totalQuestions} questions. 
                                        {!isValidMin && minQuestions > totalQuestions && (
                                          <> Minimum ({minQuestions}) is too high.</>
                                        )}
                                        {!isValidMax && maxQuestions > totalQuestions && (
                                          <> Maximum ({maxQuestions}) is too high.</>
                                        )}
                                        {minQuestions > maxQuestions && (
                                          <> Min cannot be greater than max.</>
                                        )}
                                        {minQuestions < 1 && (
                                          <> Minimum must be at least 1.</>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <button
                      onClick={multiQuizActions.addQuizSource}
                      className="w-full bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 py-2 px-4 rounded font-medium"
                    >
                      ➕ {multiQuizState.quizSources.length === 0 ? 'Add First Quiz Source' : 'Add Another Quiz Source'}
                    </button>
                    
                    {multiQuizState.quizSources.length > 0 && (() => {
                      const { totalMinQuestions, totalMaxQuestions } = multiQuizActions.getTotalQuestionRange();
                      
                      // Check if all sources are valid
                      const allSourcesValid = multiQuizActions.validateQuizSources(availableQuizzes).length === 0;
                      
                      const isQuestionLimitValid = !quizState.customQuestionLimit || quizState.customQuestionLimit >= totalMinQuestions;
                      
                      return (
                        <div className={`border p-3 rounded ${
                          allSourcesValid && isQuestionLimitValid
                            ? 'bg-blue-500/10 border-blue-500/30' 
                            : 'bg-red-500/10 border-red-500/30'
                        }`}>
                          <div className={`font-medium mb-2 ${
                            allSourcesValid && isQuestionLimitValid 
                              ? 'text-blue-300' 
                              : 'text-red-300'
                          }`}>
                            {allSourcesValid && isQuestionLimitValid ? '📊 Total Questions Summary:' : '⚠️ Configuration Issues:'}
                          </div>
                          
                          {!allSourcesValid && (
                            <div className="text-sm text-red-400 mb-2">
                              ❌ Some quiz sources have invalid ranges. Fix them above.
                            </div>
                          )}
                          
                          {!isQuestionLimitValid && (
                            <div className="text-sm text-red-400 mb-2">
                              ❌ Question limit ({quizState.customQuestionLimit}) is less than minimum required ({totalMinQuestions})
                            </div>
                          )}
                          
                          <div className="text-sm text-terminal-dim">
                            Minimum: <span className={`font-bold ${allSourcesValid ? 'text-green-400' : 'text-red-400'}`}>
                              {totalMinQuestions}
                            </span> questions
                          </div>
                          <div className="text-sm text-terminal-dim">
                            Maximum: <span className={`font-bold ${allSourcesValid ? 'text-blue-400' : 'text-red-400'}`}>
                              {totalMaxQuestions}
                            </span> questions
                          </div>
                          {quizState.customQuestionLimit && (
                            <div className={`text-sm mt-1 ${isQuestionLimitValid ? 'text-yellow-400' : 'text-red-400'}`}>
                              {isQuestionLimitValid ? '⚠️' : '❌'} Final quiz will be limited to {quizState.customQuestionLimit} questions
                            </div>
                          )}
                          
                          {allSourcesValid && isQuestionLimitValid && (
                            <div className="text-sm text-green-400 mt-1">
                              ✅ Ready to create multi-quiz!
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              
                {/* Access Control */}
                <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🔒</span>
                    <div>
                      <div className="font-bold text-terminal-bright">Access Control</div>
                      <div className="text-sm text-terminal-dim">Configure privacy settings and edit permissions</div>
                    </div>
                  </div>
                  
                  {!quizState.isPublic && (
                    <div className="border border-terminal-accent/30 bg-terminal-accent/5 rounded p-3 space-y-2 mb-4">
                      <div className="text-terminal-bright text-sm font-medium">📋 Private Quiz Access Code</div>
                      <div className="text-terminal-dim text-xs">
                        Share this code with specific users to grant them access to your private quiz.
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Access code:</span>
                        <input
                          type="text"
                          value={quizState.accessCode}
                          onChange={(e) => quizActions.setAccessCode(e.target.value)}
                          className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-32"
                          placeholder="e.g., MATH101"
                        />
                        <button
                          onClick={quizActions.generateAccessCode}
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
                      value={quizState.editMode}
                      onChange={(e) => quizActions.setEditMode(e.target.value as 'no_edits' | 'pull_requests')}
                      className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
                    >
                      <option value="no_edits">No edits accepted</option>
                      <option value="pull_requests">Pull requests accepted</option>
                    </select>
                  </div>
                </div>

                {/* Time Controls */}
                <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">⏱️</span>
                    <div>
                      <div className="font-bold text-terminal-bright">Time Controls</div>
                      <div className="text-sm text-terminal-dim">Set quiz-wide or per-question time limits</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span>Per-question time limit (seconds):</span>
                      <input
                        type="text"
                        value={quizState.perQuestionTimeLimit}
                        onChange={(e) => quizActions.setPerQuestionTimeLimit(e.target.value)}
                        className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded w-24"
                        placeholder="None"
                      />
                      <span className="text-terminal-dim text-sm">
                        Each question gets this time limit (disables navigation back)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Preview Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 py-2 px-4 rounded font-medium transition-colors"
              >
                {showPreview ? '👁️ Hide Preview' : '🎯 Show Live Preview'}
              </button>
              <div className="text-sm text-terminal-dim">
                Preview matches actual quiz rendering 100%
              </div>
            </div>
            
            {showPreview && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-terminal-bright">Image Size:</span>
                <select
                  value={quizState.imageSize}
                  onChange={(e) => quizActions.setImageSize(e.target.value as 'small' | 'medium' | 'large' | 'xlarge')}
                  className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
                >
                  <option value="small">Small (150px)</option>
                  <option value="medium">Medium (300px)</option>
                  <option value="large">Large (450px)</option>
                  <option value="xlarge">X-Large (600px)</option>
                </select>
              </div>
            )}
          </div>

          {showPreview && (
            <QuizPreview
              questions={getParsedQuestions()}
              media={uploadedMedia}
              imageSize={quizState.imageSize}
              currentQuestionIndex={previewQuestionIndex}
              onQuestionChange={setPreviewQuestionIndex}
              onImageSizeChange={quizActions.setImageSize}
            />
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <TerminalButton onClick={handleCreate}>{editQuizId ? "update quiz" : "create quiz"}</TerminalButton>
          <TerminalButton onClick={() => navigate(editQuizId ? `/quiz/${editQuizId}/advanced?mode=edit` : `/advanced?mode=create`)}>
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
