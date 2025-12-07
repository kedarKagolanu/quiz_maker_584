import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface ImprovedJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

export const ImprovedJsonEditor: React.FC<ImprovedJsonEditorProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  minHeight = 400
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);

  // Calculate visual lines (accounting for word wrap)
  const calculateVisualLines = (text: string, textarea: HTMLTextAreaElement): number => {
    if (!textarea) return text.split('\n').length;
    
    const lines = text.split('\n');
    let totalVisualLines = 0;
    
    // Create a temporary element to measure text width
    const tempDiv = document.createElement('div');
    tempDiv.style.font = window.getComputedStyle(textarea).font;
    tempDiv.style.width = `${textarea.clientWidth - 20}px`; // Account for padding
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.wordWrap = 'break-word';
    document.body.appendChild(tempDiv);
    
    lines.forEach((line) => {
      if (line === '') {
        totalVisualLines += 1; // Empty line counts as 1
      } else {
        tempDiv.textContent = line;
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
        const visualHeight = tempDiv.scrollHeight;
        const wrappedLines = Math.ceil(visualHeight / lineHeight);
        totalVisualLines += Math.max(1, wrappedLines);
      }
    });
    
    document.body.removeChild(tempDiv);
    return totalVisualLines;
  };

  // Update line count when content or textarea size changes
  useEffect(() => {
    if (textareaRef.current) {
      const visualLines = calculateVisualLines(value, textareaRef.current);
      setLineCount(Math.max(1, visualLines));
    }
  }, [value]);

  // Handle resize observer for textarea
  useEffect(() => {
    if (!textareaRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      if (textareaRef.current) {
        const visualLines = calculateVisualLines(value, textareaRef.current);
        setLineCount(Math.max(1, visualLines));
      }
    });
    
    resizeObserver.observe(textareaRef.current);
    
    return () => resizeObserver.disconnect();
  }, [value]);

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  return (
    <div className={`relative border border-input rounded-md ${className}`}>
      {/* Line Numbers */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-12 bg-muted text-muted-foreground text-sm font-mono leading-relaxed p-3 pr-2 text-right border-r border-input select-none pointer-events-none z-10"
        style={{ 
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          minHeight: `${minHeight}px`
        }}
      >
        <pre className="whitespace-pre-wrap break-words">
          {lineNumbers}
        </pre>
      </div>

      {/* JSON Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-sm pl-16 pr-3 py-3 border-0 resize-none focus:ring-0"
        style={{ 
          minHeight: `${minHeight}px`,
          fontSize: '0.875rem',
          lineHeight: '1.25rem'
        }}
      />
    </div>
  );
};