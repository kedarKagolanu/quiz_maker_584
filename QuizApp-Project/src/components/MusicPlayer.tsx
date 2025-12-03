import React, { useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, Minimize2, Maximize2, X, Shuffle, Repeat } from "lucide-react";
import { useMusicContext } from "@/contexts/MusicContext";

interface MusicPlayerProps {
  isAdvanced?: boolean;
}

const MusicPlayer = React.memo<MusicPlayerProps>(({ isAdvanced = false }) => {
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
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');

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

  const toggleShuffle = () => setIsShuffleOn(!isShuffleOn);
  
  const toggleRepeat = () => {
    const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = clickX / rect.width;
    const newTime = progress * duration;
    seekTo(newTime);
  };

  const getTrackDisplayName = (track: any) => {
    if (!track) return "No track selected";
    // Extract filename without extension
    let name = track.name || track.file?.name || "Unknown Track";
    if (name.includes('.')) {
      name = name.substring(0, name.lastIndexOf('.'));
    }
    // Clean up common music file patterns
    name = name.replace(/^\d+[\s\-\.]*/, ''); // Remove track numbers
    name = name.replace(/[\-_]/g, ' '); // Replace dashes/underscores with spaces
    return name;
  };

  if (!isVisible) {
    return null;
  }

  if (!currentlyPlaying || musicFiles.length === 0) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-terminal border border-terminal-accent rounded-lg shadow-lg p-3 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="text-terminal-accent hover:text-terminal-bright"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          
          <div className="text-sm">
            <div className="text-terminal-bright font-medium truncate max-w-[150px]">
              {getTrackDisplayName(currentTrack)}
            </div>
          </div>

          <button
            onClick={() => setIsMinimized(false)}
            className="text-terminal-dim hover:text-terminal-bright"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gradient-to-br from-terminal to-terminal/95 border border-terminal-accent/50 rounded-xl shadow-2xl backdrop-blur-sm p-5 min-w-[380px] z-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-terminal-accent/20 rounded-lg">
            <Music className="w-5 h-5 text-terminal-accent" />
          </div>
          <div>
            <span className="text-terminal-bright font-semibold">Music Player</span>
            {currentTrack && musicFiles.length > 1 && (
              <div className="text-xs text-terminal-dim">
                Track {musicFiles.findIndex(f => f.id === currentlyPlaying) + 1} of {musicFiles.length}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-terminal-dim hover:text-terminal-bright transition-all hover:bg-terminal-accent/10 p-1 rounded"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-terminal-dim hover:text-terminal-bright transition-all hover:bg-red-500/20 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Track Info */}
      <div className="mb-4 bg-terminal-accent/10 rounded-lg p-3">
        <div className="text-terminal-bright font-medium truncate text-lg">
          {getTrackDisplayName(currentTrack)}
        </div>
        <div className="flex items-center justify-between text-terminal-dim text-sm mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="mb-6">
        <div 
          className="w-full bg-terminal-dim/30 rounded-full h-3 cursor-pointer hover:h-4 transition-all shadow-inner relative group"
          onClick={handleSeek}
        >
          <div
            className="bg-gradient-to-r from-terminal-accent to-terminal-bright h-full rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
          <div 
            className="absolute top-1/2 w-4 h-4 bg-terminal-bright rounded-full shadow-lg transform -translate-y-1/2 transition-all opacity-0 group-hover:opacity-100"
            style={{ 
              left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={playPrevious}
          disabled={!currentTrack || musicFiles.length <= 1}
          className="text-terminal-dim hover:text-terminal-bright disabled:opacity-30 disabled:cursor-not-allowed transition-all transform hover:scale-110 p-2 hover:bg-terminal-accent/10 rounded-lg"
          title="Previous track"
        >
          <SkipBack className="w-6 h-6" />
        </button>

        <button
          onClick={() => skipSeconds(-10)}
          disabled={!currentTrack}
          className="text-terminal-dim hover:text-terminal-bright disabled:opacity-30 transition-all transform hover:scale-110 p-1"
          title="Rewind 10s"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        
        <button
          onClick={togglePlay}
          disabled={!currentTrack}
          className="bg-gradient-to-r from-terminal-accent to-terminal-bright hover:from-terminal-bright hover:to-terminal-accent text-terminal rounded-full p-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
        >
          {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
        </button>

        <button
          onClick={() => skipSeconds(10)}
          disabled={!currentTrack}
          className="text-terminal-dim hover:text-terminal-bright disabled:opacity-30 transition-all transform hover:scale-110 p-1"
          title="Forward 10s"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        
        <button
          onClick={playNext}
          disabled={!currentTrack || musicFiles.length <= 1}
          className="text-terminal-dim hover:text-terminal-bright disabled:opacity-30 disabled:cursor-not-allowed transition-all transform hover:scale-110 p-2 hover:bg-terminal-accent/10 rounded-lg"
          title="Next track"
        >
          <SkipForward className="w-6 h-6" />
        </button>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShuffle}
            className={`transition-all transform hover:scale-110 p-2 rounded-lg ${
              isShuffleOn 
                ? 'text-terminal-accent bg-terminal-accent/20' 
                : 'text-terminal-dim hover:text-terminal-bright hover:bg-terminal-accent/10'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`transition-all transform hover:scale-110 p-2 rounded-lg relative ${
              repeatMode !== 'off' 
                ? 'text-terminal-accent bg-terminal-accent/20' 
                : 'text-terminal-dim hover:text-terminal-bright hover:bg-terminal-accent/10'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            <Repeat className="w-4 h-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-xs bg-terminal-accent text-terminal rounded-full w-4 h-4 flex items-center justify-center">1</span>
            )}
          </button>
        </div>

        <div className="text-xs text-terminal-dim">
          {musicFiles.length > 0 && `${musicFiles.length} tracks available`}
        </div>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 bg-terminal-accent/5 rounded-lg p-3">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="text-terminal-dim hover:text-terminal-bright transition-all transform hover:scale-110"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        
        <div className="flex-1 relative">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-2 bg-terminal-dim/30 rounded-full appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, var(--terminal-accent) 0%, var(--terminal-accent) ${(isMuted ? 0 : volume) * 100}%, rgba(var(--terminal-dim), 0.3) ${(isMuted ? 0 : volume) * 100}%, rgba(var(--terminal-dim), 0.3) 100%)`
            }}
          />
        </div>
        
        <span className="text-xs text-terminal-dim min-w-[3ch]">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>
    </div>
  );
});

export { MusicPlayer };
