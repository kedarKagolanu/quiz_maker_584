import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { ChatGroup, ChatMessage, Quiz, QuizFolder } from "@/types/quiz";
import { MessageCircle, Users, Plus, Send, Share2, ExternalLink, Hash, Lock, UserPlus, RefreshCw, Folder, Globe } from "lucide-react";
import { PageDescription } from "@/components/PageDescription";
import { toast } from "sonner";

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [myFolders, setMyFolders] = useState<QuizFolder[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showShareQuiz, setShowShareQuiz] = useState(false);
  const [showShareFolder, setShowShareFolder] = useState(false);
  const [showStartDirectChat, setShowStartDirectChat] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [createGroupForm, setCreateGroupForm] = useState({ name: "", description: "", isPrivate: false });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joinGroupCode, setJoinGroupCode] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadData();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup);
    }
  }, [selectedGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadData = async () => {
    if (!user) {
      console.log('❌ No user for loadData');
      return;
    }
    
    console.log('🔍 Loading chat data for user:', user.id, user.username);
    
    try {
      // Load chat groups where user is a member
      console.log('📡 Fetching chat groups...');
      const allGroups = await storage.getChatGroups() || [];
      console.log('📊 All groups from storage:', allGroups);
      
      // Filter for user's groups (check both string and UUID formats)
      const userGroups = allGroups.filter(g => {
        const isMember = g.members.includes(user.id) || g.members.includes(user.username);
        const isCreator = g.creator === user.id || g.creator === user.username;
        console.log(`📝 Group ${g.name}: member=${isMember}, creator=${isCreator}`, {
          groupMembers: g.members,
          groupCreator: g.creator,
          userId: user.id,
          username: user.username
        });
        return isMember || isCreator;
      });
      
      console.log('✅ User groups filtered:', userGroups);
      setGroups(userGroups);
      
      // Load user's quizzes for sharing
      const allQuizzes = await storage.getQuizzes();
      setMyQuizzes(allQuizzes.filter(q => q.creator === user.id));
      
      // Load user's folders for sharing
      const allFolders = await storage.getFolders();
      setMyFolders(allFolders.filter(f => f.creator === user.id));
      
      // Load all users for direct chat
      const users = await storage.getUsers();
      setAllUsers(users.filter(u => u.id !== user.id));
      
      console.log('📊 Final chat data loaded:', {
        groups: userGroups.length,
        quizzes: allQuizzes.length,
        users: users.length
      });
      
    } catch (error) {
      console.error('❌ Failed to load chat data:', error);
      toast.error('Failed to load chat data');
    }
  };

  const loadMessages = async (groupId: string) => {
    try {
      const groupMessages = await storage.getChatMessages(groupId) || [];
      setMessages(groupMessages.sort((a, b) => a.timestamp - b.timestamp));
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !user) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      groupId: selectedGroup,
      userId: user.id,
      username: user.username,
      content: newMessage.trim(),
      type: 'text',
      timestamp: Date.now(),
    };

    await storage.saveChatMessage(message);
    setMessages(prev => [...prev, message]);
    setNewMessage("");
  };

  const handleShareQuiz = async (quizId: string) => {
    if (!selectedGroup || !user) return;

    const quiz = myQuizzes.find(q => q.id === quizId);
    if (!quiz) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      groupId: selectedGroup,
      userId: user.id,
      username: user.username,
      content: `📝 Shared quiz: ${quiz.title}`,
      type: 'quiz_share',
      quizId: quiz.id,
      timestamp: Date.now(),
    };

    await storage.saveChatMessage(message);
    setMessages(prev => [...prev, message]);
    setShowShareQuiz(false);
    toast.success("Quiz shared with group!");
  };

  const handleShareFolder = async (folderId: string) => {
    if (!selectedGroup || !user) return;

    const folder = myFolders.find(f => f.id === folderId);
    if (!folder) return;

    const folderPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
    const accessInfo = folder.isPublic 
      ? "📂 Public folder" 
      : folder.accessCode 
        ? `📁 Private folder (Code: ${folder.accessCode})`
        : "📁 Private folder";

    const message: ChatMessage = {
      id: Date.now().toString(),
      groupId: selectedGroup,
      userId: user.id,
      username: user.username,
      content: `${accessInfo}: ${folderPath}`,
      type: 'folder_share',
      quizId: folderId, // Use quizId field to store folder ID
      timestamp: Date.now(),
    };

    await storage.saveChatMessage(message);
    setMessages(prev => [...prev, message]);
    setShowShareFolder(false);
    toast.success("Folder shared with group!");
  };

  const handleRefreshChat = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    console.log('🔄 Manual refresh triggered');
    
    try {
      await loadData();
      if (selectedGroup) {
        await loadMessages(selectedGroup);
      }
      toast.success("Chat refreshed!");
    } catch (error) {
      console.error('Failed to refresh chat:', error);
      toast.error("Failed to refresh chat");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh functionality with user control
  useEffect(() => {
    if (!autoRefresh || !selectedGroup) return;
    
    console.log('🔄 Auto-refresh enabled for group:', selectedGroup);
    
    const interval = setInterval(async () => {
      console.log('🔄 Auto-refreshing messages...');
      try {
        await loadMessages(selectedGroup);
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, 3000); // 3-second refresh
    
    return () => {
      console.log('🔄 Auto-refresh disabled');
      clearInterval(interval);
    };
  }, [autoRefresh, selectedGroup]);

  // Auto-refresh groups (less frequent)
  useEffect(() => {
    if (!autoRefresh || !user) return;
    
    const groupInterval = setInterval(async () => {
      console.log('🔄 Auto-refreshing groups...');
      try {
        await loadData();
      } catch (error) {
        console.error('Group auto-refresh failed:', error);
      }
    }, 10000); // 10-second refresh for groups
    
    return () => clearInterval(groupInterval);
  }, [autoRefresh, user]);

  const handleCreateGroup = async () => {
    if (!createGroupForm.name.trim() || !user) return;

    const accessCode = createGroupForm.isPrivate 
      ? Math.random().toString(36).substring(2, 8).toUpperCase()
      : undefined;

    // Use both user ID and username for compatibility
    const memberId = user.id || user.username;
    const creatorId = user.id || user.username;
    
    const newGroup: ChatGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: createGroupForm.name.trim(),
      description: createGroupForm.description.trim() || undefined,
      creator: creatorId,
      members: [memberId],
      createdAt: Date.now(),
      isPrivate: createGroupForm.isPrivate,
      accessCode,
      type: 'group',
    };
    
    console.log('🆕 Creating new group:', newGroup);

    try {
      console.log('💾 Saving group to storage...');
      await storage.saveChatGroup(newGroup);
      console.log('✅ Group saved to storage successfully');
      
      // Add to local state immediately
      setGroups(prev => {
        const updated = [...prev, newGroup];
        console.log('📊 Updated local groups:', updated);
        return updated;
      });
      
      setShowCreateGroup(false);
      setCreateGroupForm({ name: "", description: "", isPrivate: false });
      setSelectedGroup(newGroup.id);
      
      if (accessCode) {
        toast.success(`Group created! Access code: ${accessCode}`, { duration: 8000 });
        // Copy to clipboard
        navigator.clipboard?.writeText(accessCode);
      } else {
        toast.success("Group created!");
      }
      
      // Reload data to verify persistence
      setTimeout(() => {
        console.log('🔄 Reloading data to verify persistence...');
        loadData();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleJoinGroup = async () => {
    if (!joinGroupCode.trim() || !user) return;

    try {
      const inputCode = joinGroupCode.trim().toUpperCase();
      console.log('🔍 Trying to join with code:', inputCode);
      
      // Get ALL groups (not just user's groups) to find the one with matching access code
      const allGroups = await storage.getAllChatGroups() || [];
      console.log('📊 All available groups:', allGroups.map(g => ({
        id: g.id,
        name: g.name,
        accessCode: g.accessCode,
        isPrivate: g.isPrivate,
        members: g.members
      })));
      
      // Find group with matching access code (case insensitive)
      const group = allGroups.find(g => {
        if (!g.accessCode) return false;
        const groupCode = g.accessCode.toUpperCase();
        console.log(`🔍 Comparing "${inputCode}" with "${groupCode}" (${g.name})`);
        return groupCode === inputCode;
      });

      if (!group) {
        console.error('❌ No group found with access code:', inputCode);
        console.log('Available codes:', allGroups.filter(g => g.accessCode).map(g => g.accessCode));
        toast.error("Invalid access code");
        return;
      }
      
      console.log('✅ Found group:', group);

      if (group.members.includes(user.id)) {
        toast.error("You're already a member of this group");
        setShowJoinGroup(false);
        setJoinGroupCode("");
        setSelectedGroup(group.id);
        return;
      }

      // Add user to group
      const updatedGroup = {
        ...group,
        members: [...group.members, user.id]
      };

      await storage.updateChatGroup(updatedGroup);
      
      // Update local state
      setGroups(prev => {
        const existing = prev.find(g => g.id === group.id);
        if (existing) {
          return prev.map(g => g.id === group.id ? updatedGroup : g);
        } else {
          return [...prev, updatedGroup];
        }
      });
      
      setShowJoinGroup(false);
      setJoinGroupCode("");
      setSelectedGroup(group.id);
      toast.success(`Joined group: ${group.name}`);
    } catch (error) {
      console.error('Failed to join group:', error);
      toast.error('Failed to join group');
    }
  };

  const handleStartDirectChat = async (userId: string, username: string) => {
    if (!user) return;

    // Check if direct chat already exists
    const existingChat = groups.find(g => 
      g.type === 'direct' && 
      g.members.includes(userId) && 
      g.members.includes(user.id)
    );

    if (existingChat) {
      setSelectedGroup(existingChat.id);
      setShowStartDirectChat(false);
      return;
    }

    // Create new direct chat
    const directChat: ChatGroup = {
      id: `direct_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: `${user.username}, ${username}`,
      creator: user.id,
      members: [user.id, userId],
      createdAt: Date.now(),
      isPrivate: true,
      type: 'direct',
    };

    try {
      await storage.saveChatGroup(directChat);
      setGroups(prev => [...prev, directChat]);
      setSelectedGroup(directChat.id);
      setShowStartDirectChat(false);
      toast.success(`Started chat with ${username}`);
    } catch (error) {
      console.error('Failed to start direct chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  if (!user) return null;

  return (
    <>
    <Terminal title="chat groups">
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Groups Sidebar */}
        <div className="w-80 border-r border-terminal-accent/30 pr-4 mr-4">
          <div className="flex items-center justify-between mb-4">
            <TerminalLine prefix="#">Chats</TerminalLine>
            <div className="flex gap-2">
              <TerminalButton onClick={() => setShowStartDirectChat(true)} title="Start Direct Chat">
                <UserPlus className="w-4 h-4" />
              </TerminalButton>
              <TerminalButton onClick={() => setShowCreateGroup(true)} title="Create Group">
                <Plus className="w-4 h-4" />
              </TerminalButton>
              <TerminalButton onClick={() => setShowJoinGroup(true)} title="Join Group">
                <Hash className="w-4 h-4" />
              </TerminalButton>
              <TerminalButton 
                onClick={handleRefreshChat} 
                title="Manual Refresh"
                className={isRefreshing ? 'opacity-50' : ''}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </TerminalButton>
              <TerminalButton 
                onClick={() => setAutoRefresh(!autoRefresh)} 
                title={`Auto-refresh: ${autoRefresh ? 'ON' : 'OFF'}`}
                className={autoRefresh ? 'bg-terminal-accent/20' : ''}
              >
                {autoRefresh ? '⏸️' : '▶️'}
              </TerminalButton>
            </div>
          </div>

          <div className="space-y-2 max-h-[calc(100%-4rem)] overflow-y-auto">
            {groups.length === 0 ? (
              <TerminalLine prefix="-" className="text-terminal-dim">
                No chats yet. Start one!
              </TerminalLine>
            ) : (
              groups.map(group => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    selectedGroup === group.id
                      ? 'border-terminal-accent bg-terminal-accent/20'
                      : 'border-terminal-accent/30 hover:border-terminal-accent/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {group.type === 'direct' ? (
                      <MessageCircle className="w-4 h-4" />
                    ) : group.isPrivate ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                    <span className="text-terminal-bright">{group.name}</span>
                    {group.accessCode && (
                      <span className="text-xs bg-terminal-accent/20 px-1 rounded">
                        {group.accessCode}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-terminal-dim mt-1">
                    {group.type === 'direct' 
                      ? 'Direct chat'
                      : `${group.members.length} member${group.members.length !== 1 ? 's' : ''}`
                    }
                  </div>
                  {group.description && (
                    <div className="text-xs text-terminal-dim mt-1">{group.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedGroupData ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-terminal-accent/30 pb-2 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <TerminalLine prefix="#">{selectedGroupData.name}</TerminalLine>
                    {selectedGroupData.description && (
                      <div className="text-sm text-terminal-dim ml-6">{selectedGroupData.description}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <TerminalButton onClick={() => setShowShareQuiz(true)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Quiz
                    </TerminalButton>
                    <TerminalButton onClick={() => setShowShareFolder(true)}>
                      <Folder className="w-4 h-4 mr-2" />
                      Share Folder
                    </TerminalButton>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.length === 0 ? (
                  <TerminalLine prefix="-" className="text-terminal-dim">
                    No messages yet. Start the conversation!
                  </TerminalLine>
                ) : (
                  messages.map(message => (
                    <div key={message.id} className="space-y-1">
                      <div className="text-xs text-terminal-dim">
                        <span className="text-terminal-bright">{message.username}</span>
                        {' • '}
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="ml-4">
                        {message.type === 'quiz_share' ? (
                          <div className="flex items-center gap-2 p-2 border border-terminal-accent/30 rounded">
                            <MessageCircle className="w-4 h-4 text-terminal-accent" />
                            <span>{message.content}</span>
                            {message.quizId && (
                              <TerminalButton
                                onClick={() => navigate(`/quiz/${message.quizId}/customize`)}
                                className="ml-auto"
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Take Quiz
                              </TerminalButton>
                            )}
                          </div>
                        ) : message.type === 'folder_share' ? (
                          <div className="flex items-center gap-2 p-2 border border-terminal-accent/30 rounded">
                            <Folder className="w-4 h-4 text-terminal-accent" />
                            <span>{message.content}</span>
                            <div className="ml-auto flex gap-2">
                              <TerminalButton
                                onClick={() => {
                                  if (message.quizId) {
                                    // Extract access code from message content if it's a private folder
                                    const codeMatch = message.content.match(/Code: ([A-Z0-9]+)/);
                                    if (codeMatch) {
                                      // Navigate to browse page with pre-filled access code
                                      navigate(`/browse-quizzes?accessCode=${codeMatch[1]}`);
                                    } else {
                                      // Public folder - navigate to browse page
                                      navigate('/browse-quizzes');
                                    }
                                  }
                                }}
                                className="text-xs"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Browse Folder
                              </TerminalButton>
                            </div>
                          </div>
                        ) : (
                          <span className="text-terminal-foreground">{message.content}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-terminal border border-terminal-accent/30 text-terminal-bright rounded focus:outline-none focus:border-terminal-accent"
                />
                <TerminalButton onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </TerminalButton>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <TerminalLine prefix=">" className="text-terminal-dim">
                Select a group to start chatting
              </TerminalLine>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Dialog */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
            <TerminalLine prefix="#">Create Chat Group</TerminalLine>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={createGroupForm.name}
                onChange={(e) => setCreateGroupForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Group name"
                className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
              />
              <textarea
                value={createGroupForm.description}
                onChange={(e) => setCreateGroupForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={2}
                className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createGroupForm.isPrivate}
                  onChange={(e) => setCreateGroupForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
                />
                <span className="text-terminal-bright">Private group (requires access code)</span>
              </label>
              <div className="flex gap-2">
                <TerminalButton onClick={handleCreateGroup}>create</TerminalButton>
                <TerminalButton onClick={() => setShowCreateGroup(false)}>cancel</TerminalButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Group Dialog */}
      {showJoinGroup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
            <TerminalLine prefix="#">Join Chat Group</TerminalLine>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={joinGroupCode}
                onChange={(e) => setJoinGroupCode(e.target.value.toUpperCase())}
                placeholder="GROUP-CODE"
                className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded uppercase"
              />
              <div className="flex gap-2">
                <TerminalButton onClick={handleJoinGroup}>join</TerminalButton>
                <TerminalButton onClick={() => setShowJoinGroup(false)}>cancel</TerminalButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Folder Dialog */}
      {showShareFolder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
            <TerminalLine prefix="#">Share Folder</TerminalLine>
            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
              {myFolders.length === 0 ? (
                <TerminalLine prefix="-" className="text-terminal-dim">
                  No folders to share
                </TerminalLine>
              ) : (
                myFolders.map(folder => {
                  const folderPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => handleShareFolder(folder.id)}
                      className="p-3 border border-terminal-accent/30 rounded cursor-pointer hover:border-terminal-accent/60"
                    >
                      <div className="flex items-center gap-2">
                        {folder.isPublic ? (
                          <Globe className="w-4 h-4 text-terminal-accent" />
                        ) : (
                          <Lock className="w-4 h-4 text-terminal-accent" />
                        )}
                        <span className="text-terminal-bright">{folderPath}</span>
                      </div>
                      <div className="text-xs text-terminal-dim">
                        {folder.isPublic ? 'Public folder' : `Private folder ${folder.accessCode ? `(Code: ${folder.accessCode})` : ''}`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4">
              <TerminalButton onClick={() => setShowShareFolder(false)}>cancel</TerminalButton>
            </div>
          </div>
        </div>
      )}

      {/* Share Quiz Dialog */}
      {showShareQuiz && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
            <TerminalLine prefix="#">Share Quiz</TerminalLine>
            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
              {myQuizzes.length === 0 ? (
                <TerminalLine prefix="-" className="text-terminal-dim">
                  No quizzes to share
                </TerminalLine>
              ) : (
                myQuizzes.map(quiz => (
                  <div
                    key={quiz.id}
                    onClick={() => handleShareQuiz(quiz.id)}
                    className="p-3 border border-terminal-accent/30 rounded cursor-pointer hover:border-terminal-accent/60"
                  >
                    <div className="text-terminal-bright">{quiz.title}</div>
                    <div className="text-xs text-terminal-dim">
                      {quiz.questions.length} questions
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4">
              <TerminalButton onClick={() => setShowShareQuiz(false)}>cancel</TerminalButton>
            </div>
          </div>
        </div>
      )}

      {/* Share Folder Dialog */}
      {showShareFolder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
            <TerminalLine prefix="#">Share Folder</TerminalLine>
            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
              {myFolders.length === 0 ? (
                <TerminalLine prefix="-" className="text-terminal-dim">
                  No folders to share
                </TerminalLine>
              ) : (
                myFolders.map(folder => {
                  const folderPath = folder.parentPath ? `${folder.parentPath}/${folder.name}` : folder.name;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => handleShareFolder(folder.id)}
                      className="p-3 border border-terminal-accent/30 rounded cursor-pointer hover:border-terminal-accent/60"
                    >
                      <div className="flex items-center gap-2">
                        {folder.isPublic ? (
                          <Globe className="w-4 h-4 text-terminal-accent" />
                        ) : (
                          <Lock className="w-4 h-4 text-terminal-accent" />
                        )}
                        <span className="text-terminal-bright">{folderPath}</span>
                      </div>
                      <div className="text-xs text-terminal-dim">
                        {folder.isPublic ? 'Public folder' : `Private folder ${folder.accessCode ? `(Code: ${folder.accessCode})` : ''}`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4">
              <TerminalButton onClick={() => setShowShareFolder(false)}>cancel</TerminalButton>
            </div>
          </div>
        </div>
      )}

      {/* Start Direct Chat Dialog */}
      {showStartDirectChat && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
            <TerminalLine prefix="#">Start Direct Chat</TerminalLine>
            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
              {allUsers.length === 0 ? (
                <TerminalLine prefix="-" className="text-terminal-dim">
                  No other users found
                </TerminalLine>
              ) : (
                allUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleStartDirectChat(user.id, user.username)}
                    className="p-3 border border-terminal-accent/30 rounded cursor-pointer hover:border-terminal-accent/60 flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-terminal-bright">{user.username}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4">
              <TerminalButton onClick={() => setShowStartDirectChat(false)}>cancel</TerminalButton>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6">
        <TerminalButton onClick={() => navigate("/dashboard")}>back to dashboard</TerminalButton>
      </div>

    {/* Page Description */}
    <div className="mt-6 p-4 border border-terminal-accent/30 rounded bg-terminal-accent/10">
      <div className="text-terminal-bright font-semibold mb-3 flex items-center gap-2">
        💬 Chat Groups Guide
      </div>
      <div className="text-xs text-terminal-foreground space-y-1">
        <div><strong>🌐 Public Groups:</strong> Create open discussion spaces for everyone</div>
        <div><strong>🔒 Private Groups:</strong> Exclusive chats with access codes for members only</div>
        <div><strong>👥 Direct Messages:</strong> Start private 1-on-1 conversations with any user</div>
        <div><strong>🔗 Quiz Sharing:</strong> Share quizzes and folders with clickable links in chat</div>
        <div><strong>🔄 Auto-refresh:</strong> Toggle real-time messaging or use manual refresh</div>
        <div><strong>🎫 Access Codes:</strong> Join private groups using codes shared by others</div>
        <div><strong>📱 Real-time:</strong> Messages update automatically for seamless conversation</div>
      </div>
    </div>
    </Terminal>
    </>
  );
};