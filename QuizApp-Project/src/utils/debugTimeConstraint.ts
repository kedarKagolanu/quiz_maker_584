/**
 * Debug utility to test time constraint fixes
 * Run this in browser console to test the fixes
 */

import { validateTimeSettings } from './timeValidation';

export function testTimeConstraintFixes() {
  console.log('🧪 Testing Time Constraint Fixes...\n');
  
  // Test 1: Both time limits set (should clear one)
  console.log('Test 1: Both time limits set');
  const test1 = validateTimeSettings("600", "30");
  console.log('Input: timeLimit=600, perQuestionTimeLimit=30');
  console.log('Output:', test1);
  console.log('Expected: Only perQuestionTimeLimit should be set\n');
  
  // Test 2: Only total time limit
  console.log('Test 2: Only total time limit');
  const test2 = validateTimeSettings("300", "");
  console.log('Input: timeLimit=300, perQuestionTimeLimit=""');
  console.log('Output:', test2);
  console.log('Expected: Only timeLimit should be set\n');
  
  // Test 3: Only per-question time limit  
  console.log('Test 3: Only per-question time limit');
  const test3 = validateTimeSettings("", "45");
  console.log('Input: timeLimit="", perQuestionTimeLimit=45');
  console.log('Output:', test3);
  console.log('Expected: Only perQuestionTimeLimit should be set\n');
  
  // Test 4: No time limits
  console.log('Test 4: No time limits');
  const test4 = validateTimeSettings("", "");
  console.log('Input: timeLimit="", perQuestionTimeLimit=""');
  console.log('Output:', test4);
  console.log('Expected: Both should be undefined\n');
  
  // Test 5: Zero values (should be treated as no limit)
  console.log('Test 5: Zero values');
  const test5 = validateTimeSettings("0", "0");
  console.log('Input: timeLimit="0", perQuestionTimeLimit="0"');
  console.log('Output:', test5);
  console.log('Expected: Both should be undefined\n');
  
  console.log('✅ Time constraint tests completed!');
  
  return {
    test1, test2, test3, test4, test5
  };
}

// Auto-run in development
if (process.env.NODE_ENV === 'development') {
  (window as any).testTimeConstraintFixes = testTimeConstraintFixes;
  console.log('🔧 Time constraint test function available as window.testTimeConstraintFixes()');
}