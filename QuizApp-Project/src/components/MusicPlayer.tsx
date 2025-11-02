import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from "lucide-react";

const STUDY_TRACKS = [
  {
    name: "Focus Flow",
    bpm: 120,
    frequencies: [261.63, 293.66, 329.63, 392.00, 440.00], // C, D, E, G, A (Pentatonic)
  },
  {
    name: "Deep Concentration",
    bpm: 90,
    frequencies: [220.00, 246.94, 293.66, 329.63, 369.99], // A, B, D, E, F#
  },
  {
    name: "Quick Pace",
    bpm: 140,
    frequencies: [349.23, 392.00, 440.00, 493.88, 523.25], // F, G, A, B, C
  },
];

export const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<number | null>(null);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const stopMusic = () => {
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Already stopped
      }
    });
    oscillatorsRef.current = [];
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const playNote = (frequency: number, duration: number) => {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = gainNodeRef.current || ctx.createGain();
    
    if (!gainNodeRef.current) {
      gainNodeRef.current = gainNode;
      gainNode.connect(ctx.destination);
    }

    oscillator.connect(gainNode);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.value = isMuted ? 0 : volume;

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
    
    oscillatorsRef.current.push(oscillator);
    
    setTimeout(() => {
      const index = oscillatorsRef.current.indexOf(oscillator);
      if (index > -1) {
        oscillatorsRef.current.splice(index, 1);
      }
    }, duration * 1000);
  };

  const playPattern = () => {
    const track = STUDY_TRACKS[currentTrack];
    const beatDuration = 60 / track.bpm;
    
    const playSequence = () => {
      const freq = track.frequencies[Math.floor(Math.random() * track.frequencies.length)];
      playNote(freq, beatDuration * 0.8);
      
      // Add occasional harmony
      if (Math.random() > 0.7) {
        const harmonyFreq = track.frequencies[Math.floor(Math.random() * track.frequencies.length)];
        setTimeout(() => playNote(harmonyFreq * 0.5, beatDuration * 0.6), beatDuration * 250);
      }
    };

    playSequence();
    intervalRef.current = window.setInterval(playSequence, beatDuration * 1000);
  };

  useEffect(() => {
    if (isPlaying) {
      playPattern();
    } else {
      stopMusic();
    }

    return () => stopMusic();
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % STUDY_TRACKS.length);
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + STUDY_TRACKS.length) % STUDY_TRACKS.length);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-terminal border border-terminal-accent rounded-lg p-4 shadow-lg z-50 min-w-[280px]">
      <div className="text-terminal-foreground mb-3">
        <div className="text-sm font-semibold text-terminal-bright">Study Music</div>
        <div className="text-xs text-terminal-dim mt-1">{STUDY_TRACKS[currentTrack].name} ({STUDY_TRACKS[currentTrack].bpm} BPM)</div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={prevTrack}
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
          onClick={nextTrack}
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
            max="100"
            value={volume * 100}
            onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
            className="flex-1 accent-terminal-accent"
          />
        </div>
      </div>
      
      <div className="text-xs text-terminal-dim">
        Generative ambient music for focus
      </div>
    </div>
  );
};
