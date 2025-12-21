import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';
import { MediaItem } from '@/types/quiz';
import { renderMediaTags } from '@/lib/mediaRenderer';
import MediaErrorBoundary from './MediaErrorBoundary';
// import { EquationEditor as EquationEditorSafe } from './EquationEditorSafe';
import { EquationEditorFloating } from './EquationEditor';

interface LatexRendererProps {
  // original text content to render
  text: string;
  media?: MediaItem[];
  imageSize?: 'small' | 'medium' | 'large' | 'xlarge';
  // enable right-click editing of LaTeX equations inside $...$
  editable?: boolean;
  // called with updated text after an equation is edited
  onChangeText?: (updated: string) => void;
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

// Enhanced tokenizer with position tracking for inline editing
function tokenizeCodeAndText(input: string): Array<{ 
  type: 'text' | 'block' | 'inline'; 
  lang?: string; 
  content: string;
  startIndex?: number;
  endIndex?: number;
}> {
  const segments: Array<{ 
    type: 'text' | 'block' | 'inline'; 
    lang?: string; 
    content: string;
    startIndex?: number;
    endIndex?: number;
  }> = [];
  let i = 0;
  let textBuffer = '';
  let textStart = 0;

  const pushText = (t: string) => {
    if (!t) return;
    segments.push({ 
      type: 'text', 
      content: t,
      startIndex: textStart,
      endIndex: textStart + t.length
    });
    textStart += t.length;
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
      seg: { 
        type: 'block' as const, 
        lang, 
        content: codeBody,
        startIndex: idx,
        endIndex: closeIdx + 3
      }
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
      seg: { 
        type: 'inline' as const, 
        content,
        startIndex: idx,
        endIndex: j + 1
      }
    };
  };

  while (i < input.length) {
    const fence = tryFence(input, i);
    if (fence && fence.consumed > 0 && fence.seg) {
      if (textBuffer) { 
        pushText(textBuffer); 
        textBuffer = ''; 
        textStart = i;
      }
      segments.push(fence.seg);
      i += fence.consumed;
      textStart = i;
      continue;
    }

    const inline = tryInline(input, i);
    if (inline && inline.consumed > 0 && inline.seg) {
      if (textBuffer) { 
        pushText(textBuffer); 
        textBuffer = ''; 
        textStart = i;
      }
      segments.push(inline.seg);
      i += inline.consumed;
      textStart = i;
      continue;
    }

    textBuffer += input[i];
    i++;
  }

  if (textBuffer) pushText(textBuffer);
  return segments;
}

import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';

