import React from 'react';
import { toast } from 'sonner';

export interface MediaItem {
  type: 'image' | 'audio';
  name: string;
  data: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
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
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const newMedia: MediaItem = { 
          type, 
          name: file.name, 
          data: result, 
          size: 'medium' 
        };
        onMediaUpload([...uploadedMedia, newMedia]);
      };
      reader.readAsDataURL(file);
    });
  };

  const copyMediaReference = (index: number, type: 'image' | 'audio') => {
    const tag = type === 'image' ? `[img:${index + 1}]` : `[audio:${index + 1}]`;
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
      <div className="flex gap-3 mt-2">
        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleMediaUpload(e, 'image')}
            className="text-terminal-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-terminal-accent file:text-terminal cursor-pointer"
          />
        </div>
        <div>
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => handleMediaUpload(e, 'audio')}
            className="text-terminal-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-terminal-accent file:text-terminal cursor-pointer"
          />
        </div>
      </div>
      
      {uploadedMedia.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="text-sm font-bold text-terminal-bright">📁 Uploaded Media ({uploadedMedia.length}):</div>
          {uploadedMedia.map((media, idx) => (
            <div key={idx} className="border border-terminal-accent/30 p-4 rounded-lg bg-terminal-accent/5">
              <div className="flex items-start gap-4">
                {media.type === 'image' ? (
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
                      {media.type === 'image' ? '🖼️' : '🔊'} {media.type.toUpperCase()} #{idx + 1}
                    </p>
                    <p className="text-xs text-terminal-dim truncate">{media.name}</p>
                  </div>
                  
                  {media.type === 'image' && (
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
                      📋 Copy [{media.type === 'image' ? 'img' : 'audio'}:{idx + 1}]
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
