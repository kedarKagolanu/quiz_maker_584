import React, { useState } from "react";
import { Terminal, TerminalLine, TerminalButton } from "./Terminal";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface PageHelpProps {
  title: string;
  sections: {
    title: string;
    content: string[];
  }[];
}

export const PageHelp: React.FC<PageHelpProps> = ({ title, sections }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-terminal-accent" />
          <span className="text-terminal-bright font-semibold">{title}</span>
        </div>
        <TerminalButton 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              hide help
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              show help
            </>
          )}
        </TerminalButton>
      </div>

      {isExpanded && (
        <div className="p-4 border border-terminal-accent/30 rounded bg-terminal-accent/5">
          {sections.map((section, index) => (
            <div key={index} className={index > 0 ? "mt-4" : ""}>
              <TerminalLine prefix=">" className="text-terminal-accent font-semibold mb-2">
                {section.title}
              </TerminalLine>
              <div className="ml-6 space-y-1">
                {section.content.map((line, lineIndex) => (
                  <TerminalLine key={lineIndex} prefix="•" className="text-terminal-foreground text-xs">
                    {line}
                  </TerminalLine>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};