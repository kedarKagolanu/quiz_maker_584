import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { toast } from "sonner";

export const RequestAccess: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const resourceType = searchParams.get("type") as 'quiz' | 'folder';
  const resourceId = searchParams.get("id");
  
  const [accessCode, setAccessCode] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    navigate("/");
    return null;
  }

  if (!resourceType || !resourceId) {
    navigate("/dashboard");
    return null;
  }

  const handleAccessCodeSubmit = async () => {
    if (!accessCode.trim()) {
      toast.error("Please enter an access code");
      return;
    }

    setLoading(true);
    try {
      // Try to get resource by access code
      if (resourceType === 'quiz') {
        const quiz = await storage.getQuizByAccessCode(accessCode);
        if (quiz && quiz.id === resourceId) {
          // Grant viewer permission automatically
          await storage.saveQuizPermission?.({
            quizId: resourceId,
            userId: user.id,
            role: 'viewer',
            grantedBy: quiz.creator,
          });
          toast.success("Access granted! You can now view this quiz.");
          navigate("/my-quizzes");
          return;
        }
      } else {
        const folder = await storage.getFolderByAccessCode(accessCode);
        if (folder && folder.id === resourceId) {
          // Grant viewer permission automatically
          await storage.saveFolderPermission?.({
            folderId: resourceId,
            userId: user.id,
            role: 'viewer',
            grantedBy: folder.creator,
          });
          toast.success("Access granted! You can now view this folder.");
          navigate("/my-quizzes");
          return;
        }
      }
      
      toast.error("Invalid access code for this resource");
    } catch (error) {
      toast.error("Failed to verify access code");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async () => {
    if (!requestMessage.trim()) {
      toast.error("Please provide a reason for requesting access");
      return;
    }

    setLoading(true);
    try {
      await storage.saveEditRequest?.({
        resourceType,
        resourceId,
        requestedBy: user.id,
        message: requestMessage,
        changes: { requestType: 'editor_access' }, // Mark this as access request
      });
      
      toast.success("Access request sent! The creator will review it.");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to send request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Terminal title={`request access - ${resourceType}`}>
      <div className="space-y-6">
        <TerminalLine prefix="#">
          Request Access to {resourceType === 'quiz' ? 'Quiz' : 'Folder'}
        </TerminalLine>

        {/* Access Code Section */}
        <div className="border border-terminal-accent/30 rounded p-4 space-y-3">
          <TerminalLine prefix="$">Option 1: Use Access Code</TerminalLine>
          <div className="ml-6 space-y-3">
            <p className="text-terminal-dim text-sm">
              If you have an access code for this {resourceType}, enter it below:
            </p>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter access code..."
              className="px-3 py-2 bg-terminal/50 border border-terminal-accent/30 rounded text-terminal-bright focus:outline-none focus:border-terminal-accent max-w-md"
            />
            <TerminalButton onClick={handleAccessCodeSubmit} disabled={loading}>
              {loading ? "verifying..." : "submit code"}
            </TerminalButton>
          </div>
        </div>

        {/* Request Permission Section */}
        <div className="border border-terminal-accent/30 rounded p-4 space-y-3">
          <TerminalLine prefix="$">Option 2: Request Editor Access</TerminalLine>
          <div className="ml-6 space-y-3">
            <p className="text-terminal-dim text-sm">
              Request editor permissions from the creator:
            </p>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Why do you need editor access?"
              rows={3}
              className="px-3 py-2 bg-terminal/50 border border-terminal-accent/30 rounded text-terminal-bright focus:outline-none focus:border-terminal-accent max-w-md w-full"
            />
            <TerminalButton onClick={handleRequestSubmit} disabled={loading}>
              {loading ? "sending..." : "send request"}
            </TerminalButton>
          </div>
        </div>

        <div className="flex gap-2">
          <TerminalButton onClick={() => navigate(-1)}>back</TerminalButton>
        </div>
      </div>
    </Terminal>
  );
};
