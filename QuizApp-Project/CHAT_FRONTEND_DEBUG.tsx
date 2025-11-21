import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storage } from '@/lib/storage';

// Comprehensive Chat Debug Component
export const ChatFrontendDebug: React.FC = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    if (user) {
      runChatTests();
    }
  }, [user]);

  const runChatTests = async () => {
    if (!user) return;

    const info: any = {
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        idType: typeof user.id,
        usernameType: typeof user.username
      },
      tests: []
    };

    // Test 1: Basic storage connection
    try {
      const allUsers = await storage.getUsers();
      info.tests.push({
        name: 'Get Users',
        success: true,
        data: `${allUsers.length} users found`,
        users: allUsers.slice(0, 3).map(u => ({ id: u.id, username: u.username }))
      });
    } catch (error: any) {
      info.tests.push({
        name: 'Get Users',
        success: false,
        error: error.message
      });
    }

    // Test 2: Get chat groups
    try {
      const groups = await storage.getChatGroups?.() || [];
      info.tests.push({
        name: 'Get Chat Groups',
        success: true,
        data: `${groups.length} groups found`,
        groups: groups.map(g => ({
          id: g.id,
          name: g.name,
          creator: g.creator,
          members: g.members,
          type: g.type
        }))
      });
    } catch (error: any) {
      info.tests.push({
        name: 'Get Chat Groups',
        success: false,
        error: error.message
      });
    }

    // Test 3: Create test group
    try {
      const testGroup = {
        id: `debug_test_${Date.now()}`,
        name: `Debug Test ${Date.now()}`,
        creator: user.id,
        members: [user.id],
        createdAt: Date.now(),
        isPrivate: false,
        type: 'group' as const
      };

      await storage.saveChatGroup?.(testGroup);
      info.tests.push({
        name: 'Create Test Group',
        success: true,
        data: 'Group created successfully',
        testGroup
      });

      // Verify it was saved by reading it back
      const groupsAfterSave = await storage.getChatGroups?.() || [];
      const foundTestGroup = groupsAfterSave.find(g => g.id === testGroup.id);
      
      info.tests.push({
        name: 'Verify Group Persistence',
        success: !!foundTestGroup,
        data: foundTestGroup ? 'Group found after save' : 'Group NOT found after save',
        foundGroup: foundTestGroup
      });

    } catch (error: any) {
      info.tests.push({
        name: 'Create Test Group',
        success: false,
        error: error.message
      });
    }

    setDebugInfo(info);
  };

  const createRealTestGroup = async () => {
    if (!user) return;

    const testGroup = {
      id: `real_test_${Date.now()}`,
      name: `Real Test Group ${new Date().toLocaleTimeString()}`,
      creator: user.id,
      members: [user.id],
      createdAt: Date.now(),
      isPrivate: false,
      type: 'group' as const
    };

    try {
      console.log('🧪 Creating real test group:', testGroup);
      await storage.saveChatGroup?.(testGroup);
      console.log('✅ Real test group created');
      
      // Reload tests
      await runChatTests();
      
    } catch (error) {
      console.error('❌ Failed to create real test group:', error);
    }
  };

  if (!user) return <div>Not logged in</div>;

  return (
    <div className="fixed top-4 left-4 bg-blue-900 border border-blue-600 p-4 rounded z-50 text-xs max-w-md max-h-96 overflow-y-auto text-white">
      <div className="font-bold mb-2 text-blue-200">🔬 Chat Frontend Debug</div>
      
      <div className="space-y-2 mb-4">
        <div><strong>User:</strong> {debugInfo.user?.username} ({debugInfo.user?.id})</div>
        <div><strong>ID Type:</strong> {debugInfo.user?.idType}</div>
        <div><strong>Username Type:</strong> {debugInfo.user?.usernameType}</div>
      </div>

      <div className="space-y-2 mb-4">
        {debugInfo.tests?.map((test: any, i: number) => (
          <div key={i} className={`p-2 rounded ${test.success ? 'bg-green-800' : 'bg-red-800'}`}>
            <div className="font-bold">{test.success ? '✅' : '❌'} {test.name}</div>
            <div className="text-xs">{test.data || test.error}</div>
            {test.groups && (
              <div className="mt-1 text-xs">
                Groups: {test.groups.map((g: any) => `${g.name} (${g.members?.length || 0})`).join(', ')}
              </div>
            )}
            {test.foundGroup && (
              <div className="mt-1 text-xs bg-green-900 p-1 rounded">
                Found: {test.foundGroup.name} - Creator: {test.foundGroup.creator}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <button 
          onClick={runChatTests}
          className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
        >
          🔄 Rerun Tests
        </button>
        <button 
          onClick={createRealTestGroup}
          className="w-full px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs"
        >
          🧪 Create Real Test Group
        </button>
      </div>

      <div className="mt-2 text-xs text-blue-300">
        Last updated: {debugInfo.timestamp ? new Date(debugInfo.timestamp).toLocaleTimeString() : 'Never'}
      </div>
    </div>
  );
};

// Add this to Dashboard.tsx temporarily:
// import { ChatFrontendDebug } from './CHAT_FRONTEND_DEBUG';
// <ChatFrontendDebug />