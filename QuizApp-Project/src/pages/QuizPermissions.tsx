import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton, TerminalInput } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { Quiz, QuizPermission, ResourceRole, User } from "@/types/quiz";
import { toast } from "sonner";
import { Trash2, UserPlus, Shield } from "lucide-react";

export const QuizPermissions: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [permissions, setPermissions] = useState<QuizPermission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<ResourceRole>("viewer");

  useEffect(() => {
    if (!user || !quizId) {
      navigate("/");
      return;
    }
    loadData();
  }, [user, quizId, navigate]);

  const loadData = async () => {
    if (!quizId) return;
    
    const quizData = await storage.getQuizById(quizId);
    if (!quizData) {
      toast.error("Quiz not found");
      navigate("/my-quizzes");
      return;
    }
    
    // Check if user is creator or admin
    const perms = await storage.getQuizPermissions(quizId);
    const userPerm = perms.find(p => p.userId === user?.id);
    if (quizData.creator !== user?.id && userPerm?.role !== 'admin') {
      toast.error("You don't have permission to manage this quiz");
      navigate("/my-quizzes");
      return;
    }
    
    setQuiz(quizData);
    setPermissions(perms);
    
    const allUsers = await storage.getUsers();
    setUsers(allUsers.filter(u => u.id !== quizData.creator));
  };

  const handleAddPermission = async () => {
    if (!quizId || !selectedUserId) return;
    
    await storage.saveQuizPermission({
      quizId,
      userId: selectedUserId,
      role: selectedRole,
      grantedBy: user?.id,
    });
    
    setShowAddUser(false);
    setSelectedUserId("");
    setSelectedRole("viewer");
    await loadData();
    toast.success("Permission granted!");
  };

  const handleUpdateRole = async (permissionId: string, newRole: ResourceRole) => {
    await storage.updateQuizPermission(permissionId, newRole);
    await loadData();
    toast.success("Role updated!");
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (confirm("Remove this user's access?")) {
      await storage.deleteQuizPermission(permissionId);
      await loadData();
      toast.success("Permission removed!");
    }
  };

  if (!quiz) return null;

  const availableUsers = users.filter(u => !permissions.some(p => p.userId === u.id));

  return (
    <Terminal title={`manage-permissions - ${quiz.title}`}>
      <TerminalLine>Manage who can access and edit this quiz</TerminalLine>
      
      <div className="mt-4">
        <TerminalLine prefix="#">Access Code: {quiz.accessCode || "None"}</TerminalLine>
        <TerminalLine prefix="#">Edit Mode: {quiz.editMode === 'no_edits' ? 'No edits accepted' : 'Pull requests accepted'}</TerminalLine>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex justify-between items-center">
          <TerminalLine prefix="#">Users with Access</TerminalLine>
          <TerminalButton onClick={() => setShowAddUser(true)}>
            <UserPlus className="w-4 h-4 inline mr-1" />add user
          </TerminalButton>
        </div>

        {showAddUser && availableUsers.length > 0 && (
          <div className="border border-terminal-accent/30 p-4 rounded space-y-3">
            <div className="flex items-center gap-2">
              <span>User:</span>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
              >
                <option value="">Select user...</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ResourceRole)}
                className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded"
              >
                <option value="viewer">Viewer (can only view/attempt)</option>
                <option value="editor">Editor (can request edits)</option>
                <option value="admin">Admin (can approve edits)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <TerminalButton onClick={handleAddPermission}>grant permission</TerminalButton>
              <TerminalButton onClick={() => {
                setShowAddUser(false);
                setSelectedUserId("");
              }}>cancel</TerminalButton>
            </div>
          </div>
        )}

        {permissions.length === 0 ? (
          <TerminalLine prefix="-" className="text-terminal-dim">No additional users have access</TerminalLine>
        ) : (
          <div className="space-y-2">
            {permissions.map(perm => {
              const permUser = users.find(u => u.id === perm.userId);
              return (
                <div key={perm.id} className="border border-terminal-accent/30 p-3 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-terminal-accent" />
                    <span className="text-terminal-bright">{permUser?.username || 'Unknown'}</span>
                    <span className="text-xs text-terminal-dim">
                      {new Date(perm.grantedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={perm.role}
                      onChange={(e) => handleUpdateRole(perm.id, e.target.value as ResourceRole)}
                      className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <TerminalButton onClick={() => handleDeletePermission(perm.id)}>
                      <Trash2 className="w-4 h-4" />
                    </TerminalButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <TerminalButton onClick={() => navigate("/my-quizzes")}>back to my quizzes</TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};
