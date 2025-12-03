import React from 'react';
import { MediaItem } from '@/types/quiz';

// Function to validate and fix media data
const validateMediaData = (media: MediaItem[]): MediaItem[] => {
  if (!media || !Array.isArray(media)) {
    console.warn('⚠️ Invalid media array:', media);
    return [];
  }

  return media.filter(item => {
    // Filter out completely invalid items
    if (!item || typeof item !== 'object') {
      console.warn('⚠️ Invalid media item:', item);
      return false;
    }

    // Check for blob URLs and completely remove them
    if (item.data && item.data.startsWith('blob:')) {
      console.warn(`🗑️ Removing blob URL media: ${item.name || 'unknown'}`);
      return false; // Remove blob URLs entirely
    }

    // Check for invalid/empty data and remove
    if (!item.data || item.data.length < 10) {
      console.warn(`🗑️ Removing invalid media data: ${item.name || 'unknown'}`);
      return false; // Remove invalid data entirely
    }

    return true; // Keep valid items
  }).map((item, index) => {
    // Fix remaining valid items
    let fixedItem = { ...item };

    // Ensure proper data: prefix if it's base64
    if (!fixedItem.data.startsWith('data:') && !fixedItem.data.startsWith('http')) {
      console.log(`🔧 Adding data: prefix to ${fixedItem.name}`);
      const mimeType = fixedItem.type === 'img' ? 'image/jpeg' : 'audio/mpeg';
      fixedItem.data = `data:${mimeType};base64,${fixedItem.data}`;
    }

    // Ensure proper type
    if (!fixedItem.type || (fixedItem.type !== 'img' && fixedItem.type !== 'audio')) {
      console.log(`🔧 Fixing media type for ${fixedItem.name}`);
      fixedItem.type = 'img'; // Default to img
    }

    // Ensure ID exists
    if (!fixedItem.id) {
      fixedItem.id = `fixed_${Date.now()}_${index}_${(fixedItem.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    return fixedItem;
  });
};

export const renderMediaTags = (text: string, media?: MediaItem[], imageSize?: 'small' | 'medium' | 'large' | 'xlarge'): React.ReactNode[] => {
  if (!media || media.length === 0) {
    return [text];
  }

  // Validate media data first
  const processedMedia = validateMediaData(media);
  console.log('🔧 Media processing:', {
    original: media.length,
    processed: processedMedia.length,
    removedCount: media.length - processedMedia.length,
    validMediaNames: processedMedia.map(m => m.name)
  });

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Match [img:1] or [audio:2] tags
  const regex = /\[(img|audio):(\d+)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, type, num] = match;
    const index = parseInt(num) - 1;

    // Add text before the tag
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    console.log(`Processing media tag: ${fullMatch}, index: ${index}, media available: ${processedMedia.length}`);
    
    // Validate media exists and type matches
    const mediaItem = processedMedia[index];
    const isValidIndex = index >= 0 && index < processedMedia.length;
    const isTypeMatch = mediaItem && mediaItem.type === type;
    
    if (isValidIndex && isTypeMatch) {
      if (type === 'img') {
        parts.push(renderImage(mediaItem, index, imageSize));
      } else if (type === 'audio') {
        parts.push(renderAudio(mediaItem, index));
      }
    } else {
      // Show helpful error for invalid media reference
      const errorReason = processedMedia.length === 0
        ? 'No media available (may have been removed due to corruption)'
        : !isValidIndex 
          ? `Index ${index + 1} out of range (only ${processedMedia.length} media items available)`
          : `Type mismatch: expected ${type}, found ${mediaItem?.type}`;
        
      console.warn(`Invalid media reference: ${fullMatch}`, {
        index,
        isValidIndex,
        mediaItemType: mediaItem?.type,
        requestedType: type,
        totalMedia: processedMedia.length,
        availableMedia: processedMedia.map((m, i) => `[${m.type}:${i + 1}] ${m.name}`)
      });
      
      // Different styling based on the issue
      const isNoMediaAvailable = processedMedia.length === 0;
      
      parts.push(
        <div
          key={`invalid-${match.index}`} 
          style={{
            color: isNoMediaAvailable ? '#f59e0b' : '#ef4444',
            background: isNoMediaAvailable ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            padding: '8px 12px',
            borderRadius: '6px',
            border: `2px solid ${isNoMediaAvailable ? '#f59e0b' : '#ef4444'}`,
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'inline-block',
            margin: '4px 0',
            cursor: 'help'
          }}
          title={`${errorReason}${processedMedia.length > 0 ? `\n\nAvailable media:\n${processedMedia.map((m, i) => `[${m.type}:${i + 1}] ${m.name}`).join('\n')}` : '\n\nThis quiz had media files that were corrupted or stored as blob URLs and have been removed for security. Please re-upload the media files.'}`}
        >
          <div style={{ marginBottom: '4px' }}>
            {isNoMediaAvailable ? '⚠️' : '❌'} {fullMatch}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            {isNoMediaAvailable ? 'Media Removed (Re-upload Required)' : 'Media Not Found'}
          </div>
        </div>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

const renderImage = (mediaItem: MediaItem, index: number, imageSize?: 'small' | 'medium' | 'large' | 'xlarge'): React.ReactNode => {
  // Since we now filter out broken media, we can assume all media here is valid

  // Determine image size
  const effectiveSize = mediaItem.size || imageSize || 'medium';
  const sizeStyles = {
    small: { maxHeight: '150px', maxWidth: '200px' },
    medium: { maxHeight: '300px', maxWidth: '400px' },
    large: { maxHeight: '450px', maxWidth: '600px' },
    xlarge: { maxHeight: '600px', maxWidth: '800px' }
  };

  return (
    <img
      key={`image-${index}`}
      src={mediaItem.data}
      alt={mediaItem.name}
      style={{
        ...sizeStyles[effectiveSize],
        margin: '8px 0',
        borderRadius: '8px',
        border: '2px solid #374151',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'inline-block',
        backgroundColor: '#1f2937'
      }}
      onLoad={(e) => {
        console.log(`✅ Image loaded successfully: ${mediaItem.name}`);
        const target = e.currentTarget as HTMLImageElement;
        target.style.backgroundColor = 'transparent';
      }}
      onError={(e) => {
        console.error(`❌ Image failed to load: ${mediaItem.name}`);
        const target = e.currentTarget as HTMLImageElement;
        target.style.display = 'none';
        
        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          color: #ef4444;
          background: rgba(239,68,68,0.1);
          padding: 8px 12px;
          border-radius: 6px;
          border: 2px solid #ef4444;
          margin: 8px 0;
          display: inline-block;
        `;
        errorDiv.textContent = `[img:${index + 1}] - Failed to load "${mediaItem.name}"`;
        target.parentNode?.insertBefore(errorDiv, target.nextSibling);
      }}
    />
  );
};

const renderAudio = (mediaItem: MediaItem, index: number): React.ReactNode => {
  // Since we now filter out broken media, we can assume all media here is valid

  return (
    <div key={`audio-${index}`} style={{ margin: '8px 0', display: 'block' }}>
      <div style={{ 
        color: '#9ca3af', 
        fontSize: '12px', 
        marginBottom: '4px',
        fontFamily: 'monospace'
      }}>
        🎵 {mediaItem.name}
      </div>
      <audio
        controls
        preload="metadata"
        style={{
          width: '100%',
          maxWidth: '400px',
          height: '32px',
          backgroundColor: '#374151',
          borderRadius: '4px'
        }}
        src={mediaItem.data}
        onError={() => {
          console.error(`❌ Audio failed to load: ${mediaItem.name}`);
        }}
        onLoadedMetadata={(e) => {
          console.log(`✅ Audio metadata loaded: ${mediaItem.name}, duration: ${e.currentTarget.duration}s`);
        }}
      >
        Your browser does not support audio playback.
      </audio>
    </div>
  );
};