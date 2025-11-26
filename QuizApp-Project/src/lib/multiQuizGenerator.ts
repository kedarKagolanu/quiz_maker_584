import { Quiz, Question } from '../types/quiz';
import { StorageService } from './storage';
import { resolveRecursiveQuestions, collectAllRecursiveQuestions, applyRootLevelFiltering, getRecursiveQuestionCount } from './recursiveQuizResolver';
import { collectLeafQuestions } from './quizSourceTree';

// Helper function to apply question limit while preserving quiz order
function applyLimitWithQuizOrder(questions: Question[], limit: number): Question[] {
  // ❌ THIS FUNCTION SHOULD NOT BE USED WHEN PRESERVE ORDER IS ENABLED
  // It redistributes questions proportionally instead of preserving section boundaries
  console.error(`❌ applyLimitWithQuizOrder called with preserve order - this should not happen!`);
  console.error(`❌ This will break section integrity - using original questions instead`);
  
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
    console.log('⚠️ Not a multi-quiz, returning original questions');
    return null;
  }

  console.log('🎲 Generating dynamic multi-quiz questions with proper range restrictions...');
  
  const preserveQuizOrder = quiz.multiQuizSources?.preserveQuizOrder || false;
  console.log(`🎯 Multi-quiz generation mode: ${preserveQuizOrder ? 'PRESERVE QUIZ ORDER' : 'FULLY RANDOM'}`);

  try {
    console.log('🎯 STEP 1: Collecting ALL questions from nested sources (no filtering)...');
    
    // STEP 1: Collect ALL questions from all sources recursively (no range filtering)
    const collectionResult = await collectAllRecursiveQuestions(
      quiz,
      storage,
      preserveQuizOrder
    );

    console.log(`📚 STEP 1 COMPLETE: Collected ${collectionResult.questions.length} total questions from ${collectionResult.sections.length} sources`);
    console.log(`📊 Collection breakdown:`, collectionResult.sections.map(s => `${s.sectionName}: ${s.questions.length} questions (all available)`));

    console.log('🎯 STEP 2: Applying range restrictions at ROOT LEVEL ONLY...');
    
    // STEP 2: Apply range filtering only at the root level
    const filteredResult = applyRootLevelFiltering(
      collectionResult.sections,
      preserveQuizOrder
    );

    console.log(`📊 STEP 2 COMPLETE: Filtered to ${filteredResult.questions.length} questions`);
    console.log(`📊 Filtering breakdown:`, filteredResult.sections.map(s => `${s.sectionName}: ${s.actualSelected}/${s.questions.length + s.totalAvailable - s.questions.length} questions selected`));

    // STEP 3: Apply final quiz-level question limit if specified
    let finalQuestions = filteredResult.questions;
    if (quiz.questionLimit && quiz.questionLimit < finalQuestions.length) {
      console.log(`🎯 STEP 3: Applying quiz-level question limit: ${quiz.questionLimit} (from ${finalQuestions.length} available)`);
      
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
      console.log('🔀 Applied final random shuffle across all questions');
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

    console.log(`🎉 GENERATION COMPLETE: ${finalQuestions.length} questions from ${filteredResult.sections.length} sources`);
    console.log(`📊 Final breakdown:`, filteredResult.sections.map(s => `${s.sectionName}: ${s.actualSelected} questions selected`));

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
    console.error('❌ Error in new two-step collection/filtering, falling back to legacy method:', error);
    
    // Fallback to legacy method
    return await generateMultiQuizQuestionsLegacy(quiz, storage);
  }
}

