import React, { useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, Minimize2, Maximize2, X } from "lucide-react";
import { useMusicContext } from "@/contexts/MusicContext";
import { MusicPlayerRestore } from "./MusicPlayerRestore";

export const MusicPlayer: React.FC = () => {
  const {
    currentlyPlaying,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    pauseMusic,
    resumeMusic,
    stopMusic,
    seekTo,
    skipSeconds,
    setVolume,
    setIsMuted,
    musicFiles,
    playNext,
    playPrevious
  } = useMusicContext();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const currentTrack = musicFiles.find(file => file.id === currentlyPlaying);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseMusic();
    } else {
      resumeMusic();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!currentTrack) {
    return null; // Don't show player if no music is playing
  }

  if (!isVisible) {
    return <MusicPlayerRestore onRestore={() => setIsVisible(true)} />;
  }

  // Minimized view - small box in bottom right
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-terminal border border-terminal-accent rounded-lg shadow-lg z-40 p-3 cursor-pointer hover:bg-terminal-accent/10 transition-colors"
           onClick={() => setIsMinimized(false)}>
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <Pause className="w-4 h-4 text-terminal-accent" />
          ) : (
            <Play className="w-4 h-4 text-terminal-accent" />
          )}
          <div className="text-xs text-terminal-bright truncate max-w-[120px]">
            {currentTrack.title}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-terminal border border-terminal-accent rounded-lg p-4 shadow-lg z-40 min-w-[320px]">
      <div className="text-terminal-foreground mb-3">
        <div className="text-sm font-semibold text-terminal-bright flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            Now Playing
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
              title="Minimize player"
            >
              <Minimize2 className="w-3 h-3 text-terminal-dim hover:text-terminal-foreground" />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
              title="Close player"
            >
              <X className="w-3 h-3 text-terminal-dim hover:text-terminal-foreground" />
            </button>
          </div>
        </div>
        <div className="text-xs text-terminal-dim mt-1">{currentTrack.title}</div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-terminal-dim mb-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div 
          className="w-full bg-terminal-dim/30 rounded-full h-2 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            seekTo(percent * duration);
          }}
        >
          <div 
            className="bg-terminal-accent h-2 rounded-full transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={playPrevious}
          className="p-2 hover:bg-terminal-accent/20 rounded transition-colors"
          aria-label="Previous track"
        >
          <SkipBack className="w-4 h-4 text-terminal-foreground" />
        </button>
        
        <button
          onClick={togglePlay}
          className="p-2 bg-terminal-accent hover:bg-terminal-accent/80 rounded transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-terminal" />
          ) : (
            <Play className="w-5 h-5 text-terminal" />
          )}
        </button>
        
        <button
          onClick={playNext}
          className="p-2 hover:bg-terminal-accent/20 rounded transition-colors"
          aria-label="Next track"
        >
          <SkipForward className="w-4 h-4 text-terminal-foreground" />
        </button>

        <div className="flex-1 flex items-center gap-2 ml-2">
          <button
            onClick={toggleMute}
            className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-terminal-foreground" />
            ) : (
              <Volume2 className="w-4 h-4 text-terminal-foreground" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 accent-terminal-accent"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-xs text-terminal-dim">
          User music library
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => skipSeconds(-10)}
            className="text-xs text-terminal-dim hover:text-terminal-foreground transition-colors"
          >
            -10s
          </button>
          <button
            onClick={() => skipSeconds(10)}
            className="text-xs text-terminal-dim hover:text-terminal-foreground transition-colors"
          >
            +10s
          </button>
        </div>
      </div>
    </div>
  );
};
