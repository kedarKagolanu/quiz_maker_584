import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Upload, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/storage";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandler";

const STUDY_TRACKS = [
  {
    name: "Focus Flow",
    bpm: 120,
    frequencies: [261.63, 293.66, 329.63, 392.00, 440.00],
  },
  {
    name: "Deep Concentration",
    bpm: 90,
    frequencies: [220.00, 246.94, 293.66, 329.63, 369.99],
  },
  {
    name: "Quick Pace",
    bpm: 140,
    frequencies: [349.23, 392.00, 440.00, 493.88, 523.25],
  },
];

interface MusicFile {
  name: string;
  url: string;
}

export const MusicPlayerAdvanced: React.FC = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [useCustomMusic, setUseCustomMusic] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [customTracks, setCustomTracks] = useState<MusicFile[]>([]);
  const [currentCustomTrack, setCurrentCustomTrack] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputElementRef = useRef<HTMLInputElement | null>(null);

  // Mount global input for dashboard access
  useEffect(() => {
    if (!user) return;
    
    const existingInput = document.getElementById('music-upload-input');
    if (existingInput) {
      inputElementRef.current = existingInput as HTMLInputElement;
      return; // Already exists
    }
    
    const globalInput = document.createElement('input');
    globalInput.type = 'file';
    globalInput.accept = 'audio/*';
    globalInput.multiple = true;
    globalInput.id = 'music-upload-input';
    globalInput.style.display = 'none';
    globalInput.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        const files = Array.from(target.files);
        for (const file of files) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const result = e.target?.result as string;
            const newTrack = { name: file.name, url: result };
            setCustomTracks((prev) => [...prev, newTrack]);
            
            if (user) {
              const updatedUser = {
                ...user,
                musicFiles: [...(user.musicFiles || []), newTrack],
              };
              await storage.saveUser(updatedUser);
              toast.success(`Added "${file.name}" to your music library`);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    });
    document.body.appendChild(globalInput);
    inputElementRef.current = globalInput;
    
    return () => {
      // Safe cleanup: check if element exists and has a parent before removing
      if (inputElementRef.current && inputElementRef.current.parentNode) {
        inputElementRef.current.parentNode.removeChild(inputElementRef.current);
      }
      inputElementRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    loadUserMusic();
  }, [user]);

  const loadUserMusic = async () => {
    if (!user) return;
    
    try {
      const currentUser = await storage.getCurrentUser();
      if (currentUser?.musicFiles) {
        setCustomTracks(currentUser.musicFiles);
      }
    } catch (error) {
      handleError(error, { 
        userMessage: "Failed to load your music files",
        logToConsole: true 
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files) return;

    const files = Array.from(e.target.files);
    
    for (const file of files) {
      if (!file.type.startsWith('audio/')) {
        toast.error(`${file.name} is not an audio file`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result) return;
        
        try {
          const audioData = event.target.result as string;
          
          // Save to storage
          const url = await storage.saveMedia(audioData, 'audio', file.name);
          
          const newTrack: MusicFile = {
            name: file.name,
            url: url
          };
          
          const currentUser = await storage.getCurrentUser();
          if (currentUser) {
            const updatedTracks = [...(currentUser.musicFiles || []), newTrack];
            currentUser.musicFiles = updatedTracks;
            await storage.saveUser(currentUser);
            setCustomTracks(updatedTracks);
            toast.success(`${file.name} uploaded!`);
          }
        } catch (error) {
          handleError(error, { 
            userMessage: `Failed to upload ${file.name}`,
            logToConsole: true 
          });
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteTrack = async (index: number) => {
    if (!user) return;
    
    try {
      const currentUser = await storage.getCurrentUser();
      if (currentUser && currentUser.musicFiles) {
        const trackToDelete = currentUser.musicFiles[index];
        
        // Delete from storage
        await storage.deleteMedia(trackToDelete.url);
        
        // Update user data
        currentUser.musicFiles = currentUser.musicFiles.filter((_, i) => i !== index);
        await storage.saveUser(currentUser);
        
        setCustomTracks(currentUser.musicFiles);
        toast.success("Track deleted");
        
        // Stop playing if current track was deleted
        if (currentCustomTrack === index && isPlaying) {
          setIsPlaying(false);
        }
        if (currentCustomTrack >= currentUser.musicFiles.length) {
          setCurrentCustomTrack(Math.max(0, currentUser.musicFiles.length - 1));
        }
      }
    } catch (error) {
      console.error("Error deleting track:", error);
      toast.error("Failed to delete track");
    }
  };

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const stopMusic = () => {
    // Stop generative music
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    oscillatorsRef.current = [];
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop custom music
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
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
      
      if (Math.random() > 0.7) {
        const harmonyFreq = track.frequencies[Math.floor(Math.random() * track.frequencies.length)];
        setTimeout(() => playNote(harmonyFreq * 0.5, beatDuration * 0.6), beatDuration * 250);
      }
    };

    playSequence();
    intervalRef.current = window.setInterval(playSequence, beatDuration * 1000);
  };

  const playCustomMusic = () => {
    if (customTracks.length === 0) return;
    
    const track = customTracks[currentCustomTrack];
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => {
        // Auto-play next track
        setCurrentCustomTrack((prev) => (prev + 1) % customTracks.length);
      });
    }
    
    audioRef.current.src = track.url;
    audioRef.current.volume = isMuted ? 0 : volume;
    audioRef.current.play();
  };

  useEffect(() => {
    if (isPlaying && enabled) {
      if (useCustomMusic && customTracks.length > 0) {
        playCustomMusic();
      } else {
        playPattern();
      }
    } else {
      stopMusic();
    }

    return () => stopMusic();
  }, [isPlaying, currentTrack, currentCustomTrack, useCustomMusic, enabled]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;
    }
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    if (useCustomMusic) {
      setCurrentCustomTrack((prev) => (prev + 1) % customTracks.length);
    } else {
      setCurrentTrack((prev) => (prev + 1) % STUDY_TRACKS.length);
    }
  };

  const prevTrack = () => {
    if (useCustomMusic) {
      setCurrentCustomTrack((prev) => (prev - 1 + customTracks.length) % customTracks.length);
    } else {
      setCurrentTrack((prev) => (prev - 1 + STUDY_TRACKS.length) % STUDY_TRACKS.length);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!enabled) {
    return (
      <button
        onClick={() => setEnabled(true)}
        className="fixed bottom-4 right-4 bg-terminal border border-terminal-accent rounded-lg p-3 shadow-lg z-50 hover:bg-terminal-accent/10 transition-colors"
        title="Enable music player"
      >
        <Volume2 className="w-5 h-5 text-terminal-foreground" />
      </button>
    );
  }

  const currentTrackName = useCustomMusic && customTracks.length > 0
    ? customTracks[currentCustomTrack].name
    : STUDY_TRACKS[currentTrack].name + ` (${STUDY_TRACKS[currentTrack].bpm} BPM)`;

  return (
    <div className="fixed bottom-4 right-4 bg-terminal border border-terminal-accent rounded-lg p-4 shadow-lg z-50 min-w-[320px] max-w-[400px]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-terminal-foreground">
          <div className="text-sm font-semibold text-terminal-bright">Study Music</div>
          <div className="text-xs text-terminal-dim mt-1 truncate max-w-[250px]" title={currentTrackName}>
            {currentTrackName}
          </div>
        </div>
        <button
          onClick={() => setEnabled(false)}
          className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
          title="Hide player"
        >
          <X className="w-4 h-4 text-terminal-foreground" />
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setUseCustomMusic(false)}
          className={`flex-1 px-3 py-1 rounded text-xs transition-colors ${
            !useCustomMusic
              ? "bg-terminal-accent text-terminal"
              : "bg-terminal-accent/20 text-terminal-foreground hover:bg-terminal-accent/30"
          }`}
        >
          Generated
        </button>
        <button
          onClick={() => setUseCustomMusic(true)}
          className={`flex-1 px-3 py-1 rounded text-xs transition-colors ${
            useCustomMusic
              ? "bg-terminal-accent text-terminal"
              : "bg-terminal-accent/20 text-terminal-foreground hover:bg-terminal-accent/30"
          }`}
          disabled={customTracks.length === 0}
        >
          My Music ({customTracks.length})
        </button>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={prevTrack}
          className="p-2 hover:bg-terminal-accent/20 rounded transition-colors"
        >
          <SkipBack className="w-4 h-4 text-terminal-foreground" />
        </button>
        
        <button
          onClick={togglePlay}
          className="p-2 bg-terminal-accent hover:bg-terminal-accent/80 rounded transition-colors"
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
        >
          <SkipForward className="w-4 h-4 text-terminal-foreground" />
        </button>

        <div className="flex-1 flex items-center gap-2 ml-2">
          <button
            onClick={toggleMute}
            className="p-1 hover:bg-terminal-accent/20 rounded transition-colors"
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

      {useCustomMusic && user && (
        <div className="mt-3 pt-3 border-t border-terminal-accent/30">
          <label htmlFor="music-upload" className="block mb-2 cursor-pointer">
            <div className="flex items-center gap-2 px-3 py-2 bg-terminal-accent/20 hover:bg-terminal-accent/30 rounded cursor-pointer transition-colors text-sm text-terminal-foreground border border-terminal-accent/50">
              <Upload className="w-4 h-4" />
              <span className="font-medium">Upload Music Files</span>
            </div>
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="music-upload"
            />
          </label>

          {customTracks.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
              {customTracks.map((track, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded text-xs ${
                    index === currentCustomTrack && useCustomMusic
                      ? "bg-terminal-accent/30"
                      : "bg-terminal-accent/10"
                  }`}
                >
                  <span className="truncate flex-1 text-terminal-foreground" title={track.name}>
                    {track.name}
                  </span>
                  <button
                    onClick={() => handleDeleteTrack(index)}
                    className="ml-2 p-1 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete track"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="text-xs text-terminal-dim mt-2">
        {useCustomMusic ? "Playing your uploaded music" : "Generative ambient music"}
      </div>
    </div>
  );
};