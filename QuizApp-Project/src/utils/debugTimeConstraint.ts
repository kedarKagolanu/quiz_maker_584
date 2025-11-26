/**
 * Debug utility to test time constraint fixes
 * Run this in browser console to test the fixes
 */

import { validateTimeSettings } from './timeValidation';

export function testTimeConstraintFixes() {

  
  // Test 1: Both time limits set (should clear one)

  const test1 = validateTimeSettings("600", "30");



  
  // Test 2: Only total time limit

  const test2 = validateTimeSettings("300", "");



  
  // Test 3: Only per-question time limit  

  const test3 = validateTimeSettings("", "45");



  
  // Test 4: No time limits

  const test4 = validateTimeSettings("", "");



  
  // Test 5: Zero values (should be treated as no limit)

  const test5 = validateTimeSettings("0", "0");



  

  
  return {
    test1, test2, test3, test4, test5
  };
}

// Auto-run in development
if (process.env.NODE_ENV === 'development') {
  (window as any).testTimeConstraintFixes = testTimeConstraintFixes;

}
