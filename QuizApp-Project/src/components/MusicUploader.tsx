import React, { useRef } from 'react';
import { Music, Upload } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { storage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TerminalButton } from './Terminal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const MusicUploader: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;

    const file = e.target.files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB (increased limit)

    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 50MB.');
      return;
    }

    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file.');
      return;
    }

    if (!supabase) {
      toast.error('Backend not configured. Please enable Lovable Cloud.');
      return;
    }

    try {
      toast.loading('Uploading music...');

      // Create music file metadata
      const musicFile = {
        id: `music_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        filename: file.name,
        uploadedBy: user.id,
        uploaderName: user.email?.split('@')[0] || 'Unknown User',
        showUploaderName: true,
        uploadedAt: Date.now(),
        duration: null, // Will be calculated on frontend if needed
        fileSize: file.size
      };

      console.log('🎵 Uploading music file:', {
        file: file.name,
        size: file.size,
        type: file.type,
        musicFileId: musicFile.id
      });

      // Check if bucket exists first by attempting upload
      console.log('🎵 Attempting music upload...');
      await storage.saveMusicFile(musicFile, file);
      console.log('✅ Music upload successful!');

      toast.dismiss();
      toast.success(`Music uploaded: ${file.name}`);
      
      // Reload page to show new music
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Music upload error:', error);
      toast.dismiss();
      
      if (error instanceof Error) {
        if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
          toast.error('File too large for upload. Please try a smaller file.');
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          toast.error('Upload unauthorized. Please log in again.');
        } else if (error.message.includes('400')) {
          toast.error('Invalid file format or upload data. Please try again.');
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
      } else {
        toast.error('Failed to upload music. Please try again.');
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleMusicUpload}
        className="hidden"
        id="music-upload-input"
      />
      <TerminalButton onClick={() => fileInputRef.current?.click()}>
        <Upload className="w-4 h-4 inline mr-1" />
        upload music
      </TerminalButton>
    </>
  );
};
