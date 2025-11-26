import React from 'react';
import { MediaItem } from '@/types/quiz';

export const renderMediaTags = (text: string, media?: MediaItem[], imageSize?: 'small' | 'medium' | 'large' | 'xlarge'): React.ReactNode[] => {
  if (!media || media.length === 0) return [text];

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

    // Add media element

    if (media[index]) {

    }
    
    // Allow both 'img' and 'image' types to be treated as images
    const isValidImageType = (type === 'img' && (media[index]?.type === 'img' || media[index]?.type === 'image')) ||
                            (type === 'image' && (media[index]?.type === 'img' || media[index]?.type === 'image'));
    const isValidAudioType = type === 'audio' && media[index]?.type === 'audio';
    
    if (index >= 0 && index < media.length && media[index] && (isValidImageType || isValidAudioType)) {
      const mediaItem = media[index];
      if (type === 'img') {
        // Enhanced image processing with better data handling
        const imageData = mediaItem.data;
        let imageSrc: string;
        
        // Handle different data formats
        if (imageData.startsWith('data:')) {
          imageSrc = imageData;
        } else if (imageData.startsWith('/9j/') || imageData.startsWith('iVBOR') || imageData.startsWith('R0lGOD')) {
          // Base64 image data without data: prefix
          imageSrc = `data:image/jpeg;base64,${imageData}`;
        } else {
          // Try to detect image type from data
          const firstChars = imageData.substring(0, 10);
          let mimeType = 'image/jpeg'; // default
          
          if (firstChars.startsWith('iVBOR')) {
            mimeType = 'image/png';
          } else if (firstChars.startsWith('R0lGOD')) {
            mimeType = 'image/gif';
          } else if (firstChars.startsWith('UklGRg')) {
            mimeType = 'image/webp';
          }
          
          imageSrc = `data:${mimeType};base64,${imageData}`;
        }
        

        
        parts.push(
          <img
            key={`media-${match.index}`}
            src={imageSrc}
            alt={mediaItem.name}
            style={{
              maxHeight: (mediaItem.size === 'small' || (!mediaItem.size && imageSize === 'small')) ? '150px !important' : 
                        (mediaItem.size === 'large' || (!mediaItem.size && imageSize === 'large')) ? '450px !important' : 
                        (mediaItem.size === 'xlarge' || (!mediaItem.size && imageSize === 'xlarge')) ? '600px !important' : '300px !important',
              maxWidth: (mediaItem.size === 'small' || (!mediaItem.size && imageSize === 'small')) ? '200px !important' : 
                       (mediaItem.size === 'large' || (!mediaItem.size && imageSize === 'large')) ? '600px !important' : 
                       (mediaItem.size === 'xlarge' || (!mediaItem.size && imageSize === 'xlarge')) ? '800px !important' : '400px !important',
              margin: '8px 0 !important',
              borderRadius: '8px !important',
              border: '2px solid #374151 !important',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3) !important',
              display: 'inline-block !important',
              backgroundColor: '#1f2937 !important'
            }}
            onLoad={(e) => {

              const target = e.currentTarget as HTMLImageElement;
              target.style.backgroundColor = 'transparent !important';
            }}
            onError={(e) => {

              const target = e.currentTarget;
              target.style.display = 'none';
              
              // Create nuclear-styled error message with more info
              const errorSpan = document.createElement('span');
              errorSpan.textContent = `[img:${num}] - Image "${mediaItem.name}" failed to load (${imageData.length} bytes)`;
              errorSpan.style.cssText = 'color: #ef4444 !important; font-weight: bold !important; background: rgba(239,68,68,0.1) !important; padding: 8px 12px !important; border-radius: 6px !important; border: 2px solid #ef4444 !important; margin: 4px !important; display: inline-block !important;';
              errorSpan.onclick = () => {

                alert(`Image data preview: ${imageData.substring(0, 100)}...`);
              };
              target.parentNode?.insertBefore(errorSpan, target.nextSibling);
            }}
          />
        );
      } else if (type === 'audio') {
        parts.push(
          <audio
            key={`media-${match.index}`}
            controls
            className="inline-block my-2"
            src={mediaItem.data.startsWith('data:') ? mediaItem.data : `data:audio/mpeg;base64,${mediaItem.data}`}
            onError={(e) => {

            }}
          >
            Your browser does not support audio playback.
          </audio>
        );
      }
    } else {
      // Debug why this failed
      const reasons = [];
      if (index < 0) reasons.push('negative index');
      if (index >= media.length) reasons.push(`index ${index} >= media length ${media.length}`);
      if (media[index] && media[index].type !== type) reasons.push(`type mismatch: expected '${type}' but found '${media[index].type}'`);
      if (!media[index]) reasons.push('media item not found');
      
      console.log('Media lookup failed:', {
        index,
        requestedType: type,
        mediaLength: media.length,
        reasons,
        availableMedia: media.map((m, i) => ({ index: i + 1, type: m.type, name: m.name }))
      });
      
      // If it's a type mismatch but media exists, try to render it anyway
      if (media[index] && media[index].type !== type && type === 'img' && media[index].type === 'image') {

        const mediaItem = media[index];
        
        // Same image processing as above but for type mismatch
        const imageData = mediaItem.data;
        let imageSrc: string;
        
        if (imageData.startsWith('data:')) {
          imageSrc = imageData;
        } else if (imageData.startsWith('/9j/') || imageData.startsWith('iVBOR') || imageData.startsWith('R0lGOD')) {
          imageSrc = `data:image/jpeg;base64,${imageData}`;
        } else {
          const firstChars = imageData.substring(0, 10);
          let mimeType = 'image/jpeg';
          if (firstChars.startsWith('iVBOR')) mimeType = 'image/png';
          else if (firstChars.startsWith('R0lGOD')) mimeType = 'image/gif';
          else if (firstChars.startsWith('UklGRg')) mimeType = 'image/webp';
          imageSrc = `data:${mimeType};base64,${imageData}`;
        }
        
        parts.push(
          <img
            key={`media-${match.index}`}
            src={imageSrc}
            alt={mediaItem.name}
            style={{
              maxHeight: '300px !important',
              maxWidth: '100% !important',
              margin: '8px 0 !important',
              borderRadius: '8px !important',
              border: '2px solid #374151 !important',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3) !important',
              display: 'inline-block !important'
            }}

            onError={(e) => {

              const target = e.currentTarget;
              target.style.display = 'none';
              const errorSpan = document.createElement('span');
              errorSpan.textContent = `[${type}:${num}] - Failed to load "${mediaItem.name}"`;
              errorSpan.style.cssText = 'color: #ef4444 !important; background: rgba(239,68,68,0.1) !important; padding: 8px 12px !important; border-radius: 6px !important; border: 2px solid #ef4444 !important;';
              target.parentNode?.insertBefore(errorSpan, target.nextSibling);
            }}
          />
        );
      } else {
        // Show detailed error
        parts.push(
          <span 
            key={`invalid-${match.index}`} 
            style={{
              color: '#ef4444 !important',
              background: 'rgba(239,68,68,0.1) !important',
              padding: '6px 10px !important',
              borderRadius: '4px !important',
              border: '1px solid #ef4444 !important',
              fontSize: '11px !important',
              fontWeight: 'bold !important',
              cursor: 'pointer !important',
              display: 'inline-block !important',
              margin: '2px !important'
            }}
            onClick={() => {

              alert(`❌ ${fullMatch} failed\n\nReasons: ${reasons.join(', ')}\n\nAvailable media:\n${media.map((m, i) => `[${m.type}:${i+1}] ${m.name}`).join('\n')}`);
            }}
          >
            {fullMatch} - Debug info
          </span>
        );
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};
