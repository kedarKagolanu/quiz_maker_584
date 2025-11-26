import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { LatexRenderer } from "@/components/LatexRenderer";
import { storage } from "@/lib/storage";
import { Quiz, QuizQuestion, QuizAttempt } from "@/types/quiz";
import { toast } from "sonner";
import { soundEffects } from "@/lib/soundEffects";
import { generateMultiQuizQuestions, MultiQuizGenerationResult } from "@/lib/multiQuizGenerator";

export const QuizTaker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeTaken, setTimeTaken] = useState<number[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [quizStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [hasPerQuestionTimer, setHasPerQuestionTimer] = useState(false);
  const [questionStatus, setQuestionStatus] = useState<('unattempted' | 'seen' | 'attempted' | 'review')[]>([]);
  const [markedForReview, setMarkedForReview] = useState<boolean[]>([]);
  const [userLayout, setUserLayout] = useState<'default' | 'split' | null>(null);
  const [navPosition, setNavPosition] = useState<'left' | 'right' | 'bottom'>('left');
  const [multiQuizMetadata, setMultiQuizMetadata] = useState<MultiQuizGenerationResult['metadata'] | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [questionSections, setQuestionSections] = useState<{title: string, questions: QuizQuestion[], startIndex: number}[]>([]);

  useEffect(() => {
    if (!id) return;
    
    const loadQuiz = async () => {
      const fetchedQuiz = await storage.getQuizById(id);
      if (!fetchedQuiz || !user) {
        navigate("/dashboard");
        return;
      }

      // Check access permissions
      if (!fetchedQuiz.isPublic && fetchedQuiz.creator !== user.id) {
        if (!fetchedQuiz.accessCode) {
          toast.error("This quiz is private");
          navigate("/dashboard");
          return;
        }
        
        // Check if user has provided access code
        const providedCode = prompt("This quiz requires an access code:");
        if (!providedCode || providedCode !== fetchedQuiz.accessCode) {
          toast.error("Invalid access code");
          navigate("/dashboard");
          return;
        }
      }

      // Check for custom settings in URL params
      const urlParams = new URLSearchParams(location.search);
      const customTimeLimit = urlParams.get('timeLimit');
      const customPerQuestionTimeLimit = urlParams.get('perQuestionTimeLimit');
      const customRandomize = urlParams.get('randomize');
      const questionLimit = urlParams.get('questionLimit');
      const multiQuizMode = urlParams.get('multiQuizMode');
      const quizSources = urlParams.get('quizSources');
      
      // Apply custom settings temporarily
      let quizWithCustomSettings = { ...fetchedQuiz };
      if (customTimeLimit) {
        quizWithCustomSettings.timeLimit = parseInt(customTimeLimit);
        console.log('🎯 Applied custom time limit:', customTimeLimit);
      }
      if (customPerQuestionTimeLimit) {
        quizWithCustomSettings.perQuestionTimeLimit = parseInt(customPerQuestionTimeLimit);
        console.log('🎯 Applied custom per-question time limit:', customPerQuestionTimeLimit);
      }
      if (customRandomize) {
        quizWithCustomSettings.randomize = customRandomize === 'true';
        console.log('🎯 Applied custom randomization:', customRandomize);
      }

      let finalQuestions = [...quizWithCustomSettings.questions];

      // Check if this is a multi-quiz (either from stored config or URL params)
      const isMultiQuiz = quizWithCustomSettings.multiQuizSources || (multiQuizMode === 'true' && quizSources);
      
      if (isMultiQuiz) {
        setIsGeneratingQuestions(true);
        let loadingToast: string | number | null = null;
        
        try {
          if (quizWithCustomSettings.multiQuizSources) {
            loadingToast = toast.loading("🎲 Generating questions from multiple sources...", { duration: Infinity });
            
            // Use stored multi-quiz configuration
            console.log('🎯 Using stored multi-quiz configuration');
            const generationResult = await generateMultiQuizQuestions(quizWithCustomSettings, storage);
            
            if (generationResult) {
              setMultiQuizMetadata(generationResult.metadata);
              finalQuestions = generationResult.questions;
              
              // Update quiz with merged media if available
              if ((generationResult as any).mergedMedia) {
                // Properly merge media into the quiz object
                const mergedMedia = (generationResult as any).mergedMedia;
                quizWithCustomSettings = {
                  ...quizWithCustomSettings,
                  media: mergedMedia
                };
                console.log(`📁 Updated quiz media: ${mergedMedia.length} items`);
                console.log(`📁 Media details:`, mergedMedia);
              } else {
                console.warn(`⚠️ No merged media found in generation result`);
              }
              
              // Properly dismiss the loading toast and show success
              if (loadingToast) {
                toast.dismiss(loadingToast);
              }
              toast.success(`🎉 Generated ${finalQuestions.length} questions from ${generationResult.metadata.sources.length} sources!`, {
                duration: 3000
              });
              console.log('🎯 Generated questions:', finalQuestions.length);
            } else {
              throw new Error('Failed to generate multi-quiz questions');
            }
          } else if (multiQuizMode === 'true' && quizSources) {
            // Use URL-based multi-quiz mode (legacy)
            console.log('🎯 Using URL-based multi-quiz mode');
            const sources = JSON.parse(quizSources);
            finalQuestions = await buildMultiQuizQuestions(sources);
            console.log('🎯 Built multi-quiz with', finalQuestions.length, 'questions');
          }
        } catch (error) {
          console.error('❌ Failed to generate multi-quiz:', error);
          if (loadingToast) {
            toast.dismiss(loadingToast);
          }
          toast.error('Failed to generate quiz questions. Using original configuration.');
          finalQuestions = [...quizWithCustomSettings.questions];
        } finally {
          setIsGeneratingQuestions(false);
        }
      } else if (questionLimit) {
        // Handle single quiz question limit
        const limit = parseInt(questionLimit);
        if (limit > 0 && limit < finalQuestions.length) {
          finalQuestions = finalQuestions.sort(() => Math.random() - 0.5).slice(0, limit);
          console.log('🎯 Limited questions to:', limit);
        }
      }

      // For multi-quiz, create sections based on source quizzes
      let qs = finalQuestions;
      let sections: {title: string, questions: QuizQuestion[], startIndex: number}[] = [];
      
      if (quizWithCustomSettings.multiQuizSources) {
        console.log('📚 Creating sections for multi-quiz');
        console.log('📚 Quiz has multiQuizSources:', quizWithCustomSettings.multiQuizSources);
        console.log('📚 MultiQuizMetadata:', multiQuizMetadata);
        
        let currentIndexTracker = 0;
        
        // ALWAYS create sections for multi-quiz, regardless of metadata availability
        if (multiQuizMetadata?.sources) {
          // Use metadata if available
          console.log('📚 Using multiQuizMetadata for section creation');
          
          // Group questions by source quiz to create sections
          const sourceMap = new Map<string, QuizQuestion[]>();
          finalQuestions.forEach(q => {
            const sourceId = (q as any)._sourceQuiz || 'unknown';
            if (!sourceMap.has(sourceId)) {
              sourceMap.set(sourceId, []);
            }
            sourceMap.get(sourceId)!.push(q);
          });
          
          multiQuizMetadata.sources.forEach((sourceInfo, idx) => {
            const sourceQuestions = sourceMap.get(sourceInfo.quizId) || [];
            if (sourceQuestions.length > 0) {
              // Try to get custom section name from quiz configuration
              const sourceConfig = quizWithCustomSettings.multiQuizSources?.sources?.find(s => s.quizId === sourceInfo.quizId);
              const sectionTitle = sourceConfig?.sectionName || sourceInfo.quizTitle || `Quiz ${idx + 1}`;
              
              console.log(`🎯 Creating section: "${sectionTitle}" for source ${sourceInfo.quizId}`);
              console.log(`🎯 Source config:`, sourceConfig);
              console.log(`🎯 Source info:`, sourceInfo);
              
              sections.push({
                title: sectionTitle,
                questions: sourceQuestions,
                startIndex: currentIndexTracker
              });
              currentIndexTracker += sourceQuestions.length;
            }
          });
        } else {
          // Fallback: create sections based on multiQuizSources configuration directly
          console.log('📚 No metadata available, creating sections from quiz configuration');
          
          if (quizWithCustomSettings.multiQuizSources.sources) {
            const questionsPerSource = Math.ceil(finalQuestions.length / quizWithCustomSettings.multiQuizSources.sources.length);
            
            quizWithCustomSettings.multiQuizSources.sources.forEach((sourceConfig, idx) => {
              const startIdx = idx * questionsPerSource;
              const endIdx = Math.min(startIdx + questionsPerSource, finalQuestions.length);
              const sourceQuestions = finalQuestions.slice(startIdx, endIdx);
              
              if (sourceQuestions.length > 0) {
                const sectionTitle = sourceConfig.sectionName || `Section ${idx + 1}`;
                
                console.log(`🎯 Creating fallback section: "${sectionTitle}"`);
                
                sections.push({
                  title: sectionTitle,
                  questions: sourceQuestions,
                  startIndex: currentIndexTracker
                });
                currentIndexTracker += sourceQuestions.length;
              }
            });
          }
        }
        
        // Apply proper randomization within sections if enabled, but keep sections separate
        if (quizWithCustomSettings.randomize) {
          sections.forEach(section => {
            // Use Fisher-Yates shuffle algorithm for true randomization
            for (let i = section.questions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [section.questions[i], section.questions[j]] = [section.questions[j], section.questions[i]];
            }
          });
          console.log('🔀 Applied proper Fisher-Yates randomization within each section');
        }
        
        // Flatten sections back to questions array
        qs = sections.flatMap(section => section.questions);
        setQuestionSections(sections);
        
        console.log(`📚 Created ${sections.length} sections:`, sections.map(s => `${s.title}: ${s.questions.length} questions`));
      } else {
        // Regular quiz - apply proper randomization
        if (quizWithCustomSettings.randomize) {
          // Use Fisher-Yates shuffle algorithm for true randomization
          qs = [...finalQuestions];
          for (let i = qs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [qs[i], qs[j]] = [qs[j], qs[i]];
          }
          console.log('🔀 Applied proper Fisher-Yates randomization for regular quiz');
        } else {
          qs = finalQuestions;
        }
        
        // Create a single section for regular quiz
        if (qs.length > 0) {
          sections = [{
            title: quizWithCustomSettings.title || 'Quiz',
            questions: qs,
            startIndex: 0
          }];
          setQuestionSections(sections);
        }
      }
      
      // Ensure we have valid questions before proceeding
      if (!qs || qs.length === 0) {
        console.error('❌ No questions available after processing');
        toast.error('No questions available for this quiz');
        navigate('/dashboard');
        return;
      }
      
      // Update the quiz state with the final configuration including merged media
      setQuiz(quizWithCustomSettings);
      setQuestions(qs);
      
      console.log(`🎯 Final quiz state - Media items: ${quizWithCustomSettings.media?.length || 0}`);
      console.log(`🎯 Final quiz questions: ${qs.length}`);
      console.log(`🎯 Sample question structure:`, qs[0]);
      console.log(`🎯 Quiz title: ${quizWithCustomSettings.title}`);
      console.log(`🎯 Question sections:`, sections);
      
      setAnswers(new Array(qs.length).fill(-1));
      setTimeTaken(new Array(qs.length).fill(0));
      setQuestionStatus(new Array(qs.length).fill('unattempted'));
      setMarkedForReview(new Array(qs.length).fill(false));
      setUserLayout(fetchedQuiz.layout || 'default');
      soundEffects.quizStart();

      // Determine quiz mode:
      // Mode 1: Quiz-wide timer (quiz.timeLimit set) - revisits allowed
      // Mode 2: No time limit (no quiz.timeLimit and no perQuestionTimeLimit) - revisits allowed
      // Mode 3: Per-question timer (quiz.perQuestionTimeLimit set AND > 0) - no revisits, one attempt per question
      const hasPerQuestionTimer = !!(fetchedQuiz.perQuestionTimeLimit && fetchedQuiz.perQuestionTimeLimit > 0);
      setHasPerQuestionTimer(hasPerQuestionTimer);
      
      console.log(`🎯 Quiz timer mode determined:`, {
        timeLimit: fetchedQuiz.timeLimit,
        perQuestionTimeLimit: fetchedQuiz.perQuestionTimeLimit,
        hasPerQuestionTimer: hasPerQuestionTimer,
        mode: hasPerQuestionTimer ? 'Per-question timer (locked navigation)' : 
              fetchedQuiz.timeLimit ? 'Quiz-wide timer (free navigation)' : 
              'No time limit (free navigation)'
      });

      // Set quiz-wide timer only for Mode 1 (not Mode 3)
      if (fetchedQuiz.timeLimit && !hasPerQuestionTimer) {
        setTimeLeft(fetchedQuiz.timeLimit);
      }
      
      // Set per-question timer for Mode 3 (only if > 0)
      if (fetchedQuiz.perQuestionTimeLimit && fetchedQuiz.perQuestionTimeLimit > 0) {
        setQuestionTimeLeft(fetchedQuiz.perQuestionTimeLimit);
      } else {
        setQuestionTimeLeft(null);
      }
    };
    
    loadQuiz();
  }, [id, user, navigate]);

  const buildMultiQuizQuestions = async (sources: any[]) => {
    const allQuestions: QuizQuestion[] = [];
    
    for (const source of sources) {
      const sourceQuiz = await storage.getQuizById(source.quizId);
      if (!sourceQuiz) continue;
      
      let questionsToTake: number;
      if (source.fixedCount) {
        questionsToTake = source.minQuestions;
      } else {
        questionsToTake = Math.floor(Math.random() * (source.maxQuestions - source.minQuestions + 1)) + source.minQuestions;
      }
      
      const shuffledQuestions = [...sourceQuiz.questions].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffledQuestions.slice(0, questionsToTake);
      allQuestions.push(...selectedQuestions);
    }
    
    return allQuestions;
  };

  useEffect(() => {
    // Warn user before navigating away
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((t) => {
          if (t === 30 || t === 10) {
            soundEffects.timerWarning();
          }
          return t! > 0 ? t! - 1 : 0;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft]);

  useEffect(() => {
    if (quiz?.perQuestionTimeLimit && quiz.perQuestionTimeLimit > 0) {
      setQuestionTimeLeft(quiz.perQuestionTimeLimit);
    } else {
      setQuestionTimeLeft(null);
    }
    setQuestionStartTime(Date.now());
  }, [currentIndex, quiz]);

  useEffect(() => {
    if (questionTimeLeft !== null && questionTimeLeft > 0 && quiz) {
      const timer = setInterval(() => {
        setQuestionTimeLeft((t) => {
          if (t === 5) {
            soundEffects.timerWarning();
          }
          return t! > 0 ? t! - 1 : 0;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else if (questionTimeLeft === 0) {
      handleNext();
    }
  }, [questionTimeLeft, quiz]);

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
    
    const newStatus = [...questionStatus];
    newStatus[currentIndex] = 'attempted';
    setQuestionStatus(newStatus);
    soundEffects.buttonClick();
  };

  const toggleMarkForReview = () => {
    const newMarked = [...markedForReview];
    newMarked[currentIndex] = !newMarked[currentIndex];
    setMarkedForReview(newMarked);
  };

  const jumpToQuestion = (index: number) => {
    // In per-question timer mode, don't allow jumping to previous questions
    if (hasPerQuestionTimer && index < currentIndex) {
      return;
    }

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const newTimeTaken = [...timeTaken];
    newTimeTaken[currentIndex] += timeSpent;
    setTimeTaken(newTimeTaken);
    
    const newStatus = [...questionStatus];
    if (newStatus[index] === 'unattempted') {
      newStatus[index] = 'seen';
    }
    setQuestionStatus(newStatus);
    
    setCurrentIndex(index);
    soundEffects.navigate();
  };

  const handleNext = () => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const newTimeTaken = [...timeTaken];
    newTimeTaken[currentIndex] += timeSpent;
    setTimeTaken(newTimeTaken);

    if (currentIndex < questions.length - 1) {
      const newStatus = [...questionStatus];
      const nextIndex = currentIndex + 1;
      if (newStatus[nextIndex] === 'unattempted') {
        newStatus[nextIndex] = 'seen';
      }
      setQuestionStatus(newStatus);
      setCurrentIndex(nextIndex);
      soundEffects.navigate();
    } else {
      if (hasPerQuestionTimer) {
        handleSubmit();
      } else {
        setShowReview(true);
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex === 0 || hasPerQuestionTimer) return;
    
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const newTimeTaken = [...timeTaken];
    newTimeTaken[currentIndex] += timeSpent;
    setTimeTaken(newTimeTaken);
    setCurrentIndex(currentIndex - 1);
    soundEffects.navigate();
  };

  const handleJumpToQuestion = (index: number) => {
    jumpToQuestion(index);
    setShowReview(false);
  };

  const getQuestionStatus = (index: number) => {
    if (markedForReview[index]) return 'review';
    if (answers[index] !== -1) return 'attempted';
    if (questionStatus[index] === 'seen') return 'seen';
    return 'not-visited';
  };

  const getQuestionStatusLabel = (index: number) => {
    if (markedForReview[index]) return 'Marked for Review';
    if (answers[index] !== -1) return 'Attempted';
    if (questionStatus[index] === 'seen') return 'Seen but not attempted';
    return 'Not visited';
  };

  const handleSubmit = async () => {
    if (!user || !quiz) return;

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const finalTimeTaken = [...timeTaken];
    finalTimeTaken[currentIndex] = timeSpent;

    const score = answers.reduce((acc, ans, idx) => {
      return acc + (ans === questions[idx].a ? 1 : 0);
    }, 0);
    const scorePercentage = (score / questions.length) * 100;

    const attemptId = Date.now().toString();
    const attempt: QuizAttempt = {
      id: attemptId,
      quizId: quiz.id,
      userId: user.id,
      answers,
      timeTaken: finalTimeTaken,
      totalTime: Math.floor((Date.now() - quizStartTime) / 1000),
      score: scorePercentage,
      completedAt: Date.now(),
    };

    // Store the actual questions used for this attempt (important for multi-quiz)
    if (quiz.multiQuizSources || questions.length !== quiz.questions.length) {
      const attemptKey = `quiz_attempt_${attemptId}_questions`;
      const questionsData = {
        questions: questions,
        media: quiz.media,
        metadata: multiQuizMetadata
      };
      localStorage.setItem(attemptKey, JSON.stringify(questionsData));
      console.log(`💾 Stored ${questions.length} questions for attempt ${attemptId}`);
    }

    await storage.saveAttempt(attempt);
    soundEffects.quizComplete();
    toast.success(`Quiz completed! Score: ${scorePercentage.toFixed(1)}%`);
    navigate(`/results/${attempt.id}`);
  };

  if (!quiz || questions.length === 0) {
    if (isGeneratingQuestions) {
      return (
        <Terminal title="Generating Quiz...">
          <div className="space-y-4 text-center">
            <TerminalLine prefix="#">🎲 Generating Dynamic Quiz</TerminalLine>
            <div className="text-terminal-dim space-y-2">
              <div className="animate-pulse">Selecting questions from multiple sources...</div>
              <div className="text-sm">This may take a moment for large quizzes</div>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
            </div>
          </div>
        </Terminal>
      );
    }
    return null;
  }

  const currentQuestion = questions[currentIndex];
  const activeLayout = userLayout || quiz.layout || 'default';

  if (showReview) {
    return (
      <Terminal title={`quiz: ${quiz.title} - Review`}>
        <div className="space-y-4">
          <TerminalLine prefix="#">Review Your Answers</TerminalLine>
          
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="quiz-answer-option"
                data-selected={answers[currentIndex] === idx}
                onClick={() => handleJumpToQuestion(idx)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="text-terminal-bright">
                      Q{idx + 1}: <LatexRenderer text={q.q} media={quiz.media} />
                    </span>
                    <div className="text-sm text-terminal-dim mt-1">
                      Your answer: {answers[idx] >= 0 ? `${String.fromCharCode(65 + answers[idx])}. ${q.o[answers[idx]]}` : "Not answered"}
                    </div>
                    <div className="text-sm text-terminal-dim">
                      Time spent: {timeTaken[idx]}s
                    </div>
                  </div>
                  <span className={answers[idx] >= 0 ? "text-terminal-accent" : "text-destructive"}>
                    {answers[idx] >= 0 ? "✓" : "!"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <TerminalButton onClick={() => setShowReview(false)}>back to quiz</TerminalButton>
            <TerminalButton onClick={handleSubmit}>final submit</TerminalButton>
          </div>
        </div>
      </Terminal>
    );
  }

  const getCurrentSection = () => {
    if (questionSections.length === 0) return null;
    for (let i = questionSections.length - 1; i >= 0; i--) {
      if (currentIndex >= questionSections[i].startIndex) {
        return i;
      }
    }
    return 0;
  };

  const renderQuestionNav = () => {
    const currentSectionIndex = getCurrentSection();
    
    return (
      <div className={`border border-terminal-accent/30 rounded p-4 shrink-0 ${navPosition === 'bottom' ? 'w-full' : 'w-80'}`}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-bold text-terminal-bright">Navigation</div>
          <select
            value={navPosition}
            onChange={(e) => setNavPosition(e.target.value as 'left' | 'right' | 'bottom')}
            className="text-xs bg-terminal-accent/20 px-2 py-1 rounded border border-terminal-accent/30"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>

        {/* Improved Questions Navigation Layout */}
        <div className="space-y-4">
          {/* Only show sections if preserve quiz order is enabled AND we have multiple sections */}
          {quiz?.multiQuizSources && quiz?.multiQuizSources?.preserveQuizOrder && questionSections.length > 1 ? (
            // Multi-section quiz: Clean vertical layout with proper spacing
            <div>
              <div className="text-xs font-semibold text-terminal-bright mb-3 pb-2 border-b border-terminal-accent/30">
                📚 Quiz Sections
              </div>
              
              {/* Section Navigation Cards */}
              <div className="space-y-4">
                {questionSections.map((section, sectionIdx) => {
                  const currentSectionIndex = getCurrentSection();
                  const isCurrentSection = currentSectionIndex === sectionIdx;
                  return (
                    <div 
                      key={sectionIdx} 
                      className={`border rounded-lg p-3 transition-all ${
                        isCurrentSection
                          ? 'border-terminal-accent bg-terminal-accent/10 shadow-md'
                          : 'border-terminal-accent/30 bg-terminal-accent/5'
                      }`}
                    >
                      {/* Section Header */}
                      <button
                        onClick={() => jumpToQuestion(section.startIndex)}
                        className={`w-full text-left mb-2 pb-2 border-b transition-colors ${
                          isCurrentSection 
                            ? 'border-terminal-accent/50 text-terminal-bright' 
                            : 'border-terminal-accent/20 text-terminal-dim hover:text-terminal-bright'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs">{section.title}</span>
                          <span className="text-xs opacity-70">
                            {section.questions.length} questions
                          </span>
                        </div>
                        <div className="text-xs opacity-60 mt-1">
                          Q{section.startIndex + 1} - Q{section.startIndex + section.questions.length}
                        </div>
                      </button>

                      {/* Question Grid */}
                      <div className={`grid gap-2 ${
                        navPosition === 'bottom' 
                          ? 'grid-cols-10' 
                          : section.questions.length > 20 
                            ? 'grid-cols-6' 
                            : section.questions.length > 10 
                              ? 'grid-cols-5' 
                              : 'grid-cols-4'
                      }`}>
                        {Array.from({length: section.questions.length}, (_, idx) => {
                          const globalIdx = section.startIndex + idx;
                          return (
                            <button
                              key={globalIdx}
                              onClick={() => jumpToQuestion(globalIdx)}
                              disabled={hasPerQuestionTimer && globalIdx < currentIndex}
                              className="quiz-question-btn"
                              data-status={getQuestionStatus(globalIdx)}
                              data-current={currentIndex === globalIdx}
                              style={{
                                minHeight: '32px',
                                minWidth: '32px'
                              }}
                              title={`Section: ${section.title} - Question ${idx + 1} of ${section.questions.length} - ${getQuestionStatusLabel(globalIdx)}`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Single section quiz: Clean simple layout
            <div>
              <div className="text-xs font-semibold text-terminal-bright mb-3 pb-2 border-b border-terminal-accent/30">
                📋 {questionSections[0]?.title || 'Quiz Questions'}
              </div>
              <div className={`grid gap-2 ${navPosition === 'bottom' ? 'grid-cols-12' : 'grid-cols-5'}`}>
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => jumpToQuestion(idx)}
                    disabled={hasPerQuestionTimer && idx < currentIndex}
                    className="quiz-question-btn"
                    data-status={getQuestionStatus(idx)}
                    data-current={currentIndex === idx}
                    style={{
                      minHeight: '32px',
                      minWidth: '32px'
                    }}
                    title={`Question ${idx + 1} - ${getQuestionStatusLabel(idx)}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className={`text-xs space-y-2 mt-4 pt-3 border-t border-terminal-accent/30 ${navPosition === 'bottom' ? 'flex gap-6' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gradient-to-br from-gray-500 to-gray-700 border-2 border-gray-300 rounded shadow-md"></div>
            <div className="w-3 h-3 rounded border border-gray-400 bg-gray-500 inline-block mr-2"></div>
            <span className="text-gray-300 font-medium">Not Visited</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-orange-200 rounded shadow-md"></div>
            <span className="text-orange-300 font-medium">Seen</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-green-600 border-2 border-green-200 rounded shadow-md"></div>
            <div className="w-3 h-3 rounded border border-green-400 bg-green-500 inline-block mr-2"></div>
            <span className="text-green-300 font-medium">Attempted</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gradient-to-br from-yellow-300 to-yellow-500 border-2 border-yellow-200 rounded shadow-md"></div>
            <div className="w-3 h-3 rounded border border-yellow-400 bg-yellow-500 inline-block mr-2"></div>
            <span className="text-yellow-300 font-medium">Marked for Review</span>
          </div>
          {hasPerQuestionTimer && (
            <div className="text-xs text-yellow-300 mt-2 italic">
              ⏱️ Per-question timer mode: Previous questions locked
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
      <Terminal title={`quiz: ${quiz.title}`}>
        {/* Warning Banner */}
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/50 rounded">
          <div className="flex items-center gap-2 text-yellow-300">
            <span className="text-lg">⚠️</span>
            <span className="text-sm">
              <strong>Warning:</strong> Navigating away or refreshing will restart the quiz from the beginning.
            </span>
          </div>
        </div>

        <div className={`flex gap-4 ${navPosition === 'bottom' ? 'flex-col' : navPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Question Navigation */}
        {renderQuestionNav()}

        {/* Main Quiz Area */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <TerminalLine prefix="#">
                Question {currentIndex + 1} of {questions.length}
              </TerminalLine>
              {questionSections.length > 1 && (
                <div className="text-xs text-terminal-dim ml-6 mt-1">
                  Section: {questionSections[getCurrentSection() || 0]?.title || 'Unknown'} 
                  ({(currentIndex - (questionSections[getCurrentSection() || 0]?.startIndex || 0)) + 1} of {questionSections[getCurrentSection() || 0]?.questions.length || 0})
                </div>
              )}
            </div>
            <div className="flex gap-4 text-sm items-center">
              <button
                onClick={() => setUserLayout(activeLayout === 'split' ? 'default' : 'split')}
                className="text-xs bg-terminal-accent/20 hover:bg-terminal-accent/30 px-2 py-1 rounded"
              >
                Layout: {activeLayout === 'split' ? 'Split' : 'Default'}
              </button>
              {timeLeft !== null && (
                <span className={timeLeft < 30 ? "text-destructive" : "text-terminal-accent"}>
                  Quiz Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              )}
              {questionTimeLeft !== null && (
                <span className={questionTimeLeft < 10 ? "text-destructive" : "text-terminal-bright"}>
                  Question Time: {questionTimeLeft}s
                </span>
              )}
            </div>
          </div>

          {activeLayout === 'split' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-terminal-accent/30 p-4 rounded">
                <TerminalLine prefix="Q:">
                  <LatexRenderer text={currentQuestion.q} media={quiz.media} />
                </TerminalLine>
              </div>
              <div className="space-y-2">
                {currentQuestion.o.map((option, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all transform ${
                      answers[currentIndex] === idx 
                        ? 'border-green-400 bg-green-500/30 text-green-100 shadow-lg scale-105' 
                        : 'border-terminal-accent/30 hover:border-blue-400 hover:bg-blue-500/20 hover:text-blue-100 hover:shadow-md hover:scale-102'
                    }`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      checked={answers[currentIndex] === idx}
                      onChange={() => handleAnswer(idx)}
                      className="accent-green-400"
                    />
                    <span>
                      {String.fromCharCode(65 + idx)}. <LatexRenderer text={option} media={quiz.media} />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-terminal-accent/30 p-4 rounded">
              <TerminalLine prefix="Q:">
                <LatexRenderer text={currentQuestion.q} media={quiz.media} />
              </TerminalLine>

              <div className="mt-4 space-y-2">
                {currentQuestion.o.map((option, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all transform ${
                      answers[currentIndex] === idx 
                        ? 'border-green-400 bg-green-500/30 text-green-100 shadow-lg scale-105' 
                        : 'border-terminal-accent/30 hover:border-blue-400 hover:bg-blue-500/20 hover:text-blue-100 hover:shadow-md hover:scale-102'
                    }`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      checked={answers[currentIndex] === idx}
                      onChange={() => handleAnswer(idx)}
                      className="accent-green-400"
                    />
                    <span>
                      {String.fromCharCode(65 + idx)}. <LatexRenderer text={option} media={quiz.media} />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <TerminalButton 
                onClick={handlePrevious} 
                disabled={currentIndex === 0 || hasPerQuestionTimer}
                className={currentIndex === 0 || hasPerQuestionTimer ? 'opacity-50 cursor-not-allowed' : ''}
              >
                ← previous
              </TerminalButton>
              <TerminalButton onClick={toggleMarkForReview}>
                {markedForReview[currentIndex] ? '★ unmark review' : '☆ mark for review'}
              </TerminalButton>
              <TerminalButton 
                onClick={() => {
                  if (confirm('Are you sure you want to end the test? Only attempted questions will be graded.')) {
                    handleSubmit();
                  }
                }}
                className="bg-red-600/20 hover:bg-red-600/30 border-red-500/50"
              >
                🛑 end test
              </TerminalButton>
            </div>
            <TerminalButton 
              onClick={handleNext}
              disabled={false}
              className={answers[currentIndex] === -1 ? 'bg-yellow-600/20 border-yellow-500/50' : 'bg-green-600/20 border-green-500/50'}
            >
              {answers[currentIndex] === -1 ? 
                '⚠️ skip question' : 
                (currentIndex === questions.length - 1 ? 
                  (hasPerQuestionTimer ? "✓ submit" : "📋 review") : 
                  "next →"
                )
              }
            </TerminalButton>
          </div>
        </div>
      </div>
      </Terminal>
  );
};
