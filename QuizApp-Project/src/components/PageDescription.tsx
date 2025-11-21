import React from "react";
import { Terminal, TerminalLine } from "./Terminal";

interface PageDescriptionProps {
  title: string;
  description: string;
  features: string[];
}

export const PageDescription: React.FC<PageDescriptionProps> = ({ title, description, features }) => {
  return (
    <div className="mt-8 border-t border-terminal-accent/30 pt-6">
      <Terminal title={`about ${title}`}>
        <div className="space-y-4">
          <TerminalLine prefix="📖" className="text-terminal-bright font-semibold">
            {description}
          </TerminalLine>
          
          <div className="space-y-2">
            <TerminalLine prefix="🔧" className="text-terminal-accent font-semibold">
              Key Features:
            </TerminalLine>
            {features.map((feature, index) => (
              <TerminalLine key={index} prefix="•" className="text-terminal-foreground ml-6">
                {feature}
              </TerminalLine>
            ))}
          </div>
        </div>
      </Terminal>
    </div>
  );
};