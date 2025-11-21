import React, { useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, Clock, Minimize2, X } from "lucide-react";
import { useMusicContext } from "@/contexts/MusicContext";
import { MusicPlayerRestore } from "./MusicPlayerRestore";

export const MusicPlayerAdvanced: React.FC = () => {
  const {
    currentlyPlaying,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    musicFiles,
    playMusic,
    pauseMusic,
    resumeMusic,
    stopMusic,
    seekTo,
    skipSeconds,
    setVolume,
    setIsMuted,
    playNext,
    playPrevious
  } = useMusicContext();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Get current track info
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

  // Don't show if no music files
  if (musicFiles.length === 0) {
    return null;
  }

  // Show restore button if hidden
  if (!isVisible) {
    return <MusicPlayerRestore onRestore={() => setIsVisible(true)} />;
  }

  // Minimized view - small box in bottom right
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-terminal border border-terminal-accent rounded-lg shadow-lg z-40 p-3 cursor-pointer hover:bg-terminal-accent/10 transition-colors"
           onClick={() => setIsMinimized(false)}>
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-terminal-accent" />
          <div className="text-xs text-terminal-bright">
            Music Library ({musicFiles.length})
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-terminal border border-terminal-accent rounded-lg p-4 shadow-lg z-40 space-y-4 max-w-md">
      {/* Header */}
      <div className="text-terminal-foreground">
        <div className="text-sm font-semibold text-terminal-bright flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            My Music Library ({musicFiles.length} {musicFiles.length === 1 ? 'track' : 'tracks'})
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
        
        {currentTrack ? (
          <div className="text-xs text-terminal-dim">
            Now Playing: <span className="text-terminal-foreground">{currentTrack.title}</span>
          </div>
        ) : (
          <div className="text-xs text-terminal-dim">No track selected</div>
        )}
      </div>

      {/* Music List */}
      <div className="max-h-32 overflow-y-auto space-y-1">
        {musicFiles.map((file) => (
          <div 
            key={file.id}
            className={`p-2 rounded text-xs cursor-pointer transition-colors flex items-center justify-between ${
              currentlyPlaying === file.id 
                ? 'bg-terminal-accent/30 text-terminal-bright' 
                : 'hover:bg-terminal-accent/10 text-terminal-foreground'
            }`}
            onClick={() => playMusic(file)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {currentlyPlaying === file.id && isPlaying ? (
                <Pause className="w-3 h-3 flex-shrink-0" />
              ) : (
                <Play className="w-3 h-3 flex-shrink-0" />
              )}
              <div className="truncate">{file.title}</div>
            </div>
            {file.duration && (
              <div className="text-terminal-dim flex items-center gap-1 flex-shrink-0 ml-2">
                <Clock className="w-3 h-3" />
                {formatTime(file.duration)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Player Controls - Only show if a track is selected */}
      {currentTrack && (
        <div className="space-y-3 pt-2 border-t border-terminal-accent/30">
          {/* Progress Bar */}
          <div>
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

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={playPrevious}
              className="p-2 hover:bg-terminal-accent/20 rounded transition-colors"
              aria-label="Previous track"
              disabled={musicFiles.length <= 1}
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
              disabled={musicFiles.length <= 1}
            >
              <SkipForward className="w-4 h-4 text-terminal-foreground" />
            </button>

            {/* Skip buttons */}
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => skipSeconds(-10)}
                className="text-xs text-terminal-dim hover:text-terminal-foreground transition-colors px-1"
              >
                -10s
              </button>
              <button
                onClick={() => skipSeconds(10)}
                className="text-xs text-terminal-dim hover:text-terminal-foreground transition-colors px-1"
              >
                +10s
              </button>
            </div>

            {/* Volume Controls */}
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
        </div>
      )}
    </div>
  );
};