import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';
import { MediaItem } from '@/types/quiz';
import { renderMediaTags } from '@/lib/mediaRenderer';
import MediaErrorBoundary from './MediaErrorBoundary';

interface LatexRendererProps {
  text: string;
  media?: MediaItem[];
  imageSize?: 'small' | 'medium' | 'large' | 'xlarge';
}

// Function to process special characters ONLY outside of LaTeX and media tags
const processSpecialCharacters = (text: string): string => {
  // Split by LaTeX and media tags to avoid corrupting them
  const parts = text.split(/(\$[^$]*\$|\[[^\]]*\])/);
  
  return parts.map(part => {
    // Skip processing if this is a LaTeX expression - but ALLOW media tags to be processed
    if (part.match(/^\$.*\$$/)) {
      return part;
    }
    
    // Allow media tags [img:X] and [audio:X] to be processed, but preserve other bracket content
    if (part.match(/^\[[^\]]*\]$/) && !part.match(/^\[(img|audio):\d+\]$/)) {
      return part;
    }
    
    // Only process plain text parts
    return part
      // ESCAPE SEQUENCES - Process these FIRST before normal formatting
      .replace(/\\\\n/g, '\\n')  // \\n becomes literal \n text
      .replace(/\\\\t/g, '\\t')  // \\t becomes literal \t text
      .replace(/\\\\\*/g, '\\*') // \\* becomes literal \* text
      .replace(/\\\\_/g, '\\_')  // \\_ becomes literal \_ text
      
      // NORMAL FORMATTING - Process after escape sequences
      .replace(/\\n/g, '<br>')   // \n becomes line break
      .replace(/\\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;') // \t becomes tab
      
      // BOLD + ITALIC COMBINATIONS (process these BEFORE individual bold/italic)
      .replace(/\*\*\*([^*$]+)\*\*\*/g, '<strong><em>$1</em></strong>') // ***text*** = bold+italic
      .replace(/\*\*\*([^*$]+)\*\*\*/g, '<strong><em>$1</em></strong>') // ***text*** = bold+italic
      .replace(/___([^_$]+)___/g, '<strong><em>$1</em></strong>')         // ___text___ = bold+italic
      
      // INDIVIDUAL FORMATTING
      .replace(/\*\*([^*$]+)\*\*/g, '<strong>$1</strong>') // **text** = bold
      .replace(/\*([^*$]+)\*/g, '<em>$1</em>')             // *text* = italic
      .replace(/__([^_$]+)__/g, '<strong>$1</strong>')     // __text__ = bold
      .replace(/_([^_$]+)_/g, '<em>$1</em>')               // _text_ = italic
      
      // CODE FORMATTING - Generate React elements instead of HTML strings
      .replace(/`([^`]+)`/g, '###CODE_START###$1###CODE_END###')
      
      // GREEK LETTERS (only if not in LaTeX context)
      .replace(/\\alpha(?![a-zA-Z])/g, 'α')
      .replace(/\\beta(?![a-zA-Z])/g, 'β')
      .replace(/\\gamma(?![a-zA-Z])/g, 'γ')
      .replace(/\\delta(?![a-zA-Z])/g, 'δ')
      .replace(/\\epsilon(?![a-zA-Z])/g, 'ε')
      .replace(/\\theta(?![a-zA-Z])/g, 'θ')
      .replace(/\\lambda(?![a-zA-Z])/g, 'λ')
      .replace(/\\mu(?![a-zA-Z])/g, 'μ')
      .replace(/\\pi(?![a-zA-Z])/g, 'π')
      .replace(/\\sigma(?![a-zA-Z])/g, 'σ')
      .replace(/\\omega(?![a-zA-Z])/g, 'ω')
      
      // SYMBOLS
      .replace(/\\rightarrow/g, '→')
      .replace(/\\leftarrow/g, '←')
      .replace(/\\infinity/g, '∞')
      .replace(/\\degree/g, '°')
      .replace(/\\plusminus/g, '±')
      .replace(/\\multiply/g, '×')
      .replace(/\\divide/g, '÷');
  }).join('');
};

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
        // Sanitize HTML output to prevent XSS attacks
        const sanitizedHtml = DOMPurify.sanitize(html, {
          ALLOWED_TAGS: ['span', 'mrow', 'mi', 'mn', 'mo', 'mfrac', 'msup', 'msub', 'msubsup', 'mover', 'munder', 'munderover', 'mtable', 'mtr', 'mtd', 'math'],
          ALLOWED_ATTR: ['class', 'style', 'mathvariant', 'mathsize', 'mathcolor', 'mathbackground'],
          KEEP_CONTENT: true
        });
        parts.push(
          <span
            key={match.index}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
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

      return <span className="text-yellow-500">[No content]</span>;
    }
    
    if (typeof text !== 'string') {

      // Try to convert to string if possible
      const convertedText = String(text);
      if (convertedText === '[object Object]') {

        return <span className="text-red-500">[Invalid content type: {typeof text}]</span>;
      }
      // Use the converted text
      text = convertedText;
    }

    // CORRECT ORDER: First media tags, THEN special characters, THEN LaTeX
    const mediaProcessed = renderMediaTags(text, media || [], imageSize);
    const final: React.ReactNode[] = [];
    
    mediaProcessed.forEach((part, idx) => {
      try {
        if (typeof part === 'string') {
          // First process special characters, THEN LaTeX
          const specialCharsProcessed = processSpecialCharacters(part);
          const latexProcessed = renderLatex(specialCharsProcessed);
          
          if (Array.isArray(latexProcessed)) {
            latexProcessed.forEach((item, itemIdx) => {
              if (item !== null && item !== undefined) {
                if (React.isValidElement(item)) {
                  final.push(React.cloneElement(item, { key: `latex-${idx}-${itemIdx}` }));
                } else {
                  // Handle HTML content properly with sanitization
                  const itemStr = String(item);
                  if (itemStr.includes('<br>') || itemStr.includes('<strong>') || itemStr.includes('<em>')) {
                    const sanitizedHtml = DOMPurify.sanitize(itemStr, {
                      ALLOWED_TAGS: ['br', 'strong', 'em', 'b', 'i', 'span', 'code'],
                      ALLOWED_ATTR: ['class', 'style'],
                      KEEP_CONTENT: true
                    });
                    final.push(<span key={`html-${idx}-${itemIdx}`} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />);
                  } else if (itemStr.includes('###CODE_START###')) {
                    // Handle code blocks with proper React styling
                    const codeParts = itemStr.split(/(###CODE_START###[^#]*###CODE_END###)/);
                    final.push(
                      <span key={`code-${idx}-${itemIdx}`}>
                        {codeParts.map((codePart, codeIdx) => {
                          if (codePart.includes('###CODE_START###')) {
                            const codeText = codePart.replace(/###CODE_START###|###CODE_END###/g, '');
                            return (
                              <code 
                                key={`code-inner-${codeIdx}`}
                                style={{ 
                                  background: 'rgba(0,0,0,0.2)', 
                                  padding: '2px 4px', 
                                  borderRadius: '3px', 
                                  fontFamily: 'monospace', 
                                  color: '#60a5fa' 
                                }}
                              >
                                {codeText}
                              </code>
                            );
                          }
                          return codePart;
                        })}
                      </span>
                    );
                  } else {
                    final.push(<span key={`text-${idx}-${itemIdx}`}>{itemStr}</span>);
                  }
                }
              }
            });
          } else if (latexProcessed !== null && latexProcessed !== undefined) {
            if (React.isValidElement(latexProcessed)) {
              final.push(React.cloneElement(latexProcessed, { key: `latex-single-${idx}` }));
            } else {
              const processedStr = String(latexProcessed);
              if (processedStr.includes('<br>') || processedStr.includes('<strong>') || processedStr.includes('<em>') || processedStr.includes('<code>')) {
                const sanitizedHtml = DOMPurify.sanitize(processedStr, {
                  ALLOWED_TAGS: ['br', 'strong', 'em', 'b', 'i', 'span', 'code'],
                  ALLOWED_ATTR: ['class', 'style'],
                  KEEP_CONTENT: true
                });
                final.push(<span key={`html-single-${idx}`} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />);
              } else {
                final.push(<span key={`text-single-${idx}`}>{processedStr}</span>);
              }
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
        console.error('LaTeX rendering error:', error, 'for part:', part);
        final.push(<span key={`error-${idx}`} className="text-red-500">[Render Error]</span>);
      }
    });

    // Filter out null/undefined and return
    const validElements = final.filter(f => f !== null && f !== undefined);
    return (
      <MediaErrorBoundary>
        <span>{validElements.length > 0 ? validElements : text}</span>
      </MediaErrorBoundary>
    );
  } catch (error) {
    console.error('LatexRenderer outer error:', error);
    return (
      <MediaErrorBoundary>
        <span className="text-red-500">[Invalid content: {text?.substring(0, 50) || 'undefined'}...]</span>
      </MediaErrorBoundary>
    );
  }
};
