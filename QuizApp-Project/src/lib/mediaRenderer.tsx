import React from 'react';
import { MediaItem } from '@/types/quiz';

export const renderMediaTags = (text: string, media?: MediaItem[]): React.ReactNode[] => {
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
    if (index >= 0 && index < media.length && media[index].type === type) {
      const mediaItem = media[index];
      if (type === 'img') {
        parts.push(
          <img
            key={`media-${match.index}`}
            src={mediaItem.data}
            alt={mediaItem.name}
            className="inline-block max-w-full h-auto rounded my-2"
            style={{ maxHeight: '300px' }}
          />
        );
      } else if (type === 'audio') {
        parts.push(
          <audio
            key={`media-${match.index}`}
            controls
            className="inline-block my-2"
            src={mediaItem.data}
          >
            Your browser does not support audio playback.
          </audio>
        );
      }
    } else {
      // Invalid reference, show the tag as-is
      parts.push(<span key={`invalid-${match.index}`} className="text-red-500">{fullMatch}</span>);
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};