export const LatexRenderer: React.FC<LatexRendererProps> = ({ text, media, imageSize = 'medium', editable = false, onChangeText }) => {
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [currentEquation, setCurrentEquation] = React.useState<string>('');
  const [editorAnchor, setEditorAnchor] = React.useState<{x:number;y:number}|null>(null);
  
  // Code block editor state
  const [codeEditor, setCodeEditor] = React.useState<null | {
    id: string;
    content: string;
    lang: string;
    originalText: string;
    startIndex: number;
    endIndex: number;
  }>(null);
  const [codeHistory, setCodeHistory] = React.useState<string[]>([]);
  const [codeHistoryIndex, setCodeHistoryIndex] = React.useState<number>(-1);

  // Code block editor functions
  const openCodeEditor = (content: string, lang: string, startIdx: number, endIdx: number, blockId?: string) => {
    const id = blockId || `code-${Date.now()}`;
    console.log('Opening code editor with ID:', id);
    setCodeEditor({
      id,
      content,
      lang,
      originalText: content,
      startIndex: startIdx,
      endIndex: endIdx
    });
    setCodeHistory([content]);
    setCodeHistoryIndex(0);
  };

  const closeCodeEditor = () => {
    setCodeEditor(null);
    setCodeHistory([]);
    setCodeHistoryIndex(-1);
  };

  const updateCodeContent = (newContent: string) => {
    if (!codeEditor) return;
    
    // Update current state
    setCodeEditor(prev => prev ? { ...prev, content: newContent } : null);
    
    // Add to history if significantly different
    const lastEntry = codeHistory[codeHistoryIndex];
    if (lastEntry !== newContent && newContent.trim() !== lastEntry?.trim()) {
      const newHistory = [...codeHistory.slice(0, codeHistoryIndex + 1), newContent];
      setCodeHistory(newHistory.slice(-20)); // Keep last 20 entries
      setCodeHistoryIndex(Math.min(newHistory.length - 1, 19));
    }
  };

  const codeUndo = () => {
    if (codeHistoryIndex > 0) {
      const newIndex = codeHistoryIndex - 1;
      setCodeHistoryIndex(newIndex);
      const content = codeHistory[newIndex];
      setCodeEditor(prev => prev ? { ...prev, content } : null);
    }
  };

  const codeRedo = () => {
    if (codeHistoryIndex < codeHistory.length - 1) {
      const newIndex = codeHistoryIndex + 1;
      setCodeHistoryIndex(newIndex);
      const content = codeHistory[newIndex];
      setCodeEditor(prev => prev ? { ...prev, content } : null);
    }
  };

  const saveCodeEdit = () => {
    if (!codeEditor || !onChangeText) return;
    
    // Reconstruct the text with the updated code block, preserving original formatting
    const before = text.slice(0, codeEditor.startIndex);
    const after = text.slice(codeEditor.endIndex);
    const newCodeBlock = `\`\`\`${codeEditor.lang}\n${codeEditor.content.trimEnd()}\n\`\`\``;
    const updated = `${before}${newCodeBlock}${after}`;
    
    onChangeText(updated);
    closeCodeEditor();
  };

  const cancelCodeEdit = () => {
    closeCodeEditor();
  };

  const renderLatex = (input: string | React.ReactNode) => {
    if (typeof input !== 'string') return input;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\$([^$]+)\$/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      const start = match.index;
      const end = regex.lastIndex;
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
        const eq = match[1];
        const openEqEditor = (e: React.MouseEvent) => {
          e.preventDefault();
          setCurrentEquation(eq);
          setEditorAnchor({ x: e.clientX, y: e.clientY });
          setEditorOpen(true);
        };
        const onContextMenu = editable ? openEqEditor : undefined;
        const onClick = editable ? openEqEditor : undefined;
        parts.push(
          <span
            key={match.index}
            onContextMenu={onContextMenu}
            onClick={onClick}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            className="inline-block latex-equation-highlight cursor-pointer"
            title={editable ? 'Click to edit equation - Content sanitized' : 'LaTeX equation - Content sanitized'}
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
    const useNewFence = true; // Always enable new fence for code editing functionality

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
            const blockId = `blk-${pIdx}-${sIdx}`;
            const isEditing = codeEditor?.id === blockId;
            
            console.log('Rendering code block:', { blockId, isEditing, editable, content: seg.content.substring(0, 50) });
            
            if (editable && isEditing) {
              // Inline editor for code block
              out.push(
                <div key={blockId} className="rounded border border-blue-400 bg-terminal-accent/10 p-3 my-2 relative">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="text-terminal-dim">Editing {seg.lang || 'code'} block</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={codeUndo} 
                        disabled={codeHistoryIndex <= 0}
                        className="px-2 py-1 bg-terminal-accent/20 rounded disabled:opacity-50 hover:bg-terminal-accent/30"
                        title="Undo (Ctrl+Z)"
                      >
                        ↶
                      </button>
                      <button 
                        onClick={codeRedo} 
                        disabled={codeHistoryIndex >= codeHistory.length - 1}
                        className="px-2 py-1 bg-terminal-accent/20 rounded disabled:opacity-50 hover:bg-terminal-accent/30"
                        title="Redo (Ctrl+Y)"
                      >
                        ↷
                      </button>
                      <button 
                        onClick={saveCodeEdit}
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        title="Save (Ctrl+S)"
                      >
                        Save
                      </button>
                      <button 
                        onClick={cancelCodeEdit}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        title="Cancel (Esc)"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={codeEditor.content}
                    onChange={(e) => updateCodeContent(e.target.value)}
                    className="w-full h-32 bg-terminal text-terminal-bright border border-terminal-accent/60 rounded p-2 font-mono text-sm resize-y"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelCodeEdit();
                      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        saveCodeEdit();
                      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
                        e.preventDefault();
                        codeUndo();
                      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        codeRedo();
                      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
                        e.preventDefault();
                        codeRedo();
                      }
                    }}
                    autoFocus
                  />
                </div>
              );
            } else {
              // Read-only code block with edit capability
              out.push(
                <pre 
                  key={blockId} 
                  style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }} 
                  className={`rounded border border-terminal-accent/30 bg-terminal-accent/10 p-3 my-2 relative group ${editable ? 'cursor-pointer hover:border-blue-400/50' : ''}`}
                  onClick={editable ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Code block clicked for editing:', { blockId, content: seg.content });
                    openCodeEditor(seg.content, seg.lang || '', seg.startIndex || 0, seg.endIndex || 0, blockId);
                  } : undefined}
                  title={editable ? 'Click to edit code block' : undefined}
                >
                  {editable && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">✎ Click to edit</span>
                    </div>
                  )}
                  <code className={seg.lang ? `language-${seg.lang}` : undefined}>{safe}</code>
                </pre>
              );
            }
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
      <>
        <MediaErrorBoundary>
          <span>{out}</span>
        </MediaErrorBoundary>
        <EquationEditorFloating
          sourceId="LatexRenderer"
          open={editorOpen}
          onOpenChange={(o)=>{ setEditorOpen(o); if(!o) setEditorAnchor(null);} }
          value={currentEquation}
          anchor={editorAnchor}
          onSave={(newValue) => {
            // Prefer direct callback to parent when available
            if (onChangeText && typeof text === 'string' && currentEquation != null) {
              const oldWrapped = `$${currentEquation}$`;
              const newWrapped = `$${newValue}$`;
              const idx = text.indexOf(oldWrapped);
              if (idx !== -1) {
                const updated = text.slice(0, idx) + newWrapped + text.slice(idx + oldWrapped.length);
                onChangeText(updated);
              }
            }
            const ev = new CustomEvent('latex-equation-edited', { detail: { old: currentEquation, value: newValue } });
            window.dispatchEvent(ev);
          }}
        />
      </>
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
