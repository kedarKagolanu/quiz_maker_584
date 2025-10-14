import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexRendererProps {
  text: string;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({ text }) => {
  const renderLatex = (inputText: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\$(.*?)\$/g;
    let match;

    while ((match = regex.exec(inputText)) !== null) {
      // Add text before the LaTeX
      if (match.index > lastIndex) {
        parts.push(inputText.substring(lastIndex, match.index));
      }

      // Render LaTeX
      try {
        const latex = match[1];
        const html = katex.renderToString(latex, {
          throwOnError: false,
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
        parts.push(<span key={match.index} className="text-destructive">{match[0]}</span>);
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < inputText.length) {
      parts.push(inputText.substring(lastIndex));
    }

    return parts;
  };

  return <>{renderLatex(text)}</>;
};