async function generateMultiQuizQuestionsLegacy(
  quiz: Quiz,
  storage: StorageService
): Promise<MultiQuizGenerationResult | null> {
  console.log('🔧 Using legacy multi-quiz generation method');
  
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
        console.warn(`⚠️ Source quiz ${source.quizId} not found`);
        continue;
      }

      // Get questions from leaf nodes only (not intermediate multi-quiz nodes)
      let sourceQuestions = await collectLeafQuestions(sourceQuiz, storage);
      
      console.log(`🌳 Leaf-based question collection for "${sourceQuiz.title}":`, {
        isMultiQuiz: !!sourceQuiz.multiQuizSources,
        leafQuestions: sourceQuestions.length,
        directQuestions: sourceQuiz.questions?.length || 0,
        usingLeafExtraction: true
      });
      
      if (!sourceQuestions || sourceQuestions.length === 0) {
        console.warn(`⚠️ Source quiz ${source.quizId} has no leaf questions available`);
        continue;
      }

      console.log(`📖 Processing ${sourceQuiz.title}: ${sourceQuestions.length} available questions (including nested sources)`);

      // Handle shuffling based on preserve order setting
      const preserveQuizOrder = quiz.multiQuizSources?.preserveQuizOrder || false;
      
      if (!preserveQuizOrder) {
        // If NOT preserving order, use proper Fisher-Yates shuffle for random selection
        for (let i = sourceQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sourceQuestions[i], sourceQuestions[j]] = [sourceQuestions[j], sourceQuestions[i]];
        }
        console.log(`🔀 Applied Fisher-Yates shuffle to ${sourceQuiz.title} for random selection`);
      } else {
        // ✅ PRESERVE ORDER: Keep questions in their original order, no random selection
        // Don't modify sourceQuestions array at all when preserving order
        console.log(`📚 Keeping ALL questions from ${sourceQuiz.title} in original order (preserve quiz order enabled)`);
        console.log(`📚 Source has ${sourceQuestions.length} questions available for section`);
      }

      // Determine how many questions to select from this source
      let selectedCount;
      
      if (preserveQuizOrder && source.fixedCount) {
        // ✅ PRESERVE ORDER + FIXED COUNT: Take exactly what user specified
        selectedCount = source.minQuestions; // Use exactly the fixed count
        console.log(`📚 PRESERVE ORDER: Taking exactly ${selectedCount} questions from "${sourceQuiz.title}" (fixed count)`);
      } else if (preserveQuizOrder) {
        // ✅ PRESERVE ORDER + RANGE: Take minimum to preserve section boundaries
        selectedCount = source.minQuestions; // Take minimum to preserve section structure
        console.log(`📚 PRESERVE ORDER: Taking ${selectedCount} questions from "${sourceQuiz.title}" (minimum for section preservation)`);
      } else {
        // Random mode: use original logic
        selectedCount = source.fixedCount 
          ? source.minQuestions
          : Math.floor(Math.random() * (source.maxQuestions - source.minQuestions + 1)) + source.minQuestions;
          
        console.log(`🎯 RANDOM MODE: Question selection for "${sourceQuiz.title}":`, {
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
          const exists = mergedMedia.find(m => m.id === mediaItem.id);
          if (!exists) {
            mergedMedia.push(mediaItem);
          }
        });
        console.log(`📁 Added ${sourceQuiz.media.length} media items from "${sourceQuiz.title}"`);
      }

      // Select questions (limited by actual available questions)
      const actualCount = Math.min(selectedCount, sourceQuestions.length);
      const selectedQuestions = sourceQuestions.slice(0, actualCount);
      
      console.log(`🎯 Final selection for "${sourceQuiz.title}": ${actualCount} questions selected from ${sourceQuestions.length} available`);
      
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
          
          console.log(`🔍 Processing text for media references: "${text.substring(0, 100)}..."`);
          
          // Replace [img:X] and [audio:X] references
          return text.replace(/\[(img|audio):(\d+)\]/g, (match, type, num) => {
            const oldIndex = parseInt(num) - 1; // Convert to 0-based
            console.log(`🔍 Found media reference: ${match}, oldIndex: ${oldIndex}`);
            
            // Check if this index exists in the source quiz media
            if (sourceQuiz.media && oldIndex >= 0 && oldIndex < sourceQuiz.media.length) {
              const sourceMediaItem = sourceQuiz.media[oldIndex];
              console.log(`📋 Source media item:`, { id: sourceMediaItem.id || `${sourceQuiz.id}_${oldIndex}`, type: sourceMediaItem.type, name: sourceMediaItem.name });
              
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
                console.log(`➕ Added media item to merged array at index ${newIndex}:`, { id: sourceMediaItem.id, name: sourceMediaItem.name });
              } else {
                console.log(`✅ Found media item in merged array at index ${newIndex}`);
              }
              
              const newReference = `[${type}:${newIndex + 1}]`;
              console.log(`🔄 Updated reference: ${match} -> ${newReference}`);
              return newReference;
            } else {
              console.warn(`⚠️ Media reference ${match} not found in source media array (length: ${sourceQuiz.media?.length || 0})`);
              console.warn(`⚠️ Available media in source:`, sourceQuiz.media?.map((m, i) => `${i}: ${m.name}`));
            }
            
            return match; // Return original if not found
          });
        };
        
        // Update question text and options with media references
        console.log(`🔧 Updating media references for question: "${updatedQ.substring(0, 50)}..."`);
        console.log(`🔧 Source quiz media items: ${sourceQuiz.media?.length || 0}`);
        console.log(`🔧 Current merged media items: ${mergedMedia.length}`);
        
        updatedQ = updateMediaReferences(updatedQ);
        updatedO = updatedO.map(option => 
          typeof option === 'string' ? updateMediaReferences(option) : option
        );
        
        console.log(`✅ Updated question text: "${updatedQ.substring(0, 50)}..."`);
        console.log(`✅ Updated options:`, updatedO.map(o => typeof o === 'string' ? o.substring(0, 30) : o));
        
        return {
          q: updatedQ,
          o: updatedO,
          a: typeof q.a === 'number' ? q.a : (typeof q.answer === 'number' ? q.answer : 0),
          _sourceQuiz: sourceQuiz.id,
          _sourceTitle: sourceQuiz.title,
          _originalIndex: originalIndex >= 0 ? originalIndex : questionIndex, // Track TRUE original position in source quiz
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

      console.log(`✅ Selected ${actualCount}/${selectedCount} questions from "${sourceQuiz.title}"`);
      
    } catch (error) {
      console.error(`❌ Error processing source quiz ${source.quizId}:`, error);
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

      console.log(`📝 Added ${manualQuestions.length} manual questions`);
    }
  }

  // Apply final question limit and ordering
  let finalQuestions = mergedQuestions;
  const finalPreserveQuizOrder = quiz.multiQuizSources?.preserveQuizOrder || false;
  
  if (quiz.questionLimit && quiz.questionLimit < mergedQuestions.length) {
    if (finalPreserveQuizOrder) {
      // For preserved order: DO NOT redistribute questions across sections
      // Instead, warn user and use all questions (respecting section boundaries)
      console.warn(`⚠️ Preserve Quiz Order is enabled but total questions (${mergedQuestions.length}) exceed limit (${quiz.questionLimit})`);
      console.warn(`⚠️ Keeping all questions to preserve section integrity. Disable 'Preserve Quiz Order' to apply overall limit.`);
      finalQuestions = mergedQuestions; // Keep all questions to preserve section boundaries
    } else {
      // Fully random: use Fisher-Yates shuffle then trim
      const shuffledQuestions = [...mergedQuestions];
      for (let i = shuffledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
      }
      finalQuestions = shuffledQuestions.slice(0, quiz.questionLimit);
      console.log(`🔀 Applied Fisher-Yates shuffle before trimming to ${quiz.questionLimit} questions`);
    }
    metadata.finalLimit = quiz.questionLimit;
    console.log(`🎯 Applied final limit: ${finalQuestions.length}/${mergedQuestions.length} questions`);
  }

  // Handle randomization based on quiz settings
  if (quiz.randomize) {
    if (finalPreserveQuizOrder) {
      // ✅ PRESERVE ORDER + RANDOMIZE: Randomize within each section only
      console.log(`🎲 SECTION-WISE RANDOMIZATION: Randomizing questions within each section (preserve section boundaries)`);
      
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
        console.log(`🔀 Randomized ${sourceQuestions.length} questions within section: ${sourceId}`);
      });
      
      finalQuestions = randomizedQuestions;
      console.log(`🎲 Section-wise randomization complete: ${finalQuestions.length} questions randomized within their sections`);
      
    } else {
      // FULLY RANDOM: Randomize across all questions (original behavior)
      console.log(`🎲 FULL RANDOMIZATION: Randomizing all questions across entire quiz`);
      for (let i = finalQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
      }
      console.log(`🔀 Applied Fisher-Yates shuffle to all ${finalQuestions.length} questions`);
    }
  } else {
    console.log(`📚 NO RANDOMIZATION: Questions kept in original order`);
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
    console.log('🔀 Applied Fisher-Yates random shuffle across all sources');
  } else {
    // Quiz order preserved: maintain source grouping AND original order within groups
    console.log('📚 Preserving quiz order - maintaining source groups and original order within groups');
    
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
      
      console.log(`📖 Processing source group: ${sourceId} with ${sourceQuestions.length} questions`);
      
      // Sort by original index to maintain the original order from the source quiz
      const sortedGroup = [...sourceQuestions].sort((a, b) => {
        const aIndex = (a as any)._originalIndex || 0;
        const bIndex = (b as any)._originalIndex || 0;
        return aIndex - bIndex;
      });
      
      // Add this group to the final questions in original order
      regroupedQuestions.push(...sortedGroup);
      console.log(`✅ Added ${sortedGroup.length} questions from source: ${sourceId} in original order`);
    });
    
    finalQuestions = regroupedQuestions;
    console.log('📚 Quiz order preserved: questions grouped by source, maintained original order within groups');
  }

  metadata.totalQuestions = finalQuestions.length;

  console.log('🎉 Multi-quiz generation complete:', {
    sources: metadata.sources.length,
    totalQuestions: metadata.totalQuestions,
    finalLimit: metadata.finalLimit
  });

  console.log(`📁 Final merged media: ${mergedMedia.length} items total`);

  return {
    questions: finalQuestions,
    metadata,
    mergedMedia // Include merged media for quiz rendering
  } as MultiQuizGenerationResult & { mergedMedia: any[] };
}