import React, { useState } from 'react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export interface MediaItem {
  type: 'img' | 'audio'; // Use consistent 'img' type only
  name: string;
  data: string; // base64 data with data: prefix
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  id?: string; // unique identifier for media merging
}

interface MediaUploaderProps {
  uploadedMedia: MediaItem[];
  onMediaUpload: (media: MediaItem[]) => void;
  onMediaDelete: (index: number) => void;
  onMediaSizeChange: (index: number, size: 'small' | 'medium' | 'large' | 'xlarge') => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  uploadedMedia,
  onMediaUpload,
  onMediaDelete,
  onMediaSizeChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string>('');
  // Enhanced file validation with security checks
  const validateFile = (file: File, expectedType: 'img' | 'audio'): { valid: boolean; error?: string } => {
    // MIME type validation
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
    
    const allowedTypes = expectedType === 'img' ? allowedImageTypes : allowedAudioTypes;
    
    // Check MIME type
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return { valid: false, error: `Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}` };
    }
    
    // File size validation (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return { valid: false, error: `File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum allowed: 50MB` };
    }
    
    // File name validation
    if (file.name.length > 255) {
      return { valid: false, error: 'File name too long (maximum 255 characters)' };
    }
    
    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js', '.jar', '.php', '.asp'];
    const fileName = file.name.toLowerCase();
    for (const ext of suspiciousExtensions) {
      if (fileName.includes(ext)) {
        return { valid: false, error: `Potentially unsafe file extension detected: ${ext}` };
      }
    }
    
    return { valid: true };
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'img' | 'audio') => {
    const files = e.target.files;
    if (!files) return;

    // Validate all files before processing
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];
    
    Array.from(files).forEach(file => {
      const validation = validateFile(file, type);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(`${file.name}: ${validation.error}`);
      }
    });
    
    // Show validation errors
    if (invalidFiles.length > 0) {
      toast.error(`File validation failed:\n${invalidFiles.join('\n')}`);
      if (validFiles.length === 0) {
        return; // No valid files to process
      }
    }

    console.log(`Starting upload for ${validFiles.length} validated ${type} file(s)`);
    setIsUploading(true);

    let completedFiles = 0;
    const totalFiles = validFiles.length;

    validFiles.forEach((file, index) => {
      setUploadingFileName(file.name);
      console.log(`Processing file ${index + 1}:`, { 
        name: file.name, 
        size: file.size, 
        type: file.type,
        targetType: type
      });

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        
        // Validate the file data
        if (!result || !result.startsWith('data:')) {
          console.error('Invalid file data for:', file.name, 'Result:', result?.substring(0, 50));
          toast.error(`Failed to process ${file.name} - invalid data format`);
          return;
        }

        // Generate unique ID for this media item
        const mediaId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

        const newMedia: MediaItem = { 
          type: type === 'img' ? 'img' : 'audio', // Ensure consistent type naming
          name: file.name, 
          data: result, // Already includes data: prefix from readAsDataURL
          size: 'medium',
          id: mediaId
        };

        console.log('✅ Media item created:', {
          id: newMedia.id,
          type: newMedia.type,
          name: newMedia.name,
          dataStart: newMedia.data.substring(0, 50),
          dataLength: newMedia.data.length,
          hasDataPrefix: newMedia.data.startsWith('data:')
        });

        // Validate that we can actually use this data
        if (type === 'img') {
          const testImg = new Image();
          testImg.onload = () => {
            console.log('✅ Image validation successful for:', file.name);
            onMediaUpload([...uploadedMedia, newMedia]);
            toast.success(`Image "${file.name}" uploaded successfully!`);
            
            completedFiles++;
            if (completedFiles === totalFiles) {
              setIsUploading(false);
              setUploadingFileName('');
            }
          };
          testImg.onerror = () => {
            console.error('❌ Image validation failed for:', file.name);
            toast.error(`Failed to validate image ${file.name}`);
            
            completedFiles++;
            if (completedFiles === totalFiles) {
              setIsUploading(false);
              setUploadingFileName('');
            }
          };
          testImg.src = newMedia.data;
        } else {
          // For audio, we can't easily validate without playing, so just add it
          onMediaUpload([...uploadedMedia, newMedia]);
          toast.success(`Audio "${file.name}" uploaded successfully!`);
          
          completedFiles++;
          if (completedFiles === totalFiles) {
            setIsUploading(false);
            setUploadingFileName('');
          }
        }
      };

      reader.onerror = () => {
        console.error('FileReader error for:', file.name);
        toast.error(`Failed to read ${file.name}`);
        
        completedFiles++;
        if (completedFiles === totalFiles) {
          setIsUploading(false);
          setUploadingFileName('');
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const copyMediaReference = (index: number, type: 'img' | 'audio') => {
    const tag = type === 'img' ? `[img:${index + 1}]` : `[audio:${index + 1}]`;
    navigator.clipboard.writeText(tag);
    toast.success(`Copied ${tag}! Paste it anywhere in your questions or options.`);
  };

  const deleteMedia = (index: number) => {
    onMediaDelete(index);
    toast.success("Media deleted");
  };

  return (
    <div>
      <div className="text-terminal-foreground mb-3">upload media (images & audio):</div>
      
      {/* Upload progress indicator */}
      {isUploading && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
          <div className="flex items-center gap-3">
            <LoadingSpinner size="sm" className="text-blue-400" />
            <div>
              <div className="text-blue-300 font-medium">Uploading media files...</div>
              <div className="text-blue-400/70 text-sm">Processing: {uploadingFileName}</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex gap-3 mt-2">
        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={isUploading}
            onChange={(e) => handleMediaUpload(e, 'img')}
            className="text-terminal-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-terminal-accent file:text-terminal cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <input
            type="file"
            accept="audio/*"
            multiple
            disabled={isUploading}
            onChange={(e) => handleMediaUpload(e, 'audio')}
            className="text-terminal-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-terminal-accent file:text-terminal cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
      
      {uploadedMedia.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="text-sm font-bold text-terminal-bright">📁 Uploaded Media ({uploadedMedia.length}):</div>
          {uploadedMedia.map((media, idx) => (
            <div key={idx} className="border border-terminal-accent/30 p-4 rounded-lg bg-terminal-accent/5">
              <div className="flex items-start gap-4">
                {media.type === 'img' ? (
                  <div className="flex flex-col items-center gap-2">
                    <img 
                      src={media.data} 
                      alt={media.name} 
                      className="w-24 h-24 object-cover rounded border-2 border-gray-500"
                      style={{
                        maxHeight: media.size === 'small' ? '60px' : 
                                 media.size === 'large' ? '120px' : 
                                 media.size === 'xlarge' ? '160px' : '96px',
                        maxWidth: media.size === 'small' ? '80px' : 
                                media.size === 'large' ? '160px' : 
                                media.size === 'xlarge' ? '200px' : '120px'
                      }}
                    />
                    <div className="text-xs text-center text-gray-400">
                      Preview at {media.size || 'medium'} size
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-terminal-accent/20 rounded flex items-center justify-center text-3xl border-2 border-gray-500">
                    🔊
                  </div>
                )}
                
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-bold text-terminal-bright">
                      {media.type === 'img' ? '🖼️' : '🔊'} {media.type === 'img' ? 'IMAGE' : 'AUDIO'} #{idx + 1}
                    </p>
                    <p className="text-xs text-terminal-dim truncate">{media.name}</p>
                  </div>
                  
                  {media.type === 'img' && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-terminal-bright">Size in Quiz:</div>
                      <select
                        value={media.size || 'medium'}
                        onChange={(e) => onMediaSizeChange(idx, e.target.value as 'small' | 'medium' | 'large' | 'xlarge')}
                        className="bg-terminal border border-terminal-accent/30 text-terminal-foreground px-2 py-1 rounded text-xs w-32"
                      >
                        <option value="small">Small (150px)</option>
                        <option value="medium">Medium (300px)</option>
                        <option value="large">Large (450px)</option>
                        <option value="xlarge">X-Large (600px)</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyMediaReference(idx, media.type)}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-1 rounded text-xs font-medium border border-blue-500/30"
                    >
                      📋 Copy [{media.type}:{idx + 1}]
                    </button>
                    <button
                      onClick={() => deleteMedia(idx)}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-3 py-1 rounded text-xs font-medium border border-red-500/30"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Tips Section */}
      <div className="mt-3 p-3 bg-terminal-accent/5 border border-terminal-accent/20 rounded text-xs text-terminal-dim space-y-1">
        <div className="font-medium text-terminal-bright">📸 Media Upload Tips:</div>
        <div>• <strong>Image size:</strong> Keep images under 500KB for optimal performance</div>
        <div>• <strong>Resolution:</strong> 1200x800px or smaller recommended</div>
        <div>• <strong>Format:</strong> JPG, PNG, or WebP supported</div>
        <div>• <strong>Audio:</strong> MP3 format, under 2MB recommended</div>
        <div>• Large files may cause slow loading or upload failures</div>
      </div>
    </div>
  );
};
