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
              {currentTrack?.name || "Unknown Track"}
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
    <div className="fixed bottom-4 right-4 bg-terminal border border-terminal-accent rounded-lg shadow-lg p-4 min-w-[320px] z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-terminal-accent" />
          <span className="text-terminal-bright font-medium">Music Player</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-terminal-dim hover:text-terminal-bright"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-terminal-dim hover:text-terminal-bright"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-terminal-bright font-medium truncate">
          {currentTrack?.name || "Unknown Track"}
        </div>
        <div className="text-terminal-dim text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-terminal-dim rounded-full h-2 mb-2">
          <div
            className="bg-terminal-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mb-3">
        {isAdvanced && (
          <button
            onClick={toggleShuffle}
            className={`text-terminal-dim hover:text-terminal-bright ${isShuffleOn ? 'text-terminal-accent' : ''}`}
          >
            <Shuffle className="w-4 h-4" />
          </button>
        )}
        
        <button
          onClick={playPrevious}
          className="text-terminal-dim hover:text-terminal-bright"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        
        <button
          onClick={togglePlay}
          className="bg-terminal-accent hover:bg-terminal-accent/80 text-terminal rounded-full p-2"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        
        <button
          onClick={playNext}
          className="text-terminal-dim hover:text-terminal-bright"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {isAdvanced && (
          <button
            onClick={toggleRepeat}
            className={`text-terminal-dim hover:text-terminal-bright ${repeatMode !== 'off' ? 'text-terminal-accent' : ''}`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        )}
      </div>

      {isAdvanced && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => skipSeconds(-10)}
            className="text-terminal-dim hover:text-terminal-bright text-sm"
          >
            -10s
          </button>
          
          <button
            onClick={() => skipSeconds(10)}
            className="text-terminal-dim hover:text-terminal-bright text-sm"
          >
            +10s
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="text-terminal-dim hover:text-terminal-bright"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full accent-terminal-accent"
          />
        </div>
      </div>
    </div>
  );
});

export { MusicPlayer };
