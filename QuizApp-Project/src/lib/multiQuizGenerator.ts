import { Quiz, Question } from '../types/quiz';
import { StorageService } from './storage';
import { resolveRecursiveQuestions, collectAllRecursiveQuestions, applyRootLevelFiltering, getRecursiveQuestionCount } from './recursiveQuizResolver';
import { collectLeafQuestions } from './quizSourceTree';

// Helper function to apply question limit while preserving quiz order
function applyLimitWithQuizOrder(questions: Question[], limit: number): Question[] {
  // ❌ THIS FUNCTION SHOULD NOT BE USED WHEN PRESERVE ORDER IS ENABLED
  // It redistributes questions proportionally instead of preserving section boundaries


  
  // Return original questions to avoid redistribution
  return questions;
}

export interface MultiQuizGenerationResult {
  questions: Question[];
  metadata: {
    sources: Array<{
      sourceQuizId: string;
      sourceTitle: string;
      questionCount: number;
      actualQuestions: number;
    }>;
    generatedAt: number;
    totalQuestions: number;
    finalLimit?: number;
  };
}

export async function generateMultiQuizQuestions(
  quiz: Quiz,
  storage: StorageService
): Promise<MultiQuizGenerationResult | null> {
  
  if (!quiz.multiQuizSources) {

    return null;
  }


  
  const preserveQuizOrder = quiz.multiQuizSources?.preserveQuizOrder || false;


  try {

    
    // STEP 1: Collect ALL questions from all sources recursively (no range filtering)
    const collectionResult = await collectAllRecursiveQuestions(
      quiz,
      storage,
      preserveQuizOrder
    );





    
    // STEP 2: Apply range filtering only at the root level
    const filteredResult = applyRootLevelFiltering(
      collectionResult.sections,
      preserveQuizOrder
    );




    // STEP 3: Apply final quiz-level question limit if specified
    let finalQuestions = filteredResult.questions;
    if (quiz.questionLimit && quiz.questionLimit < finalQuestions.length) {

      
      if (preserveQuizOrder) {
        // Preserve proportional representation from each section
        finalQuestions = applyLimitWithQuizOrder(finalQuestions, quiz.questionLimit);
      } else {
        // Random selection across all questions
        const shuffled = [...finalQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        finalQuestions = shuffled.slice(0, quiz.questionLimit);
      }
    }

    // Final ordering
    if (!preserveQuizOrder) {
      // Apply final shuffle for truly random mode
      for (let i = finalQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
      }

    }

    // Build metadata from sections
    const metadata: MultiQuizGenerationResult['metadata'] = {
      sources: filteredResult.sections.map(section => ({
        sourceQuizId: section.sourceQuizId,
        sourceTitle: section.sourceTitle,
        questionCount: section.totalAvailable,
        actualQuestions: section.actualSelected
      })),
      generatedAt: Date.now(),
      totalQuestions: finalQuestions.length,
      finalLimit: quiz.questionLimit
    };




    return {
      questions: finalQuestions,
      metadata,
      mergedMedia: collectionResult.media,
      sections: filteredResult.sections
    } as MultiQuizGenerationResult & { 
      mergedMedia: any[];
      sections: any[];
    };

  } catch (error) {

    
    // Fallback to legacy method
    return await generateMultiQuizQuestionsLegacy(quiz, storage);
  }
}

async function generateMultiQuizQuestionsLegacy(
  quiz: Quiz,
  storage: StorageService
): Promise<MultiQuizGenerationResult | null> {

  
  const preserveQuizOrder = quiz.multiQuizSources?.preserveQuizOrder || false;
  const mergedQuestions: Question[] = [];
  const mergedMedia: any[] = [...(quiz.media || [])];
  const metadata: MultiQuizGenerationResult['metadata'] = {
    sources: [],
    generatedAt: Date.now(),
    totalQuestions: 0
  };

  // Process each source quiz (LEGACY METHOD)
  for (const source of quiz.multiQuizSources.sources) {
    try {
      const sourceQuiz = await storage.getQuizById(source.quizId);
      if (!sourceQuiz) {

        continue;
      }

      // Get questions from leaf nodes only (not intermediate multi-quiz nodes)
      let sourceQuestions = await collectLeafQuestions(sourceQuiz, storage);
      
      console.log(`🔍 Source "${sourceQuiz.title}" analysis:`, {
        isMultiQuiz: !!sourceQuiz.multiQuizSources,
        leafQuestions: sourceQuestions.length,
        directQuestions: sourceQuiz.questions?.length || 0,
        usingLeafExtraction: true
      });
      
      if (!sourceQuestions || sourceQuestions.length === 0) {

        continue;
      }



      // Handle shuffling based on preserve order setting
      const preserveQuizOrder = quiz.multiQuizSources?.preserveQuizOrder || false;
      
      if (!preserveQuizOrder) {
        // If NOT preserving order, use proper Fisher-Yates shuffle for random selection
        for (let i = sourceQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sourceQuestions[i], sourceQuestions[j]] = [sourceQuestions[j], sourceQuestions[i]];
        }

      } else {
        // ✅ PRESERVE ORDER: Keep questions in their original order, no random selection
        // Don't modify sourceQuestions array at all when preserving order


      }

      // Determine how many questions to select from this source
      let selectedCount;
      
      if (preserveQuizOrder && source.fixedCount) {
        // ✅ PRESERVE ORDER + FIXED COUNT: Take exactly what user specified
        selectedCount = source.minQuestions; // Use exactly the fixed count

      } else if (preserveQuizOrder) {
        // ✅ PRESERVE ORDER + RANGE: Take minimum to preserve section boundaries
        selectedCount = source.minQuestions; // Take minimum to preserve section structure

      } else {
        // Random mode: use original logic
        selectedCount = source.fixedCount 
          ? source.minQuestions
          : Math.floor(Math.random() * (source.maxQuestions - source.minQuestions + 1)) + source.minQuestions;
          
        console.log(`🎯 Question selection for "${sourceQuiz.title}":`, {
          fixedCount: source.fixedCount,
          minQuestions: source.minQuestions,
          maxQuestions: source.maxQuestions,
          calculatedCount: selectedCount,
          availableQuestions: sourceQuestions.length
        });
      }

      // Merge media from source quiz BEFORE processing questions (avoid duplicates)
      if (sourceQuiz.media && sourceQuiz.media.length > 0) {
        sourceQuiz.media.forEach(mediaItem => {
          // Ensure media item has a unique ID
          if (!mediaItem.id) {
            mediaItem.id = `${sourceQuiz.id}_media_${sourceQuiz.media!.indexOf(mediaItem)}_${Date.now()}`;
          }
          
          // Check for existing media by ID, name, and data to avoid true duplicates
          const exists = mergedMedia.find(m => 
            (m.id === mediaItem.id) || 
            (m.name === mediaItem.name && m.data === mediaItem.data && m.type === mediaItem.type)
          );
          
          if (!exists) {
            // Validate media data before adding - be more strict
            if (mediaItem.data && 
                mediaItem.data.length > 50 && 
                !mediaItem.data.startsWith('blob:') &&
                (mediaItem.data.startsWith('data:') || mediaItem.data.length > 1000)) {
              
              // Ensure proper structure
              const cleanMediaItem = {
                ...mediaItem,
                id: mediaItem.id || `${sourceQuiz.id}_media_${sourceQuiz.media!.indexOf(mediaItem)}_${Date.now()}`,
                type: (mediaItem.type === 'img' || mediaItem.type === 'audio') ? mediaItem.type : 'img',
                size: mediaItem.size || 'medium'
              };
              
              mergedMedia.push(cleanMediaItem);
              console.log(`✅ Added media to merged array: ${cleanMediaItem.name} (${cleanMediaItem.type})`);
            } else {
              console.warn(`🗑️ Skipping invalid media item: ${mediaItem.name}`, {
                dataLength: mediaItem.data?.length,
                isBlob: mediaItem.data?.startsWith('blob:'),
                hasDataPrefix: mediaItem.data?.startsWith('data:')
              });
            }
          } else {
            console.log(`📎 Skipping duplicate media: ${mediaItem.name}`);
          }
        });
      }

      // Select questions (limited by actual available questions)
      const actualCount = Math.min(selectedCount, sourceQuestions.length);
      const selectedQuestions = sourceQuestions.slice(0, actualCount);
      

      
      // Add source metadata to each question and ensure proper structure
      const questionsWithMetadata = selectedQuestions.map((q, questionIndex) => {
        // Find the original index of this question in the source quiz
        const originalIndex = sourceQuiz.questions.findIndex(originalQ => originalQ === q);
        
        // Update media references in question text and options to point to merged media array
        let updatedQ = q.q || q.question || '';
        let updatedO = Array.isArray(q.o) ? q.o : (Array.isArray(q.options) ? q.options : []);
        
        // Function to update media references in text
        const updateMediaReferences = (text: string): string => {
          if (!text || typeof text !== 'string') return text;
          

          
          // Replace [img:X] and [audio:X] references
          return text.replace(/\[(img|audio):(\d+)\]/g, (match, type, num) => {
            const oldIndex = parseInt(num) - 1; // Convert to 0-based

            
            // Check if this index exists in the source quiz media
            if (sourceQuiz.media && oldIndex >= 0 && oldIndex < sourceQuiz.media.length) {
              const sourceMediaItem = sourceQuiz.media[oldIndex];

              
              // Ensure media item has a unique ID
              if (!sourceMediaItem.id) {
                sourceMediaItem.id = `${sourceQuiz.id}_media_${oldIndex}`;
              }
              
              // Find this media item in the merged media array by ID, name, and data
              let newIndex = mergedMedia.findIndex(m => 
                (m.id === sourceMediaItem.id) || 
                (m.name === sourceMediaItem.name && m.data === sourceMediaItem.data)
              );
              
              if (newIndex === -1) {
                // Media item not found in merged array, add it now
                mergedMedia.push({...sourceMediaItem});
                newIndex = mergedMedia.length - 1;

              } else {

              }
              
              const newReference = `[${type}:${newIndex + 1}]`;

              return newReference;
            } else {


            }
            
            return match; // Return original if not found
          });
        };
        
        // Update question text and options with media references



        
        updatedQ = updateMediaReferences(updatedQ);
        updatedO = updatedO.map(option => 
          typeof option === 'string' ? updateMediaReferences(option) : option
        );
        


        
        return {
          q: updatedQ,
          o: updatedO,
          a: typeof q.a === 'number' ? q.a : (typeof q.answer === 'number' ? q.answer : 0),
          _sourceQuiz: sourceQuiz.id,
          _sourceTitle: sourceQuiz.title,
          _originalIndex: originalIndex >= 0 ? originalIndex : questionIndex, // Track TRUE original position in source quiz
          // Add source metadata for question limit filtering
          __source: {
            isMultiQuiz: !!sourceQuiz.multiQuizSources,
            quizId: sourceQuiz.id,
            title: sourceQuiz.title
          },
          // Copy all other properties
          ...q,
        };
      });

      mergedQuestions.push(...questionsWithMetadata);
      
      metadata.sources.push({
        sourceQuizId: sourceQuiz.id,
        sourceTitle: sourceQuiz.title,
        questionCount: actualCount, // Use actualCount for proper section division
        actualQuestions: actualCount
      });


      
    } catch (error) {

    }
  }

  // Add manual questions from original quiz (excluding the config placeholder)
  if (quiz.questions && quiz.questions.length > 1) {
    const manualQuestions = quiz.questions.filter(q => !(q as any)._isMultiQuizConfig);
    if (manualQuestions.length > 0) {
      const questionsWithMetadata = manualQuestions.map(q => ({
        ...q,
        _sourceQuiz: 'manual',
        _sourceTitle: 'Manual Entry'
      }));
      
      mergedQuestions.push(...questionsWithMetadata);
      
      metadata.sources.push({
        sourceQuizId: 'manual',
        sourceTitle: 'Manual Entry',
        questionCount: manualQuestions.length,
        actualQuestions: manualQuestions.length
      });


    }
  }

  // Apply final question limit and ordering
  // IMPORTANT: Question limit should only apply to normal (non-multi-quiz) sources
  let finalQuestions = mergedQuestions;
  const finalPreserveQuizOrder = quiz.multiQuizSources?.preserveQuizOrder || false;
  
  if (quiz.questionLimit && quiz.questionLimit < mergedQuestions.length) {
    // Separate questions from multi-quiz sources vs normal sources
    const multiQuizQuestions: Question[] = [];
    const normalQuizQuestions: Question[] = [];
    
    for (const question of mergedQuestions) {
      const questionSourceMetadata = (question as any).__source;
      if (questionSourceMetadata?.isMultiQuiz) {
        multiQuizQuestions.push(question);
      } else {
        normalQuizQuestions.push(question);
      }
    }
    
    console.log(`📊 Question limit analysis:`, {
      totalQuestions: mergedQuestions.length,
      multiQuizQuestions: multiQuizQuestions.length,
      normalQuizQuestions: normalQuizQuestions.length,
      questionLimit: quiz.questionLimit,
      shouldApplyLimitToNormalOnly: true
    });
    
    // Apply question limit ONLY to normal quiz questions
    let limitedNormalQuestions = normalQuizQuestions;
    if (quiz.questionLimit < normalQuizQuestions.length) {
      if (finalPreserveQuizOrder) {
        // For preserved order: keep proportional representation but only from normal sources
        limitedNormalQuestions = applyLimitWithQuizOrder(normalQuizQuestions, quiz.questionLimit);
        console.log(`🎯 Applied question limit to normal sources with preserved order: ${limitedNormalQuestions.length} questions`);
      } else {
        // Fully random: shuffle and trim normal questions only
        const shuffledNormalQuestions = [...normalQuizQuestions];
        for (let i = shuffledNormalQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledNormalQuestions[i], shuffledNormalQuestions[j]] = [shuffledNormalQuestions[j], shuffledNormalQuestions[i]];
        }
        limitedNormalQuestions = shuffledNormalQuestions.slice(0, quiz.questionLimit);
        console.log(`🎯 Applied question limit to normal sources with randomization: ${limitedNormalQuestions.length} questions`);
      }
    }
    
    // Combine limited normal questions with ALL multi-quiz questions (unlimited)
    finalQuestions = [...multiQuizQuestions, ...limitedNormalQuestions];
    metadata.finalLimit = quiz.questionLimit;
    metadata.appliedToNormalSourcesOnly = true;
    
    console.log(`✅ Final question distribution:`, {
      multiQuizQuestions: multiQuizQuestions.length,
      limitedNormalQuestions: limitedNormalQuestions.length,
      totalFinalQuestions: finalQuestions.length
    });
  }

  // Handle randomization based on quiz settings
  if (quiz.randomize) {
    if (finalPreserveQuizOrder) {
      // ✅ PRESERVE ORDER + RANDOMIZE: Randomize within each section only

      
      // Group questions by source to maintain sections
      const groupedBySource: { [key: string]: Question[] } = {};
      finalQuestions.forEach(q => {
        const source = (q as any)._sourceQuiz || 'unknown';
        if (!groupedBySource[source]) {
          groupedBySource[source] = [];
        }
        groupedBySource[source].push(q);
      });
      
      // Randomize within each section and rebuild final questions
      const randomizedQuestions: Question[] = [];
      Object.keys(groupedBySource).forEach(sourceId => {
        const sourceQuestions = [...groupedBySource[sourceId]]; // Copy array
        
        // Fisher-Yates shuffle within this section only
        for (let i = sourceQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sourceQuestions[i], sourceQuestions[j]] = [sourceQuestions[j], sourceQuestions[i]];
        }
        
        randomizedQuestions.push(...sourceQuestions);

      });
      
      finalQuestions = randomizedQuestions;

      
    } else {
      // FULLY RANDOM: Randomize across all questions (original behavior)

      for (let i = finalQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
      }

    }
  } else {

  }

  // Helper function to group questions by their source
  function groupQuestionsBySource(questions: Question[]): { [key: string]: Question[] } {
    const groups: { [key: string]: Question[] } = {};
    questions.forEach(q => {
      const source = (q as any)._sourceQuiz || 'unknown';
      if (!groups[source]) groups[source] = [];
      groups[source].push(q);
    });
    return groups;
  }

  // Final ordering based on preserveQuizOrder setting
  if (!finalPreserveQuizOrder) {
    // Fully random shuffle using Fisher-Yates - mix all questions completely
    for (let i = finalQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
    }

  } else {
    // Quiz order preserved: maintain source grouping AND original order within groups

    
    const groupedQuestions = groupQuestionsBySource(finalQuestions);
    const regroupedQuestions: Question[] = [];
    
    // Get unique source IDs in the order they were configured (not random order)
    const sourceOrder: string[] = [];
    
    // First add sources from multiQuizSources configuration to maintain intended order
    if (quiz.multiQuizSources?.sources) {
      quiz.multiQuizSources.sources.forEach(source => {
        if (!sourceOrder.includes(source.quizId)) {
          sourceOrder.push(source.quizId);
        }
      });
    }
    
    // Then add any remaining sources (like manual questions)
    finalQuestions.forEach(q => {
      const sourceId = (q as any)._sourceQuiz || 'unknown';
      if (!sourceOrder.includes(sourceId)) {
        sourceOrder.push(sourceId);
      }
    });
    
    // Process each source group in the configured order
    sourceOrder.forEach(sourceId => {
      const sourceQuestions = groupedQuestions[sourceId];
      if (!sourceQuestions || sourceQuestions.length === 0) return;
      

      
      // Sort by original index to maintain the original order from the source quiz
      const sortedGroup = [...sourceQuestions].sort((a, b) => {
        const aIndex = (a as any)._originalIndex || 0;
        const bIndex = (b as any)._originalIndex || 0;
        return aIndex - bIndex;
      });
      
      // Add this group to the final questions in original order
      regroupedQuestions.push(...sortedGroup);

    });
    
    finalQuestions = regroupedQuestions;

  }

  metadata.totalQuestions = finalQuestions.length;

  console.log('🎉 Multi-Quiz generation complete:', {
    sources: metadata.sources.length,
    totalQuestions: metadata.totalQuestions,
    finalLimit: metadata.finalLimit
  });



  return {
    questions: finalQuestions,
    metadata,
    mergedMedia // Include merged media for quiz rendering
  } as MultiQuizGenerationResult & { mergedMedia: any[] };
}
