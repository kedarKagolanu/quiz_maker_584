import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { MediaItem } from '@/types/quiz';
import { renderMediaTags } from '@/lib/mediaRenderer';

interface LatexRendererProps {
  text: string;
  media?: MediaItem[];
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({ text, media }) => {
  const renderLatex = (input: string | React.ReactNode) => {
    if (typeof input !== 'string') return input;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\$([^$]+)\$/g;
    let match;

    while ((match = regex.exec(input)) !== null) {
      // Add text before LaTeX
      if (match.index > lastIndex) {
        parts.push(input.substring(lastIndex, match.index));
      }

      // Render LaTeX
      try {
        const html = katex.renderToString(match[1], {
          throwOnError: false,
          strict: 'warn', // Enable strict mode for better security
          trust: false, // Don't trust user input
          displayMode: false,
        });
        parts.push(
          <span
            key={match.index}
            dangerouslySetInnerHTML={{ __html: html }}
            className="inline-block"
          />
        );
      } catch (error) {
        parts.push(<span key={match.index} className="text-red-500">{match[0]}</span>);
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < input.length) {
      parts.push(input.substring(lastIndex));
    }

    return parts.length > 0 ? parts : input;
  };

  // First process media tags, then process LaTeX in the result
  const mediaProcessed = renderMediaTags(text, media);
  const final: React.ReactNode[] = [];
  
  mediaProcessed.forEach((part, idx) => {
    if (typeof part === 'string') {
      const latexProcessed = renderLatex(part);
      if (Array.isArray(latexProcessed)) {
        final.push(...latexProcessed);
      } else {
        final.push(latexProcessed);
      }
    } else {
      final.push(React.cloneElement(part as React.ReactElement, { key: `media-${idx}` }));
    }
  });

  return <span>{final}</span>;
};
