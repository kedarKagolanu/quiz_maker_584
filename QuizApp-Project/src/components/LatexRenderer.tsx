import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { MediaItem } from '@/types/quiz';
import { renderMediaTags } from '@/lib/mediaRenderer';

interface LatexRendererProps {
  text: string;
  media?: MediaItem[];
  imageSize?: 'small' | 'medium' | 'large' | 'xlarge';
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({ text, media, imageSize = 'medium' }) => {
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

  try {
    // Validate and convert input text
    if (!text) {
      console.warn('LatexRenderer: Empty or null text input');
      return <span className="text-yellow-500">[No content]</span>;
    }
    
    if (typeof text !== 'string') {
      console.warn('LatexRenderer: Non-string text input:', typeof text, text);
      // Try to convert to string if possible
      const convertedText = String(text);
      if (convertedText === '[object Object]') {
        console.error('LatexRenderer: Cannot render object as text:', text);
        return <span className="text-red-500">[Invalid content type: {typeof text}]</span>;
      }
      // Use the converted text
      text = convertedText;
    }

    // First process media tags, then process LaTeX in the result
    const mediaProcessed = renderMediaTags(text, media || [], imageSize);
    const final: React.ReactNode[] = [];
    
    mediaProcessed.forEach((part, idx) => {
      try {
        if (typeof part === 'string') {
          // Process LaTeX in string parts
          const latexProcessed = renderLatex(part);
          if (Array.isArray(latexProcessed)) {
            latexProcessed.forEach((item, itemIdx) => {
              if (item !== null && item !== undefined) {
                // Ensure each item has a unique key
                if (React.isValidElement(item)) {
                  final.push(React.cloneElement(item, { key: `latex-${idx}-${itemIdx}` }));
                } else {
                  final.push(<span key={`text-${idx}-${itemIdx}`}>{String(item)}</span>);
                }
              }
            });
          } else if (latexProcessed !== null && latexProcessed !== undefined) {
            if (React.isValidElement(latexProcessed)) {
              final.push(React.cloneElement(latexProcessed, { key: `latex-single-${idx}` }));
            } else {
              final.push(<span key={`text-single-${idx}`}>{String(latexProcessed)}</span>);
            }
          }
        } else if (part && React.isValidElement(part)) {
          // Valid React element from media processing
          final.push(React.cloneElement(part, { key: `media-${idx}` }));
        } else if (part !== null && part !== undefined) {
          // Convert other types to string
          final.push(<span key={`fallback-${idx}`}>{String(part)}</span>);
        }
      } catch (error) {
        console.error('Error processing LatexRenderer part:', error, part);
        final.push(<span key={`error-${idx}`} className="text-red-500">[Render Error]</span>);
      }
    });

    // Filter out null/undefined and return
    const validElements = final.filter(f => f !== null && f !== undefined);
    return <span>{validElements.length > 0 ? validElements : text}</span>;
  } catch (error) {
    console.error('Error in LatexRenderer:', error, { text, media });
    return <span className="text-red-500">[Invalid content: {text?.substring(0, 50) || 'undefined'}...]</span>;
  }
};
