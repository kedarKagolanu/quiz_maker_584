import React from "react";
import { Music } from "lucide-react";
import { useMusicContext } from "@/contexts/MusicContext";

interface MusicPlayerRestoreProps {
  onRestore: () => void;
}

export const MusicPlayerRestore: React.FC<MusicPlayerRestoreProps> = ({ onRestore }) => {
  const { musicFiles, currentlyPlaying, isPlaying } = useMusicContext();

  // Only show if there are music files
  if (musicFiles.length === 0) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-4 bg-terminal border border-terminal-accent rounded-lg shadow-lg z-30 p-2 cursor-pointer hover:bg-terminal-accent/10 transition-colors"
      onClick={onRestore}
      title="Show music player"
    >
      <div className="flex items-center gap-2">
        <Music className={`w-4 h-4 ${isPlaying ? 'text-terminal-accent animate-pulse' : 'text-terminal-dim'}`} />
        <div className="text-xs text-terminal-bright">
          {currentlyPlaying ? 'Playing' : 'Music'} ({musicFiles.length})
        </div>
      </div>
    </div>
  );
};