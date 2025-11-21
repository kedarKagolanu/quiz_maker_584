import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '@/lib/storage';

interface MusicFile {
  id: string;
  title: string;
  filename: string;
  uploadedBy: string;
  uploaderName?: string;
  showUploaderName: boolean;
  uploadedAt: number;
  duration?: number;
  fileSize: number;
  url: string;
}

interface MusicContextType {
  // Music library
  musicFiles: MusicFile[];
  loadMusicFiles: () => Promise<void>;
  
  // Current playing
  currentlyPlaying: string | null;
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  
  // Controls
  playMusic: (musicFile: MusicFile) => void;
  pauseMusic: () => void;
  resumeMusic: () => void;
  stopMusic: () => void;
  seekTo: (time: number) => void;
  skipSeconds: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
  
  // Currently playing file info
  getCurrentTrack: () => MusicFile | null;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const useMusicContext = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusicContext must be used within a MusicProvider');
  }
  return context;
};

interface MusicProviderProps {
  children: ReactNode;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  // Apply mute/volume changes to audio element
  useEffect(() => {
    if (audioElement) {
      audioElement.volume = isMuted ? 0 : volume;
      audioElement.muted = isMuted;
    }
  }, [audioElement, volume, isMuted]);

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      if (audioElement && !audioElement.paused) {
        setCurrentTime(audioElement.currentTime);
      }
    };

    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, [audioElement]);

  // Load music files from storage
  const loadMusicFiles = async () => {
    try {
      const files = await storage.getMusicFiles();
      setMusicFiles(files.sort((a, b) => b.uploadedAt - a.uploadedAt));
    } catch (error) {
      console.error('Failed to load music files:', error);
    }
  };

  // Load music files on mount
  useEffect(() => {
    loadMusicFiles();
  }, []);

  const playMusic = (musicFile: MusicFile) => {
    // Stop current audio if playing
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    // Create new audio element
    const audio = new Audio(musicFile.url);
    audio.volume = isMuted ? 0 : volume;
    audio.muted = isMuted;
    
    // Set up event listeners
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setAudioElement(null);
    });

    audio.addEventListener('play', () => {
      setIsPlaying(true);
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    // Play the audio
    audio.play().then(() => {
      setAudioElement(audio);
      setCurrentlyPlaying(musicFile.id);
      setCurrentTime(0);
      setIsPlaying(true);
    }).catch(error => {
      console.error('Failed to play audio:', error);
    });
  };

  const pauseMusic = () => {
    if (audioElement && !audioElement.paused) {
      audioElement.pause();
    }
  };

  const resumeMusic = () => {
    if (audioElement && audioElement.paused) {
      audioElement.play();
    }
  };

  const stopMusic = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setAudioElement(null);
    }
  };

  const seekTo = (time: number) => {
    if (audioElement) {
      audioElement.currentTime = Math.max(0, Math.min(duration, time));
      setCurrentTime(audioElement.currentTime);
    }
  };

  const skipSeconds = (seconds: number) => {
    if (audioElement) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      seekTo(newTime);
    }
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioElement) {
      audioElement.volume = isMuted ? 0 : clampedVolume;
    }
  };

  const getCurrentTrack = () => {
    if (!currentlyPlaying) return null;
    return musicFiles.find(f => f.id === currentlyPlaying) || null;
  };

  const playNext = () => {
    if (musicFiles.length === 0) return;
    
    const currentIndex = musicFiles.findIndex(file => file.id === currentlyPlaying);
    const nextIndex = currentIndex === -1 || currentIndex === musicFiles.length - 1 
      ? 0 
      : currentIndex + 1;
    
    playMusic(musicFiles[nextIndex]);
  };

  const playPrevious = () => {
    if (musicFiles.length === 0) return;
    
    const currentIndex = musicFiles.findIndex(file => file.id === currentlyPlaying);
    const prevIndex = currentIndex === -1 || currentIndex === 0 
      ? musicFiles.length - 1 
      : currentIndex - 1;
    
    playMusic(musicFiles[prevIndex]);
  };

  const contextValue: MusicContextType = {
    musicFiles,
    loadMusicFiles,
    currentlyPlaying,
    audioElement,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playMusic,
    pauseMusic,
    resumeMusic,
    stopMusic,
    seekTo,
    skipSeconds,
    setVolume,
    setIsMuted,
    playNext,
    playPrevious,
    getCurrentTrack
  };

  return (
    <MusicContext.Provider value={contextValue}>
      {children}
    </MusicContext.Provider>
  );
};