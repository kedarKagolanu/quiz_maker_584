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

// Replace special placeholders with real code-fence markers
function normalizeCodePlaceholders(src: string): string {
  return src
    .replace(/###BLOCK_CODE_START###/g, '```')
    .replace(/###BLOCK_CODE_END###/g, '```')
    .replace(/###INLINE_CODE_START###/g, '`')
    .replace(/###INLINE_CODE_END###/g, '`');
}

// Function to process special characters ONLY outside of LaTeX and media tags
const processSpecialCharacters = (text: string): string => {
  // Split by LaTeX and media tags to avoid corrupting them
  const parts = text.split(/(\$[^$]*\$|\[[^\]]*\])/);
  
  return parts.map(part => {
    // Skip processing if this is a LaTeX expression - but ALLOW media tags to be processed
    if (/^\$.*\$$/.test(part)) {
      return part;
    }
    
    // Allow media tags [img:X] and [audio:X] to be processed, but preserve other bracket content
    if (/^\[[^\]]*\]$/.test(part) && !/^\[(img|audio):\d+\]$/.test(part)) {
      return part;
    }
    
    // Only process plain text parts
    return part
      // ESCAPE SEQUENCES - Process these FIRST before normal formatting
      .replace(/\\\\n/g, '\\n')  // \\n becomes literal \n text
      .replace(/\\\\t/g, '\\t')  // \\t becomes literal \t text
      .replace(/\\\\\*/g, '\\*') // \\* becomes literal \* text
      .replace(/\\\\_/g, '\\_')  // \\_ becomes literal \_ text
      .replace(/\/\/n/g, '//n')  // Preserve //n in LaTeX contexts
      .replace(/\/\//g, '//')    // Preserve // in LaTeX contexts
      
      // NORMAL FORMATTING - Process after escape sequences
      .replace(/\\n/g, '<br>')   // \n becomes line break
      .replace(/\\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;') // \t becomes tab
      
      // BOLD + ITALIC COMBINATIONS (process these BEFORE individual bold/italic)
      .replace(/\*\*\*([^*$]+)\*\*\*/g, '<strong><em>$1</em></strong>') // ***text*** = bold+italic
      .replace(/___([^_$]+)___/g, '<strong><em>$1</em></strong>')         // ___text___ = bold+italic
      
      // INDIVIDUAL FORMATTING
      .replace(/\*\*([^*$]+)\*\*/g, '<strong>$1</strong>') // **text** = bold
      .replace(/\*([^*$]+)\*/g, '<em>$1</em>')             // *text* = italic
      .replace(/__([^_$]+)__/g, '<strong>$1</strong>')     // __text__ = bold
      .replace(/_([^_$]+)_/g, '<em>$1</em>')               // _text_ = italic
      
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

// Tokenizer to split text into text, inline code, and fenced block code (```lang optionalSameLineCode) segments
function tokenizeCodeAndText(input: string): Array<{ type: 'text' | 'block' | 'inline'; lang?: string; content: string }> {
  const segments: Array<{ type: 'text' | 'block' | 'inline'; lang?: string; content: string }> = [];
  let i = 0;
  let textBuffer = '';

  const pushText = (t: string) => {
    if (!t) return;
    segments.push({ type: 'text', content: t });
  };

  const tryFence = (src: string, idx: number) => {
    if (!src.startsWith('```', idx)) return null;

    // parse header to end of line (lang + optional same-line code)
    let j = idx + 3;
    let header = '';
    while (j < src.length && src[j] !== '\n') {
      header += src[j];
      j++;
    }
    if (j < src.length && src[j] === '\n') j++;

    header = header.trim();
    let lang = '';
    let sameLineCode = '';
    if (header.length > 0) {
      const parts = header.split(/\s+/);
      if (parts.length > 0) {
        lang = parts[0].toLowerCase();
        if (parts.length > 1) {
          sameLineCode = header.slice(parts[0].length).trim();
        }
      }
    }

    const closeIdx = src.indexOf('```', j);
    if (closeIdx === -1) {
      return { consumed: 0, seg: null };
    }

    let codeBody = src.slice(j, closeIdx);
    if (sameLineCode) codeBody = sameLineCode + '\n' + codeBody;
    codeBody = codeBody.replace(/^\n+/, '');

    return {
      consumed: closeIdx + 3 - idx,
      seg: { type: 'block' as const, lang, content: codeBody }
    };
  };

  const tryInline = (src: string, idx: number) => {
    if (src[idx] !== '`') return null;
    let j = idx + 1;
    while (j < src.length && src[j] !== '`') j++;
    if (j >= src.length) return null;
    const content = src.slice(idx + 1, j);
    return {
      consumed: j + 1 - idx,
      seg: { type: 'inline' as const, content }
    };
  };

  while (i < input.length) {
    const fence = tryFence(input, i);
    if (fence && fence.consumed > 0 && fence.seg) {
      if (textBuffer) { pushText(textBuffer); textBuffer = ''; }
      segments.push(fence.seg);
      i += fence.consumed;
      continue;
    }

    const inline = tryInline(input, i);
    if (inline && inline.consumed > 0 && inline.seg) {
      if (textBuffer) { pushText(textBuffer); textBuffer = ''; }
      segments.push(inline.seg);
      i += inline.consumed;
      continue;
    }

    textBuffer += input[i];
    i++;
  }

  if (textBuffer) pushText(textBuffer);
  return segments;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({ text, media, imageSize = 'medium' }) => {
  const renderLatex = (input: string | React.ReactNode) => {
    if (typeof input !== 'string') return input;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\$([^$]+)\$/g;
    let match: RegExpExecArray | null;

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
          KEEP_CONTENT: true
        });
        parts.push(
          <span
            key={match.index}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            className="inline-block"
          />
        );
      } catch {
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
    const useNewFence = String(import.meta.env.VITE_ENABLE_NEW_CODE_FENCE || 'true') === 'true';

    // Validate and normalize input text
    if (!text) {
      return <span className="text-yellow-500">[No content]</span>;
    }
    if (typeof text !== 'string') {
      const converted = String(text);
      if (converted === '[object Object]') {
        return <span className="text-red-500">[Invalid content type: {typeof text}]</span>;
      }
      text = converted;
    }

    // Normalize our custom placeholders to real code-fence markers
    text = normalizeCodePlaceholders(text);

    // 1) Replace media tags with React elements/placeholders
    const mediaProcessed = renderMediaTags(text, media || [], imageSize);

    // 2) For string parts, optionally tokenize code fences/inline, then process special chars and LaTeX
    const out: React.ReactNode[] = [];

    mediaProcessed.forEach((part, pIdx) => {
      if (React.isValidElement(part)) {
        out.push(React.cloneElement(part, { key: `media-${pIdx}` }));
        return;
      }

      const str = String(part ?? '');

      if (useNewFence) {
        const segs = tokenizeCodeAndText(str);
        segs.forEach((seg, sIdx) => {
          if (seg.type === 'block') {
            const safe = DOMPurify.sanitize(seg.content, { KEEP_CONTENT: true });
            out.push(
              <pre key={`blk-${pIdx}-${sIdx}`} style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }} className="rounded border border-terminal-accent/30 bg-terminal-accent/10 p-3 my-2">
                <code className={seg.lang ? `language-${seg.lang}` : undefined}>{safe}</code>
              </pre>
            );
          } else if (seg.type === 'inline') {
            const safe = DOMPurify.sanitize(seg.content, { KEEP_CONTENT: true });
            out.push(
              <code key={`inl-${pIdx}-${sIdx}`} className="px-1 py-0.5 rounded bg-terminal-accent/10 border border-terminal-accent/30">
                {safe}
              </code>
            );
          } else {
            const processed = processSpecialCharacters(seg.content);
            const latexNodes = renderLatex(processed);
            if (Array.isArray(latexNodes)) {
              latexNodes.forEach((node, nIdx) => {
                if (node == null) return;
                out.push(
                  React.isValidElement(node)
                    ? React.cloneElement(node, { key: `ln-${pIdx}-${sIdx}-${nIdx}` })
                    : <span key={`ln-${pIdx}-${sIdx}-${nIdx}`}>{String(node)}</span>
                );
              });
            } else if (latexNodes != null) {
              out.push(
                React.isValidElement(latexNodes)
                  ? React.cloneElement(latexNodes, { key: `ln-${pIdx}-${sIdx}` })
                  : <span key={`ln-${pIdx}-${sIdx}`}>{String(latexNodes)}</span>
              );
            }
          }
        });
      } else {
        const processed = processSpecialCharacters(str);
        const latexNodes = renderLatex(processed);
        if (Array.isArray(latexNodes)) {
          latexNodes.forEach((node, nIdx) => {
            if (node == null) return;
            out.push(
              React.isValidElement(node)
                ? React.cloneElement(node, { key: `ln-${pIdx}-${nIdx}` })
                : <span key={`ln-${pIdx}-${nIdx}`}>{String(node)}</span>
            );
          });
        } else if (latexNodes != null) {
          out.push(
            React.isValidElement(latexNodes)
              ? React.cloneElement(latexNodes, { key: `ln-${pIdx}` })
              : <span key={`ln-${pIdx}`}>{String(latexNodes)}</span>
          );
        }
      }
    });

    return (
      <MediaErrorBoundary>
        <span>{out}</span>
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
