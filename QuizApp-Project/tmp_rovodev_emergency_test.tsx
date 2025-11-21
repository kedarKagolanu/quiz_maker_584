import React, { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

export const EmergencyTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any>({});
  
  useEffect(() => {
    const runTests = async () => {
      const results: any = { timestamp: new Date().toISOString() };
      
      try {
        // Test 1: Basic storage
        console.log('Testing storage connection...');
        const users = await storage.getUsers();
        results.users = { count: users.length, success: true };
        console.log('✅ Users loaded:', users.length);
      } catch (error: any) {
        results.users = { success: false, error: error.message };
        console.error('❌ Users failed:', error);
      }
      
      try {
        // Test 2: Quizzes
        console.log('Testing quiz loading...');
        const quizzes = await storage.getQuizzes();
        results.quizzes = { count: quizzes.length, success: true };
        console.log('✅ Quizzes loaded:', quizzes.length);
      } catch (error: any) {
        results.quizzes = { success: false, error: error.message };
        console.error('❌ Quizzes failed:', error);
      }
      
      try {
        // Test 3: Chat groups
        console.log('Testing chat groups...');
        const groups = await storage.getChatGroups?.() || [];
        results.chatGroups = { count: groups.length, success: true };
        console.log('✅ Chat groups loaded:', groups.length);
      } catch (error: any) {
        results.chatGroups = { success: false, error: error.message };
        console.error('❌ Chat groups failed:', error);
      }
      
      setTestResults(results);
    };
    
    runTests();
  }, []);
  
  return (
    <div className="fixed bottom-4 left-4 bg-red-900 border border-red-600 p-3 rounded z-50 text-xs max-w-sm">
      <div className="text-red-100 font-bold mb-2">🚨 Emergency Test Results</div>
      <div className="space-y-1 text-red-200">
        <div>Users: {testResults.users?.success ? `✅ ${testResults.users.count}` : `❌ ${testResults.users?.error}`}</div>
        <div>Quizzes: {testResults.quizzes?.success ? `✅ ${testResults.quizzes.count}` : `❌ ${testResults.quizzes?.error}`}</div>
        <div>Chat: {testResults.chatGroups?.success ? `✅ ${testResults.chatGroups.count}` : `❌ ${testResults.chatGroups?.error}`}</div>
      </div>
      <div className="mt-2 text-red-300 text-xs">
        Updated: {new Date(testResults.timestamp || Date.now()).toLocaleTimeString()}
      </div>
    </div>
  );
};