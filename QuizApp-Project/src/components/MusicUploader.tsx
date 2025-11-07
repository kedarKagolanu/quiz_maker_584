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
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB.');
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

      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('music')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('music')
        .getPublicUrl(fileName);

      // Update user's musicFiles in profile
      const users = await storage.getUsers();
      const currentUser = users.find(u => u.id === user.id);
      
      if (currentUser) {
        const musicFiles = currentUser.musicFiles || [];
        musicFiles.push({
          name: file.name,
          url: urlData.publicUrl
        });

        await storage.saveUser({
          ...currentUser,
          musicFiles
        });

        toast.dismiss();
        toast.success(`Music uploaded: ${file.name}`);
        
        // Reload page to show new music
        window.location.reload();
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to upload music. Please try again.');
      console.error('Music upload error:', error);
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
