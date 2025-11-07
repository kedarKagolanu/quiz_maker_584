import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Music } from "lucide-react";

interface MusicSelectorProps {
  onSelectMusic: (musicUrl: string, musicName: string) => void;
  className?: string;
}

export const MusicSelector: React.FC<MusicSelectorProps> = ({ onSelectMusic, className = "" }) => {
  const { user } = useAuth();
  
  const userMusicFiles = user?.musicFiles || [];

  if (userMusicFiles.length === 0) {
    return (
      <div className={`text-terminal-dim text-sm ${className}`}>
        <Music className="w-4 h-4 inline mr-2" />
        No music files uploaded yet. Upload music in your profile to reuse it here.
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm text-terminal-bright flex items-center gap-2">
        <Music className="w-4 h-4" />
        Your Music Library
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
        {userMusicFiles.map((music, idx) => (
          <button
            key={idx}
            onClick={() => onSelectMusic(music.url, music.name)}
            className="text-left border border-terminal-accent/30 rounded p-2 hover:border-terminal-accent hover:bg-terminal-accent/10 transition-colors text-sm"
          >
            <div className="text-terminal-bright truncate">{music.name}</div>
            <div className="text-xs text-terminal-dim">Click to use</div>
          </button>
        ))}
      </div>
    </div>
  );
};
