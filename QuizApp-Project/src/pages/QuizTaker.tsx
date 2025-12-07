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
import { resolveRecursiveQuestions, collectAllRecursiveQuestions } from "@/lib/recursiveQuizResolver";
import { collectLeafQuestions } from "@/lib/quizSourceTree";
import { useTabSwitchDetection } from "@/hooks/useTabSwitchDetection";
import { useQuizStatePreservation } from "@/hooks/useQuizStatePreservation";

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

  // Tab switching detection
  const hasAnyTimeLimit = quiz && (quiz.timeLimit || quiz.perQuestionTimeLimit);
  
  // Create a unique key for each quiz attempt to reset tab switch counters
  const quizAttemptKey = `${quiz?.id || 'unknown'}_${Date.now()}`;
  
  // State preservation for ALL quizzes during session (different restore policy)
  const { 
    saveState, 
    loadState, 
    clearState, 
    createFreshState, 
    isStateRestored, 
    setIsStateRestored 
  } = useQuizStatePreservation(
    quiz?.id || '', 
    questions.length, 
    true // Enable for all quizzes during session
  );
  
  const { switchCount, warningCount, remainingWarnings } = useTabSwitchDetection({
    maxWarnings: 3,
    hasTimeLimit: !!hasAnyTimeLimit,
    onWarningLimitExceeded: () => {
      // For timed quizzes: End quiz directly without dialog
      console.log('Maximum tab switches exceeded - ending quiz');
      handleSubmit(); // End quiz and submit current answers
    },
    onTabSwitch: (count) => {
      console.log(`Tab switch detected. Total switches: ${count}`);
      // Save state for ALL quizzes on tab switch - state should persist during quiz session
      if (quiz && questions.length > 0) {
        saveState({
          answers,
          timeTaken,
          currentIndex,
          questionStatus,
          markedForReview,
          quizStartTime,
          questionStartTime,
          timeLeft,
          questionTimeLeft
        });
      }
    },
    enabled: !!quiz, // Only enable after quiz is loaded
    key: quizAttemptKey // Force new instance for each quiz attempt
  });

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

      }
      if (customPerQuestionTimeLimit) {
        quizWithCustomSettings.perQuestionTimeLimit = parseInt(customPerQuestionTimeLimit);

      }
      if (customRandomize) {
        quizWithCustomSettings.randomize = customRandomize === 'true';

      }

      let finalQuestions = [...quizWithCustomSettings.questions];
      let sectionsAlreadyCreated = false;

      // Check if this is a multi-quiz (either from stored config or URL params)
      const isMultiQuiz = quizWithCustomSettings.multiQuizSources || (multiQuizMode === 'true' && quizSources);
      
      if (isMultiQuiz) {
        setIsGeneratingQuestions(true);
        let loadingToast: string | number | null = null;
        
        try {
          if (quizWithCustomSettings.multiQuizSources) {
            loadingToast = toast.loading("🎲 Generating questions from multiple sources...", { duration: Infinity });
            
            // Use stored multi-quiz configuration

            const generationResult = await generateMultiQuizQuestions(quizWithCustomSettings, storage);
            
            if (generationResult) {
              setMultiQuizMetadata(generationResult.metadata);
              finalQuestions = generationResult.questions;
              
              // Update quiz with merged media and sections if available
              if ((generationResult as any).mergedMedia) {
                // Properly merge media into the quiz object
                const mergedMedia = (generationResult as any).mergedMedia;
                quizWithCustomSettings = {
                  ...quizWithCustomSettings,
                  media: mergedMedia
                };

              }
              
              // Store section information for better navigation
              if ((generationResult as any).sections) {
                const generatedSections = (generationResult as any).sections;

                
                // Convert generation sections to display sections
                let sectionStartIndex = 0;
                const displaySections = generatedSections.map((section: any) => {
                  const sectionQuestions = finalQuestions.slice(sectionStartIndex, sectionStartIndex + section.questions.length);
                  const sectionInfo = {
                    title: section.sectionName,
                    questions: sectionQuestions,
                    startIndex: sectionStartIndex,
                    sourceInfo: {
                      quizId: section.sourceQuizId,
                      title: section.sourceTitle,
                      originalRange: section.originalRange
                    }
                  };
                  
                  // Update startIndex for next section
                  sectionStartIndex += section.questions.length;
                  
                  return sectionInfo;
                }).filter((section: any) => section.questions.length > 0);
                
                if (displaySections.length > 0) {
                  setQuestionSections(displaySections);


                  
                  // Apply section-wise randomization if enabled
                  if (quizWithCustomSettings.randomize) {
                    displaySections.forEach(section => {
                      // Use Fisher-Yates shuffle algorithm for true randomization within each section
                      for (let i = section.questions.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [section.questions[i], section.questions[j]] = [section.questions[j], section.questions[i]];
                      }
                    });

                    
                    // Update finalQuestions with the randomized section order
                    finalQuestions = displaySections.flatMap(section => section.questions);

                    
                    // Update sections after randomization
                    setQuestionSections(displaySections);
                  }
                  
                  // Mark that sections have been successfully created from generation result
                  sectionsAlreadyCreated = true;
                }
              } else {

              }
              
              // Properly dismiss the loading toast and show success
              if (loadingToast) {
                toast.dismiss(loadingToast);
              }
              toast.success(`🎉 Generated ${finalQuestions.length} questions from ${generationResult.metadata.sources.length} sources!`, {
                duration: 3000
              });

            } else {
              throw new Error('Failed to generate multi-quiz questions');
            }
          } else if (multiQuizMode === 'true' && quizSources) {
            // Use URL-based multi-quiz mode (legacy)

            const sources = JSON.parse(quizSources);
            finalQuestions = await buildMultiQuizQuestions(sources);

          }
        } catch (error) {

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

        }
      }

      // For multi-quiz, create sections based on source quizzes
      let qs = finalQuestions;
      let sections: {title: string, questions: QuizQuestion[], startIndex: number}[] = [];
      
      if (quizWithCustomSettings.multiQuizSources && !sectionsAlreadyCreated) {



        
        let currentIndexTracker = 0;
        
        // ALWAYS create sections for multi-quiz, regardless of metadata availability
        if (multiQuizMetadata?.sources) {
          // Use metadata if available

          
          // Create sections based on the actual distribution from metadata
          multiQuizMetadata.sources.forEach((sourceInfo, idx) => {
            // Calculate how many questions this source should get based on the metadata
            const sourceQuestionCount = sourceInfo.questionCount || 0;
            
            if (sourceQuestionCount > 0 && currentIndexTracker + sourceQuestionCount <= finalQuestions.length) {
              // Get the actual questions for this section from the final questions array
              const sectionQuestions = finalQuestions.slice(currentIndexTracker, currentIndexTracker + sourceQuestionCount);
              
              // Try to get custom section name from quiz configuration
              const sourceConfig = quizWithCustomSettings.multiQuizSources?.sources?.find(s => s.quizId === sourceInfo.quizId);
              const sectionTitle = sourceConfig?.sectionName || sourceInfo.quizTitle || `Quiz ${idx + 1}`;
              

              
              sections.push({
                title: sectionTitle,
                questions: sectionQuestions,
                startIndex: currentIndexTracker
              });
              currentIndexTracker += sourceQuestionCount;
            }
          });
        } else {
          // Fallback: create sections based on multiQuizSources configuration directly

          
          if (quizWithCustomSettings.multiQuizSources.sources) {
            const questionsPerSource = Math.ceil(finalQuestions.length / quizWithCustomSettings.multiQuizSources.sources.length);
            
            quizWithCustomSettings.multiQuizSources.sources.forEach((sourceConfig, idx) => {
              const startIdx = idx * questionsPerSource;
              const endIdx = Math.min(startIdx + questionsPerSource, finalQuestions.length);
              const sourceQuestions = finalQuestions.slice(startIdx, endIdx);
              
              if (sourceQuestions.length > 0) {
                const sectionTitle = sourceConfig.sectionName || `Section ${idx + 1}`;
                

                
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

        }
        
        // Flatten sections back to questions array
        qs = sections.flatMap(section => section.questions);
        setQuestionSections(sections);
        

      } else if (sectionsAlreadyCreated) {
        // Sections were already created from generation result - they should already be set in finalQuestions

        qs = finalQuestions;

      } else {
        // Regular quiz - apply proper randomization
        if (quizWithCustomSettings.randomize) {
          // Use Fisher-Yates shuffle algorithm for true randomization
          qs = [...finalQuestions];
          for (let i = qs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [qs[i], qs[j]] = [qs[j], qs[i]];
          }

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

        toast.error('No questions available for this quiz');
        navigate('/dashboard');
        return;
      }
      
      // Update the quiz state with the final configuration including merged media
      setQuiz(quizWithCustomSettings);
      setQuestions(qs);
      





      
      // Check for saved state for ALL quizzes (timed and untimed)
      const savedState = loadState();
      if (savedState && savedState.answers.length === qs.length) {
        // Restore saved state including timer state
        setAnswers(savedState.answers);
        setTimeTaken(savedState.timeTaken);
        setCurrentIndex(Math.min(savedState.currentIndex, qs.length - 1));
        setQuestionStatus(savedState.questionStatus);
        setMarkedForReview(savedState.markedForReview);
        setQuestionStartTime(savedState.questionStartTime);
        
        // Restore timer states for timed quizzes
        if (savedState.timeLeft !== undefined) {
          setTimeLeft(savedState.timeLeft);
        }
        if (savedState.questionTimeLeft !== undefined) {
          setQuestionTimeLeft(savedState.questionTimeLeft);
        }
        
        setIsStateRestored(true);
        const quizType = fetchedQuiz.timeLimit || fetchedQuiz.perQuestionTimeLimit ? 'timed' : 'untimed';
        toast.success(`Quiz state restored! Continuing ${quizType} quiz where you left off.`, { duration: 3000 });
      } else {
        // Initialize fresh state
        setAnswers(new Array(qs.length).fill(-1));
        setTimeTaken(new Array(qs.length).fill(0));
        setCurrentIndex(0);
        setQuestionStatus(new Array(qs.length).fill('unattempted'));
        setMarkedForReview(new Array(qs.length).fill(false));
        setQuestionStartTime(Date.now());
        
        // Initialize timer states
        if (fetchedQuiz.timeLimit) {
          setTimeLeft(fetchedQuiz.timeLimit * 60); // Convert minutes to seconds
        }
        if (fetchedQuiz.perQuestionTimeLimit && fetchedQuiz.perQuestionTimeLimit > 0) {
          setQuestionTimeLeft(fetchedQuiz.perQuestionTimeLimit);
        }
      }
      
      setUserLayout(fetchedQuiz.layout || 'default');
      soundEffects.quizStart();

      // Determine quiz mode:
      // Mode 1: Quiz-wide timer (quiz.timeLimit set) - revisits allowed
      // Mode 2: No time limit (no quiz.timeLimit and no perQuestionTimeLimit) - revisits allowed
      // Mode 3: Per-question timer (quiz.perQuestionTimeLimit set AND > 0) - no revisits, one attempt per question
      const hasPerQuestionTimer = !!(fetchedQuiz.perQuestionTimeLimit && fetchedQuiz.perQuestionTimeLimit > 0);
      setHasPerQuestionTimer(hasPerQuestionTimer);
      


      // Timer initialization is now handled in the state restoration logic above
      // This prevents duplicate initialization that would override restored timer values
    };
    
    loadQuiz();
  }, [id, user, navigate]);

  const buildMultiQuizQuestions = async (sources: any[]) => {

    
    // Create a temporary quiz object with the URL sources to use the new recursive system
    const tempQuiz: Quiz = {
      id: 'temp-url-quiz',
      title: 'URL Multi-Quiz',
      questions: [],
      creator: user?.id || '',
      createdAt: Date.now(),
      isPublic: false,
      multiQuizSources: {
        sources: sources.map(s => ({
          quizId: s.quizId,
          minQuestions: s.minQuestions || 1,
          maxQuestions: s.maxQuestions || 1,
          fixedCount: s.fixedCount || false,
          sectionName: s.sectionName || 'Quiz Source'
        })),
        preserveQuizOrder: false
      }
    };
    
    try {
      // Use the new recursive multi-quiz generator
      const result = await generateMultiQuizQuestions(tempQuiz, storage);
      if (result && result.questions) {

        
        // Update metadata for URL-based multi-quiz
        if (result.metadata) {
          setMultiQuizMetadata(result.metadata);
        }
        
        return result.questions;
      } else {
        throw new Error('Failed to generate questions with new system');
      }
    } catch (error) {

      
      // Fallback to collection-based recursive resolution
      try {
        const resolutionResult = await collectAllRecursiveQuestions(
          tempQuiz,
          storage,
          false // URL-based mode defaults to random order
        );
        

        
        // Store section information if available
        if (resolutionResult.sections && resolutionResult.sections.length > 0) {
          let sectionStartIndex = 0;
          const displaySections = resolutionResult.sections.map(section => {
            const sectionQuestions = resolutionResult.questions.slice(sectionStartIndex, sectionStartIndex + section.questions.length);
            const sectionInfo = {
              title: section.sectionName,
              questions: sectionQuestions,
              startIndex: sectionStartIndex,
              sourceInfo: {
                quizId: section.sourceQuizId,
                title: section.sourceTitle,
                originalRange: section.originalRange
              }
            };
            
            // Update startIndex for next section
            sectionStartIndex += section.questions.length;
            
            return sectionInfo;
          });
          
          setQuestionSections(displaySections);
        }
        
        return resolutionResult.questions;
        
      } catch (fallbackError) {

        
        // Final fallback: basic recursive resolution without ranges
        const allQuestions: QuizQuestion[] = [];
        
        for (const source of sources) {
          try {
            const sourceQuiz = await storage.getQuizById(source.quizId);
            if (!sourceQuiz) continue;
            
            // Use basic recursive resolution
            const resolvedQuestions = await resolveRecursiveQuestions(sourceQuiz, storage);
            
            let questionsToTake: number;
            if (source.fixedCount) {
              questionsToTake = source.minQuestions;
            } else {
              questionsToTake = Math.floor(Math.random() * (source.maxQuestions - source.minQuestions + 1)) + source.minQuestions;
            }
            
            // Limit by available questions
            questionsToTake = Math.min(questionsToTake, resolvedQuestions.length);
            
            const shuffledQuestions = [...resolvedQuestions];
            for (let i = shuffledQuestions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
            }
            const selectedQuestions = shuffledQuestions.slice(0, questionsToTake);
            allQuestions.push(...selectedQuestions);
            

          } catch (error) {

          }
        }
        
        return allQuestions;
      }
    }
  };

  useEffect(() => {
    // Only warn user before navigating away if quiz has time limits
    // For untimed quizzes, allow seamless tab switching
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prevent navigation for quizzes with time limits
      if (hasAnyTimeLimit) {
        e.preventDefault();
        e.returnValue = '';
      }
      // For untimed quizzes, don't prevent navigation - let it continue normally
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyTimeLimit]);

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
    
    // Auto-save for all quizzes during session (cleared only on completion or navigation away)
    if (quiz) {
      saveState({
        answers: newAnswers,
        timeTaken,
        currentIndex,
        questionStatus: newStatus,
        markedForReview,
        quizStartTime,
        questionStartTime,
        timeLeft,
        questionTimeLeft
      });
    }
    
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
      completedAt: Date.now()
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

    }

    // Save attempt to storage (database or localStorage fallback)
    try {
      await storage.saveAttempt(attempt);
      console.log('✅ Quiz attempt saved to database');
    } catch (error) {
      // Fallback to localStorage if database fails
      console.warn('⚠️ Database save failed, using localStorage fallback:', error);
      const attempts = JSON.parse(localStorage.getItem('quiz_attempts') || '[]');
      attempts.push(attempt);
      localStorage.setItem('quiz_attempts', JSON.stringify(attempts));
      console.log('✅ Quiz attempt saved to localStorage fallback');
    }
    
    // Clear quiz state since quiz is completed
    clearState();
    
    // Store questions for results page (especially important for multi-quiz)
    const attemptKey = `quiz_attempt_${attempt.id}_questions`;
    try {
      localStorage.setItem(attemptKey, JSON.stringify({
        questions: questions,
        media: quiz.media || []
      }));
    } catch (error) {
      console.warn('Failed to store questions for results:', error);
    }
    
    // Clear saved state since quiz is completed (for all quizzes)
    clearState();
    
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
          <div className="quiz-legend-item">
            <div className="quiz-legend-color" data-color="gray"></div>
            <span className="text-gray-300 font-medium">Not Visited</span>
          </div>
          <div className="quiz-legend-item">
            <div className="quiz-legend-color" data-color="orange"></div>
            <span className="text-orange-300 font-medium">Seen</span>
          </div>
          <div className="quiz-legend-item">
            <div className="quiz-legend-color" data-color="green"></div>
            <span className="text-green-300 font-medium">Attempted</span>
          </div>
          <div className="quiz-legend-item">
            <div className="quiz-legend-color" data-color="yellow"></div>
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
        {/* Dynamic Warning Banner */}
        <div className={`mb-4 p-3 rounded ${hasAnyTimeLimit ? 'bg-yellow-900/20 border border-yellow-500/50' : 'bg-blue-900/20 border border-blue-500/50'}`}>
          <div className={`flex items-center gap-2 ${hasAnyTimeLimit ? 'text-yellow-300' : 'text-blue-300'}`}>
            <span className="text-lg">{hasAnyTimeLimit ? '⚠️' : '🎯'}</span>
            <div className="text-sm">
              {hasAnyTimeLimit ? (
                <div>
                  <div>
                    <strong>Timed Quiz:</strong> Navigating away or refreshing will restart the quiz.
                  </div>
                  <div className="mt-1 text-xs">
                    <strong>Tab Switch Policy:</strong> You get {3 - warningCount} warning(s) remaining. 
                    After {3} tab switches, you'll be asked to end the quiz or restart.
                  </div>
                </div>
              ) : (
                <div>
                  <div>
                    <strong>Untimed Quiz:</strong> You can switch tabs freely - your progress is preserved!
                  </div>
                  {switchCount > 0 && (
                    <div className="mt-1 text-xs">
                      Tab switches: {switchCount} (no penalties for untimed quizzes)
                    </div>
                  )}
                </div>
              )}
            </div>
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
