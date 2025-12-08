import React, { useState, useEffect, useCallback } from "react";
import { getDisplayQuestionCount } from "@/lib/recursiveQuizResolver";
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
import { QuizSourceManager } from "@/components/quiz-creator/QuizSourceManager";
import { RawJsonEditor } from "@/components/RawJsonEditor";
import { ValidationErrorDisplay, ValidationErrors } from "@/components/ValidationErrorDisplay";
import { LoadingButton } from '@/components/ui/loading-spinner';
import { sanitizeQuizContent, sanitizeUserInput, sanitizeErrorMessage } from '@/lib/security';
import { AIQuizGenerator } from '@/components/AIQuizGenerator';

export const QuizCreator: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editQuizId = searchParams.get("edit");
  const folderParam = searchParams.get("folder");
  
  // Debug the URL and parameters immediately
  console.log('🔍 QuizCreator mounted with URL:', window.location.href);
  console.log('🔍 searchParams object:', searchParams);
  console.log('🔍 All URL parameters:', Object.fromEntries(searchParams.entries()));
  
  // Use extracted hooks
  const { state: quizState, actions: quizActions } = useQuizCreator();
  const { state: multiQuizState, actions: multiQuizActions } = useMultiQuizManager();
  
  // Local component state (not extracted to hooks)
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem[]>([]);
  const [viewMode, setViewMode] = useState<'readable' | 'render'>('readable');
  const [folders, setFolders] = useState<QuizFolder[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [folderHistory, setFolderHistory] = useState<string[]>(['']);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Preview and image size controls
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  
  // Advanced settings visibility
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    if (user) {
      const loadFoldersAndQuizzes = async () => {
        const allQuizzes = await storage.getQuizzes();
        const allFolders = await storage.getFolders();
        
        // Get all accessible quizzes (public + user's own + shared quizzes) - exactly like Dashboard
        const accessibleQuizzes = allQuizzes.filter(
          (q) => q.isPublic || q.creator === user.id || q.sharedWith?.includes(user.id)
        );
        
        // Get all accessible folders (public + user's own + shared folders) - exactly like Dashboard
        const accessibleFolders = allFolders.filter(
          (f) => f.isPublic || f.creator === user.id || f.sharedWith?.includes(user.id)
        );
        
        setAvailableQuizzes(accessibleQuizzes);
        setFolders(accessibleFolders);
        
        // Initialize with folder from URL parameter or root folder
        multiQuizActions.setCurrentFolder('');
      };
      loadFoldersAndQuizzes();
    }
  }, [user]);

  // Separate effect for setting folder path from URL parameter - run immediately when folderParam is available
  useEffect(() => {
    if (folderParam && !editQuizId) {
      const decodedFolder = decodeURIComponent(folderParam);
      console.log('✅ Setting quiz folder path to:', decodedFolder);
      quizActions.setFolderPath(decodedFolder);
    }
  }, [folderParam, editQuizId, quizActions]);

  // Debug effect to verify folder path is set
  useEffect(() => {
    if (folderParam && quizState.folderPath) {
      console.log('✅ Folder path successfully set:', {
        urlParam: folderParam,
        decodedParam: decodeURIComponent(folderParam),
        currentFolderPath: quizState.folderPath
      });
    }
  }, [folderParam, quizState.folderPath]);

  useEffect(() => {
    if (editQuizId) {
      const loadQuiz = async () => {

        const quiz = await storage.getQuizById(editQuizId);
        if (quiz && quiz.creator === user?.id) {
          
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
          quizActions.setTags(quiz.tags || []);
          
          // Handle multi-quiz vs single quiz
          if (quiz.multiQuizSources) {

            multiQuizActions.loadMultiQuizConfiguration(quiz);
            
            // For multi-quiz, only set JSON for manual questions (exclude config placeholder)
            const manualQuestions = quiz.questions?.filter(q => !(q as any)._isMultiQuizConfig) || [];
            if (manualQuestions.length > 0) {
              quizActions.setJsonInput(JSON.stringify(manualQuestions, null, 2));
            } else {
              quizActions.setJsonInput("");
            }
          } else {

            multiQuizActions.setMultiQuizMode(false);
            quizActions.setJsonInput(JSON.stringify(quiz.questions, null, 2));
          }
        }
      };
      loadQuiz();
    }
  }, [editQuizId, user]);

  const handleCreate = async () => {
    setIsCreating(true);
    setCreateError(null); // Clear previous errors

    if (!user) {
      navigate("/");
      setIsCreating(false);
      return;
    }

    if (!quizState.jsonInput && !multiQuizState.multiQuizMode) {
      toast.error("Please provide quiz questions JSON or enable Multi-Quiz Mode");
      setIsCreating(false);
      return;
    }

    if (multiQuizState.multiQuizMode && multiQuizState.quizSources.length === 0) {
      toast.error("Multi-Quiz Mode: Please add at least one quiz source");
      setIsCreating(false);
      return;
    }

    if (!multiQuizState.multiQuizMode && !quizState.jsonInput) {
      toast.error("Please provide quiz questions JSON");
      setIsCreating(false);
      return;
    }

    // Sanitize and validate title
    const sanitizedTitle = sanitizeUserInput(quizState.title);
    const titleValidation = validateInput(quizTitleSchema, sanitizedTitle);
    if (titleValidation.success === false) {
      toast.error(sanitizeErrorMessage(titleValidation.error));
      setIsCreating(false);
      return;
    }
    const validatedTitle = titleValidation.data;

    // Comprehensive multi-quiz validation
    if (multiQuizState.multiQuizMode) {
      if (multiQuizState.quizSources.length === 0) {
        toast.error("Multi-Quiz Mode: Please add at least one quiz source");
        return;
      }

      // Validate each quiz source thoroughly
      let totalValidationErrors: string[] = [];
      
      for (let i = 0; i < multiQuizState.quizSources.length; i++) {
        const source = multiQuizState.quizSources[i];
        
        if (!source.quizId) {
          totalValidationErrors.push(`Source ${i + 1}: No quiz selected`);
          continue;
        }
        
        const sourceQuiz = availableQuizzes.find(q => q.id === source.quizId);
        if (!sourceQuiz) {
          totalValidationErrors.push(`Source ${i + 1}: Selected quiz not found`);
          continue;
        }
        
        // Get recursive question count
        const totalQuestions = await getDisplayQuestionCount(sourceQuiz, storage);
        const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
        const maxQuestions = typeof source.maxQuestions === 'string' ? parseInt(source.maxQuestions) || 0 : source.maxQuestions || 0;
        
        // Basic validation only - let the generation process handle recursive resolution
        if (minQuestions < 1) {
          totalValidationErrors.push(`Source ${i + 1}: Minimum questions must be at least 1 (current: ${minQuestions})`);
        }
        if (minQuestions > maxQuestions) {
          totalValidationErrors.push(`Quiz Source #${i + 1}: Minimum (${minQuestions}) cannot be greater than maximum (${maxQuestions})`);
        }
        if (source.fixedCount && minQuestions !== maxQuestions) {
          totalValidationErrors.push(`Quiz Source #${i + 1}: Fixed count mode requires minimum and maximum to be equal`);
        }
        
        // Note: We don't validate against totalQuestions here because:
        // 1. The recursive resolver will handle nested sources intelligently during generation
        // 2. This matches the improved validation approach in the validation system
        // 3. Question selection happens during generation, not during validation setup
      }
      
      if (totalValidationErrors.length > 0) {

        // Show a detailed error message with all validation issues
        const errorMessage = `❌ Cannot create quiz - Configuration errors found:\n\n${totalValidationErrors.map(error => `• ${error}`).join('\n')}`;
        toast.error(errorMessage, {
          duration: 10000, // Show for 10 seconds
          style: {
            maxWidth: '500px',
            whiteSpace: 'pre-line'
          }
        });
        setIsCreating(false);
        return;
      }

      // Calculate total question ranges for question limit validation
      let totalMinQuestions = 0;
      for (const source of multiQuizState.quizSources) {
        const minQuestions = typeof source.minQuestions === 'string' ? parseInt(source.minQuestions) || 0 : source.minQuestions || 0;
        totalMinQuestions += minQuestions;
      }

      // Validate question limit against total
      if (quizState.customQuestionLimit && quizState.customQuestionLimit < totalMinQuestions) {

        const error = ValidationErrors.questionLimit(quizState.customQuestionLimit, totalMinQuestions);
        quizActions.setValidationErrors([error]);
        toast.error(`❌ Question limit (${quizState.customQuestionLimit}) is less than minimum required questions (${totalMinQuestions}) from your sources`);
        setIsCreating(false);
        return;
      }
      

    } else {

    }

    // Clear previous validation errors
    quizActions.clearValidationErrors();

    // Validate question limit against total questions for single quiz mode
    if (!multiQuizState.multiQuizMode && quizState.customQuestionLimit && quizState.jsonInput) {
      try {
        const questions = JSON.parse(quizState.jsonInput);
        if (Array.isArray(questions) && quizState.customQuestionLimit > questions.length) {
          const error = ValidationErrors.questionLimit(quizState.customQuestionLimit, questions.length);
          quizActions.setValidationErrors([error]);
          toast.error(`❌ Question limit (${quizState.customQuestionLimit}) cannot be greater than total questions (${questions.length})`);
          setIsCreating(false);
          return;
        }
      } catch (e) {
        const error = ValidationErrors.jsonParse(e instanceof Error ? e.message : 'Invalid JSON syntax');
        quizActions.setValidationErrors([error]);
        toast.error("❌ JSON syntax error - check your JSON format");
        setIsCreating(false);
        return;
      }
    }

    try {

      quizActions.setJsonError("");
      quizActions.setErrorLine(null);
      quizActions.setErrorColumn(null);
      
      let questions: any[] = [];
      
      if (multiQuizState.multiQuizMode) {

        
        // For multi-quiz mode, we DON'T generate questions now
        // Instead, we store the configuration and generate questions dynamically when quiz is taken
        
        // Validate that we have at least one source
        if (multiQuizState.quizSources.length === 0) {
          toast.error("Multi-Quiz Mode: Please add at least one quiz source");
          setIsCreating(false);
          return;
        }
        
        // Create a placeholder questions array with configuration metadata
        questions = [{
          q: "Multi-Quiz Configuration",
          a: "This quiz will dynamically generate questions from multiple sources",
          options: [],
          _isMultiQuizConfig: true
        }];
        

        
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

            }
          } catch (e) {

            toast.error("Invalid JSON format for additional questions");
            setIsCreating(false);
            return;
          }
        }
        

        
      } else {

        // Parse JSON for single quiz mode
        if (!quizState.jsonInput || !quizState.jsonInput.trim()) {
          toast.error("Please provide quiz questions JSON");
          setIsCreating(false);
          return;
        }
        questions = JSON.parse(quizState.jsonInput);

      }
      
      // Validate with Zod schema (skip validation for multi-quiz placeholder)

      if (multiQuizState.multiQuizMode && questions.length >= 1 && questions[0]._isMultiQuizConfig) {
        // Skip validation for multi-quiz placeholder

      } else {

        const validation = validateInput(quizQuestionsSchema, questions);
        if (validation.success === false) {

          quizActions.setJsonError(`❌ ${validation.error}`);
          toast.error(validation.error);
          return;
        }

      }
      
      // Use validated data (already validated so type is safe, or use questions directly for multi-quiz)
      let validatedQuestions: any;
      if (multiQuizState.multiQuizMode && questions.length >= 1 && questions[0]._isMultiQuizConfig) {
        // For multi-quiz mode, use questions directly without validation

        validatedQuestions = questions;
      } else {
        // For single quiz mode, use already validated data from above

        const validation = validateInput(quizQuestionsSchema, questions);
        if (validation.success === false) {

          quizActions.setJsonError(`❌ ${validation.error}`);
          toast.error(validation.error);
          setIsCreating(false);
          return;
        }
        validatedQuestions = validation.data;
      }

      // Extract multi-quiz metadata if present
      const multiQuizMetadata = (validatedQuestions as any)._multiQuizMetadata;
      

      
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
            tags: quizState.tags || [],
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
          console.log('Updating quiz with media size:', JSON.stringify(updatedQuiz.media).length, 'bytes');
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
          tags: quizState.tags || [],
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
        

        
        console.log('Saving quiz with media size:', JSON.stringify(quiz.media).length, 'bytes');
        await storage.saveQuiz(quiz);

        
        // Verify the quiz was saved with multi-quiz sources
        if (multiQuizState.multiQuizMode) {
          try {
            const savedQuiz = await storage.getQuizById(quiz.id);
            console.log('Saved quiz verification:', {
              id: savedQuiz?.id,
              title: savedQuiz?.title,
              hasMultiQuizSources: !!savedQuiz?.multiQuizSources,
              multiQuizSourcesFromDB: savedQuiz?.multiQuizSources
            });
          } catch (error) {
            console.error('Error verifying saved quiz:', error);
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
      console.error('Error creating/updating quiz:', error);
      
      const errorMsg = error.message || "Unknown error";
      setCreateError(errorMsg);
      
      // Check if it's a JSON parsing error first
      if (errorMsg.includes('JSON') || errorMsg.includes('position')) {
        handleError(error, { 
          userMessage: "Failed to create quiz. Please check your JSON format.",
          logToConsole: true 
        });
        
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
      } else {
        // Database/network error
        toast.error(errorMsg);
      }
    } finally {
      setIsCreating(false);
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

        {/* Validation Errors Display */}
        {quizState.validationErrors.length > 0 && (
          <ValidationErrorDisplay 
            errors={quizState.validationErrors} 
            className="my-4"
          />
        )}

        {/* Create/Update Error Display */}
        {createError && (
          <div className="my-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
            <div className="text-red-300 font-bold mb-2 flex items-center gap-2">
              🚫 <span>Quiz {editQuizId ? 'Update' : 'Creation'} Failed</span>
            </div>
            <div className="text-red-200 text-sm font-mono whitespace-pre-wrap">
              {createError}
            </div>
            {createError.includes('media data') && (
              <div className="text-yellow-300 text-xs mt-3 p-2 bg-yellow-500/10 border border-yellow-400/30 rounded">
                💡 <strong>Tip:</strong> Try reducing image file sizes or removing some media files. Large media can cause timeouts.
              </div>
            )}
          </div>
        )}


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
                onChange={(e) => {
                  if (e.target.files) {
                    Array.from(e.target.files).forEach(file => {
                      console.log('Processing image file:', file.name);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        if (result && result.startsWith('data:')) {
                          // Generate unique ID for media item
                          const mediaId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                          
                          const newMedia: MediaItem = {
                            name: file.name,
                            type: 'img',
                            data: result,
                            size: 'medium',
                            id: mediaId
                          };
                          
                          // Validate image before adding
                          const testImg = new Image();
                          testImg.onload = () => {
                            setUploadedMedia(prev => [...prev, newMedia]);
                            toast.success(`Image "${file.name}" uploaded successfully!`);
                          };
                          testImg.onerror = () => {
                            console.error('Image validation failed for:', file.name);
                            toast.error(`Failed to validate image ${file.name}`);
                          };
                          testImg.src = result;
                        } else {
                          console.error('Invalid file data for image:', file.name);
                          toast.error(`Failed to process ${file.name} - invalid data format`);
                        }
                      };
                      reader.onerror = () => {
                        console.error('FileReader error for image:', file.name);
                        toast.error(`Failed to read ${file.name}`);
                      };
                      reader.readAsDataURL(file);
                    });
                    // Clear the input
                    e.target.value = '';
                  }
                }}
                className="text-terminal-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-terminal-accent file:text-terminal cursor-pointer"
              />
            </div>
            <div>
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    Array.from(e.target.files).forEach(file => {
                      console.log('Processing audio file:', file.name);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        if (result && result.startsWith('data:')) {
                          // Generate unique ID for media item
                          const mediaId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                          
                          const newMedia: MediaItem = {
                            name: file.name,
                            type: 'audio',
                            data: result,
                            size: 'medium',
                            id: mediaId
                          };
                          
                          setUploadedMedia(prev => [...prev, newMedia]);
                          toast.success(`Audio "${file.name}" uploaded successfully!`);
                        } else {
                          console.error('Invalid file data for audio:', file.name);
                          toast.error(`Failed to process ${file.name} - invalid data format`);
                        }
                      };
                      reader.onerror = () => {
                        console.error('FileReader error for audio:', file.name);
                        toast.error(`Failed to read ${file.name}`);
                      };
                      reader.readAsDataURL(file);
                    });
                    // Clear the input
                    e.target.value = '';
                  }
                }}
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
                    {media.type === 'img' ? (
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
                          {media.type === 'img' ? '🖼️' : '🔊'} {media.type === 'img' ? 'IMAGE' : 'AUDIO'} #{idx + 1}
                        </p>
                        <p className="text-xs text-terminal-dim truncate">{media.name}</p>
                      </div>
                      
                      {media.type === 'img' && (
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
                          onClick={() => {
                            const ref = `[${media.type}:${idx + 1}]`;
                            navigator.clipboard.writeText(ref);
                            toast.success(`Copied ${ref} to clipboard!`);
                          }}
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-1 rounded text-xs font-medium border border-blue-500/30"
                        >
                          📋 Copy [{media.type}:{idx + 1}]
                        </button>
                        <button
                          onClick={() => handleMediaDelete(idx)}
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

            {/* Tags Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Tags:</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {(quizState.tags || []).map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-terminal-accent/20 text-terminal-accent px-2 py-1 rounded-md text-sm"
                  >
                    <span>🏷️ {tag}</span>
                    <button
                      onClick={() => {
                        const newTags = (quizState.tags || []).filter((_, i) => i !== index);
                        quizActions.setTags(newTags);
                      }}
                      className="text-red-400 hover:text-red-300 ml-1"
                      title="Remove tag"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  ref={(ref) => { 
                    if (ref) {
                      (window as any).tagInputRef = ref; 
                    }
                  }}
                  type="text"
                  placeholder="Enter tags separated by commas: GATE, Computer Science, Easy..."
                  className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const addTagsFromInput = () => {
                        const value = input.value.trim();
                        if (value) {
                          // Split by comma and clean up each tag
                          const newTagsToAdd = value
                            .split(',')
                            .map(tag => tag.trim())
                            .filter(tag => tag.length > 0 && !(quizState.tags || []).includes(tag));
                          
                          if (newTagsToAdd.length > 0) {
                            const updatedTags = [...(quizState.tags || []), ...newTagsToAdd];
                            quizActions.setTags(updatedTags);
                            input.value = '';
                          }
                        }
                      };
                      addTagsFromInput();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = (window as any).tagInputRef as HTMLInputElement;
                    if (input) {
                      const value = input.value.trim();
                      if (value) {
                        // Split by comma and clean up each tag
                        const newTagsToAdd = value
                          .split(',')
                          .map(tag => tag.trim())
                          .filter(tag => tag.length > 0 && !(quizState.tags || []).includes(tag));
                        
                        if (newTagsToAdd.length > 0) {
                          const updatedTags = [...(quizState.tags || []), ...newTagsToAdd];
                          quizActions.setTags(updatedTags);
                          input.value = '';
                        }
                      }
                    }
                  }}
                  className="bg-terminal-accent hover:bg-terminal-accent/80 text-terminal-background px-3 py-1 rounded text-sm font-medium"
                >
                  Add Tags
                </button>
              </div>
              
              <div className="text-xs text-terminal-dim">
                💡 Separate multiple tags with commas. Suggested: GATE, Computer Science, Electronics, Mathematics, Easy, Medium, Hard, Previous Year
              </div>
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
                <div className="text-lg font-bold text-terminal-bright">🔧 Advanced Customization</div>
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 py-2 px-4 rounded font-medium transition-colors"
                >
                  {showAdvancedSettings ? '🔼 Hide Advanced' : '🔽 Show Advanced'}
                </button>
              </div>

              {showAdvancedSettings && (
                <div className="space-y-6 mt-6">
                  {/* Multi-Quiz Mode */}
                  <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🔗</span>
                      <div>
                        <div className="font-bold text-terminal-bright">Multi-Quiz Composition</div>
                        <div className="text-sm text-terminal-dim">Combine questions from multiple quizzes</div>
                      </div>
                    </div>
                    
                    <label className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
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
                          <div>✅ <strong>Enabled:</strong> Questions stay grouped by source quiz</div>
                          <div>❌ <strong>Disabled:</strong> Fully random mix across all sources</div>
                        </div>
                      </div>
                    )}

                    {multiQuizState.multiQuizMode && (
                      <QuizSourceManager
                        quizSources={multiQuizState.quizSources}
                        availableQuizzes={availableQuizzes}
                        folders={folders}
                        showQuizPicker={multiQuizState.showQuizPicker}
                        currentFolder={multiQuizState.currentFolder}
                        onAddSource={multiQuizActions.addQuizSource}
                        onRemoveSource={multiQuizActions.removeQuizSource}
                        onUpdateSource={multiQuizActions.updateQuizSource}
                        onOpenPicker={multiQuizActions.openQuizPicker}
                        onClosePicker={multiQuizActions.closeQuizPicker}
                        onFolderChange={multiQuizActions.setCurrentFolder}
                        onQuizSelect={multiQuizActions.selectQuizForSource}
                      />
                    )}
                  </div>
                  

                    {/* Other Advanced Settings */}
                    <div className="space-y-6">
                      {/* Access Control */}
                      <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">🔐</span>
                          <div>
                            <div className="font-bold text-terminal-bright">Access Control</div>
                            <div className="text-sm text-terminal-dim">Configure privacy settings and edit permissions</div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {!quizState.isPublic && (
                            <div className="border border-terminal-accent/30 bg-terminal-accent/5 rounded p-3 space-y-2">
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
                            {quizState.perQuestionTimeLimit && parseInt(quizState.perQuestionTimeLimit) > 0 && (
                              <span className="text-green-400 text-sm ml-2">
                                ≈ {Math.ceil((parseInt(quizState.perQuestionTimeLimit) * (getParsedQuestions()?.length || 0)) / 60)}min total
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
          <LoadingButton
            isLoading={isCreating}
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-terminal-accent hover:bg-terminal-accent-hover text-terminal font-bold py-2 px-4 rounded transition-colors duration-200 border border-terminal-accent"
            loadingText={editQuizId ? "Updating Quiz..." : "Creating Quiz..."}
          >
            {editQuizId ? "Update Quiz" : "Create Quiz"}
          </LoadingButton>
          <TerminalButton onClick={() => navigate(editQuizId ? `/quiz/${editQuizId}/advanced?mode=edit` : `/advanced?mode=create`)}>
            🔧 advanced settings
          </TerminalButton>
          <TerminalButton onClick={() => navigate(editQuizId ? "/my-quizzes" : "/dashboard")}>cancel</TerminalButton>
        </div>
          </div>
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
            <div className="text-terminal-bright">Code Formatting (NEW):</div>
            <div>• <span className="text-terminal-accent">`inline code`</span> → Inline code with monospace font</div>
            <div>• <span className="text-terminal-accent">```block code```</span> → Code block with background</div>
            <div>• <span className="text-terminal-accent">````large code````</span> → Large code block format</div>
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
          <div className="ml-6 text-sm space-y-1 text-terminal-dim mt-3">
            <div className="text-terminal-bright">Special Characters & Formatting:</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="text-terminal-accent font-semibold">Text Formatting:</div>
                <div>• <span className="text-terminal-accent">**bold**</span> or <span className="text-terminal-accent">__bold__</span> → <strong>bold</strong></div>
                <div>• <span className="text-terminal-accent">*italic*</span> or <span className="text-terminal-accent">_italic_</span> → <em>italic</em></div>
                <div>• <span className="text-terminal-accent">***bold+italic***</span> → <strong><em>bold+italic</em></strong></div>
                <div>• <span className="text-terminal-accent">`inline code`</span> → <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 3px', borderRadius: '2px' }}>inline code</code></div>
                <div>• <span className="text-terminal-accent">```block code```</span> → <pre style={{ background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', margin: '4px 0' }}>block code</pre></div>
                <div>• <span className="text-terminal-accent">````large code````</span> → <pre style={{ background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', margin: '4px 0' }}>large code</pre></div>
              </div>
              <div>
                <div className="text-terminal-accent font-semibold">Escape Sequences:</div>
                <div>• <span className="text-terminal-accent">\\n</span> → Line break</div>
                <div>• <span className="text-terminal-accent">\\t</span> → Tab (4 spaces)</div>
                <div>• <span className="text-terminal-accent">\\\\n</span> → Literal "\\n" text</div>
                <div>• <span className="text-terminal-accent">\\\\*</span> → Literal "\\*" text</div>
                <div>• <span className="text-terminal-accent">//n</span> → Works in LaTeX (fixed)</div>
                <div>• <span className="text-terminal-accent">//</span> → Works in LaTeX (fixed)</div>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-terminal-accent font-semibold">Greek Letters & Symbols:</div>
              <div>• <span className="text-terminal-accent">\\alpha \\beta \\pi \\sigma</span> → α β π σ</div>
              <div>• <span className="text-terminal-accent">\\rightarrow \\leftarrow \\infinity</span> → → ← ∞</div>
              <div>• <span className="text-terminal-accent">\\degree \\plusminus \\multiply \\divide</span> → ° ± × ÷</div>
            </div>
            <div className="text-yellow-400 mt-3 p-2 bg-yellow-400/10 rounded">
              <div className="font-semibold">JSON Examples:</div>
              <div className="font-mono text-xs mt-1 space-y-1">
                <div>{'{"q":"Line 1\\nLine 2\\n**Bold** and ***bold+italic***","o":["Option A","Option B"],"a":0}'}</div>
                <div>{'{"q":"Inline `code` and ```\\nblock code\\n``` work","o":["A","B"],"a":0}'}</div>
                <div>{'{"q":"LaTeX: $x^2 + y^2 = z^2$ and \\\\alpha works","o":["A","B"],"a":0}'}</div>
              </div>
            </div>
            <div className="text-green-400 mt-2 p-2 bg-green-400/10 rounded">
              <div className="font-semibold">These render as:</div>
              <div className="space-y-2">
                <div>Line 1<br />Line 2<br /><strong>Bold</strong> and <strong><em>bold+italic</em></strong></div>
                <div>Inline <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 3px', borderRadius: '2px' }}>code</code> and <pre style={{ background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', margin: '4px 0', display: 'inline-block' }}>block code</pre> work</div>
                <div>LaTeX: <em>x² + y² = z²</em> and α works</div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

    </Terminal>
  );
};
