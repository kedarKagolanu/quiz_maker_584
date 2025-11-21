import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, TerminalLine, TerminalButton } from "@/components/Terminal";
import { storage } from "@/lib/storage";
import { useMusicContext } from "@/contexts/MusicContext";
import { Upload, Play, Pause, Music, User, Globe, Clock, Download, Volume2, HelpCircle } from "lucide-react";
import { PageDescription } from "@/components/PageDescription";
import { toast } from "sonner";

export const MusicLibrary: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    musicFiles,
    loadMusicFiles,
    currentlyPlaying,
    isPlaying,
    currentTime,
    duration,
    volume,
    audioElement,
    playMusic,
    pauseMusic,
    resumeMusic,
    seekTo,
    skipSeconds,
    setVolume,
    getCurrentTrack
  } = useMusicContext();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    showUploaderName: true,
    file: null as File | null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadMusicFiles();
  }, [user, navigate, loadMusicFiles]);

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title.trim() || !user) return;

    // Validate file
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];

    if (uploadForm.file.size > maxSize) {
      toast.error("File size must be under 50MB");
      return;
    }

    if (!allowedTypes.includes(uploadForm.file.type)) {
      toast.error("Only MP3, WAV, OGG, and M4A files are allowed");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStartTime(Date.now());

    try {
      // Create audio element to get duration
      const tempAudio = new Audio();
      const audioUrl = URL.createObjectURL(uploadForm.file);
      tempAudio.src = audioUrl;

      await new Promise((resolve) => {
        tempAudio.addEventListener('loadedmetadata', resolve);
      });

      const musicFile: MusicFile = {
        id: `music_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: uploadForm.title.trim(),
        filename: uploadForm.file.name,
        uploadedBy: user.id,
        uploaderName: user.username,
        showUploaderName: uploadForm.showUploaderName,
        uploadedAt: Date.now(),
        duration: tempAudio.duration,
        fileSize: uploadForm.file.size,
        url: audioUrl // In real implementation, this would be uploaded to storage
      };

      // In real implementation, upload file to storage service
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await storage.saveMusicFile(musicFile, uploadForm.file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Reload music files from backend
      await loadMusicFiles();
      
      const uploadTime = uploadStartTime ? (Date.now() - uploadStartTime) / 1000 : 0;
      
      setShowUploadForm(false);
      setUploadForm({ title: "", showUploaderName: true, file: null });
      setUploadProgress(0);
      setUploadStartTime(null);
      
      toast.success(`Music uploaded successfully in ${uploadTime.toFixed(1)}s!`);

    } catch (error) {
      console.error("Failed to upload music:", error);
      toast.error("Failed to upload music");
    } finally {
      setUploading(false);
    }
  };

  const handlePlay = (musicFile: any) => {
    if (currentlyPlaying === musicFile.id) {
      // Toggle pause/play
      if (isPlaying) {
        pauseMusic();
      } else {
        resumeMusic();
      }
      return;
    }

    // Play new music using context
    playMusic(musicFile);
  };

  const handleSeek = (newTime: number) => {
    seekTo(newTime);
  };

  const handleSkip = (seconds: number) => {
    skipSeconds(seconds);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  if (!user) return null;

  return (
    <Terminal title="music library">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <TerminalLine prefix="#">Music Library ({musicFiles.length} tracks)</TerminalLine>
          <TerminalButton onClick={() => setShowUploadForm(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Music
          </TerminalButton>
        </div>

        {/* Help Section */}
        <div className="p-4 border border-terminal-accent/30 rounded bg-terminal-accent/10">
          <TerminalLine prefix="📋" className="text-terminal-bright font-semibold mb-2">
            Music Library Help
          </TerminalLine>
          <div className="text-xs text-terminal-foreground space-y-1">
            <div><strong>🎵 Public Library:</strong> All uploads are shared with everyone on the platform</div>
            <div><strong>📤 Uploading:</strong> MP3, WAV, OGG, M4A files up to 50MB each</div>
            <div><strong>🎧 Player Controls:</strong> Play/pause, skip ±10s, seek anywhere, volume control</div>
            <div><strong>🔒 Privacy:</strong> Choose to show or hide your name as uploader</div>
            <div><strong>🎼 Usage:</strong> All uploaded music can be used in quiz backgrounds</div>
            <div><strong>⚖️ Content:</strong> Only upload music you have rights to share</div>
          </div>
        </div>

        {/* Current Playing Controls */}
        {currentlyPlaying && (
          <div className="p-4 border border-terminal-accent rounded bg-terminal-accent/10">
            <TerminalLine prefix="🎵" className="text-terminal-bright mb-3">
              Now Playing: {musicFiles.find(f => f.id === currentlyPlaying)?.title}
            </TerminalLine>
            
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-terminal-dim">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="w-full bg-terminal-dim/30 rounded-full h-2 cursor-pointer"
                     onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const percent = (e.clientX - rect.left) / rect.width;
                       handleSeek(percent * duration);
                     }}>
                  <div 
                    className="bg-terminal-accent h-2 rounded-full transition-all"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <TerminalButton onClick={() => handleSkip(-10)} className="text-xs">
                  ⏪ 10s
                </TerminalButton>
                
                <TerminalButton 
                  onClick={() => handlePlay(musicFiles.find(f => f.id === currentlyPlaying)!)}
                  className="text-lg"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </TerminalButton>
                
                <TerminalButton onClick={() => handleSkip(10)} className="text-xs">
                  10s ⏩
                </TerminalButton>
                
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-terminal-dim" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setVolume(newVolume);
                    }}
                    className="w-16"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Music List */}
        <div className="space-y-3">
          {musicFiles.length === 0 ? (
            <TerminalLine prefix="-" className="text-terminal-dim">
              No music uploaded yet. Be the first to share some tunes!
            </TerminalLine>
          ) : (
            musicFiles.map(file => (
              <div key={file.id} className="p-4 border border-terminal-accent/30 rounded hover:border-terminal-accent/60 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <TerminalButton
                        onClick={() => handlePlay(file)}
                        className="text-xs"
                      >
                        {currentlyPlaying === file.id && isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </TerminalButton>
                      
                      <div>
                        <div className="text-terminal-bright font-semibold">{file.title}</div>
                        <div className="text-xs text-terminal-dim flex items-center gap-4">
                          {file.showUploaderName ? (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {file.uploaderName}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              Anonymous
                            </span>
                          )}
                          
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {file.duration ? formatTime(file.duration) : 'Unknown'}
                          </span>
                          
                          <span>{formatFileSize(file.fileSize)}</span>
                          
                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-terminal border border-terminal-accent rounded p-6 max-w-md w-full mx-4">
              <TerminalLine prefix="#">Upload Music</TerminalLine>
              
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-terminal-bright mb-2">Music Title</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter song title"
                    className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-terminal-bright mb-2">Audio File</label>
                  <input
                    type="file"
                    accept=".mp3,.wav,.ogg,.m4a,audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadForm(prev => ({ ...prev, file }));
                        if (!uploadForm.title) {
                          setUploadForm(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
                        }
                      }
                    }}
                    className="w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded"
                  />
                  {uploadForm.file && (
                    <div className="text-xs text-terminal-dim mt-1">
                      Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                    </div>
                  )}
                </div>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={uploadForm.showUploaderName}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, showUploaderName: e.target.checked }))}
                  />
                  <span className="text-terminal-bright">Show my name as uploader</span>
                </label>
                
                {uploading && (
                  <div className="mb-4">
                    <div className="text-xs text-terminal-bright mb-2">
                      Uploading... {uploadProgress}%
                      {uploadStartTime && (
                        <span className="text-terminal-dim ml-2">
                          ({((Date.now() - uploadStartTime) / 1000).toFixed(1)}s)
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-terminal-dim/30 rounded-full h-2">
                      <div 
                        className="bg-terminal-accent h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <TerminalButton 
                    onClick={handleUpload}
                    className={uploading ? 'opacity-50' : ''}
                    disabled={!uploadForm.file || !uploadForm.title.trim() || uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </TerminalButton>
                  <TerminalButton onClick={() => setShowUploadForm(false)}>
                    cancel
                  </TerminalButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="pt-4">
          <TerminalButton onClick={() => navigate("/dashboard")}>
            back to dashboard
          </TerminalButton>
        </div>
      </div>
      
      {/* Page Description */}
      <PageDescription 
        title="music library"
        description="Upload and share music files with the community for quiz backgrounds and audio questions"
        features={[
          "Upload music files (MP3, WAV, OGG, M4A) up to 50MB each",
          "Public music library - all uploads are shared with everyone",
          "Advanced audio player with seek, skip, and volume controls",
          "Choose to show or hide your name as the uploader",
          "Real-time upload progress with timer display",
          "Use uploaded music as backgrounds in your quizzes",
          "Global music player synced across the entire application"
        ]}
      />
    </Terminal>
  );
};