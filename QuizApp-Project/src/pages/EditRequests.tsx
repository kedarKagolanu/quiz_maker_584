import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { EditRequest, Quiz, QuizFolder } from "@/types/quiz";
import { toast } from "sonner";
import { Check, X, FileText, Folder, Clock } from "lucide-react";

export const EditRequests: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadRequests();
  }, [user, navigate]);

  const loadRequests = async () => {
    const allRequests = await storage.getEditRequests();
    
    // Filter requests where user is either creator or requester
    const userRequests = [];
    
    for (const req of allRequests) {
      if (req.requestedBy === user?.id) {
        userRequests.push(req);
        continue;
      }
      
      // Check if user owns the resource
      if (req.resourceType === 'quiz') {
        const quiz = await storage.getQuizById(req.resourceId);
        if (quiz?.creator === user?.id) {
          userRequests.push(req);
          continue;
        }
        
        // Check if user is admin
        const perms = await storage.getQuizPermissions(req.resourceId);
        if (perms.some(p => p.userId === user?.id && p.role === 'admin')) {
          userRequests.push(req);
        }
      } else {
        const folders = await storage.getFolders();
        const folder = folders.find(f => f.id === req.resourceId);
        if (folder?.creator === user?.id) {
          userRequests.push(req);
          continue;
        }
        
        // Check if user is admin
        const perms = await storage.getFolderPermissions(req.resourceId);
        if (perms.some(p => p.userId === user?.id && p.role === 'admin')) {
          userRequests.push(req);
        }
      }
    }
    
    setRequests(userRequests);
  };

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    
    try {
      const request = requests.find(r => r.id === requestId);
      
      // If this is an access request, grant editor permission
      if (request?.changes?.requestType === 'editor_access') {
        if (request.resourceType === 'quiz') {
          await storage.saveQuizPermission?.({
            quizId: request.resourceId,
            userId: request.requestedBy,
            role: 'editor',
            grantedBy: user.id,
          });
        } else if (request.resourceType === 'folder') {
          await storage.saveFolderPermission?.({
            folderId: request.resourceId,
            userId: request.requestedBy,
            role: 'editor',
            grantedBy: user.id,
          });
        }
      }
      
      await storage.updateEditRequest(requestId, 'approved', user.id, "Access granted");
      await loadRequests();
      toast.success("Request approved!");
    } catch (error) {
      toast.error("Failed to approve request");
    }
  };

  const handleReject = async (requestId: string, message?: string) => {
    if (!user) return;
    
    const reason = message || prompt("Reason for rejection (optional):");
    await storage.updateEditRequest(requestId, 'rejected', user.id, reason || undefined);
    await loadRequests();
    toast.success("Edit request rejected");
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  if (!user) return null;

  return (
    <Terminal title="edit-requests">
      <TerminalLine>Manage edit requests for your quizzes and folders</TerminalLine>

      <div className="mt-4 flex gap-2">
        <TerminalButton onClick={() => setFilter('all')}>
          all ({requests.length})
        </TerminalButton>
        <TerminalButton onClick={() => setFilter('pending')}>
          pending ({requests.filter(r => r.status === 'pending').length})
        </TerminalButton>
        <TerminalButton onClick={() => setFilter('approved')}>
          approved ({requests.filter(r => r.status === 'approved').length})
        </TerminalButton>
        <TerminalButton onClick={() => setFilter('rejected')}>
          rejected ({requests.filter(r => r.status === 'rejected').length})
        </TerminalButton>
      </div>

      <div className="mt-6 space-y-4">
        {filteredRequests.length === 0 ? (
          <TerminalLine prefix="-" className="text-terminal-dim">
            No {filter !== 'all' ? filter : ''} edit requests
          </TerminalLine>
        ) : (
          filteredRequests.map(req => (
            <div key={req.id} className="border border-terminal-accent/30 p-4 rounded space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {req.resourceType === 'quiz' ? (
                    <FileText className="w-4 h-4 text-terminal-accent" />
                  ) : (
                    <Folder className="w-4 h-4 text-terminal-accent" />
                  )}
                  <span className="text-terminal-bright">
                    {req.changes?.requestType === 'editor_access' 
                      ? `${req.resourceType === 'quiz' ? 'Quiz' : 'Folder'} Access Request`
                      : `${req.resourceType === 'quiz' ? 'Quiz' : 'Folder'} Edit Request`
                    }
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    req.status === 'pending' ? 'bg-yellow-900/20 text-yellow-300' :
                    req.status === 'approved' ? 'bg-green-900/20 text-green-300' :
                    'bg-red-900/20 text-red-300'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-terminal-dim">
                  <Clock className="w-3 h-3" />
                  {new Date(req.requestedAt).toLocaleString()}
                </div>
              </div>

              {req.message && (
                <div className="text-sm text-terminal-dim">
                  <span className="text-terminal-bright">Message:</span> {req.message}
                </div>
              )}

              {req.changes && req.changes.requestType !== 'editor_access' && (
                <>
                  <button
                    onClick={() => setShowDetails(showDetails === req.id ? null : req.id)}
                    className="text-sm text-terminal-accent hover:underline"
                  >
                    {showDetails === req.id ? 'Hide' : 'Show'} proposed changes
                  </button>

                  {showDetails === req.id && (
                    <pre className="text-xs bg-terminal-accent/10 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(req.changes, null, 2)}
                    </pre>
                  )}
                </>
              )}

              {req.status === 'pending' && req.requestedBy !== user.id && (
                <div className="flex gap-2 mt-2">
                  <TerminalButton onClick={() => handleApprove(req.id)}>
                    <Check className="w-4 h-4 inline mr-1" />approve
                  </TerminalButton>
                  <TerminalButton onClick={() => handleReject(req.id)}>
                    <X className="w-4 h-4 inline mr-1" />reject
                  </TerminalButton>
                </div>
              )}

              {req.reviewMessage && (
                <div className="text-sm text-terminal-dim mt-2">
                  <span className="text-terminal-bright">Review:</span> {req.reviewMessage}
                </div>
              )}
            </div>
          ))
        )}

        <div className="flex gap-3 pt-4">
          <TerminalButton onClick={() => navigate("/dashboard")}>back to dashboard</TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};
