import React from "react";
import { cn } from "@/lib/utils";

interface TerminalProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ children, title, className }) => {
  return (
    <div className={cn("min-h-screen bg-terminal text-terminal-foreground font-mono p-4", className)}>
      <div className="max-w-4xl mx-auto">
        {title && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-terminal-accent">$</span>
            <span className="text-terminal-bright">{title}</span>
          </div>
        )}
        <div className="terminal-content">{children}</div>
      </div>
    </div>
  );
};

export const TerminalLine: React.FC<{ prefix?: string; children: React.ReactNode; className?: string }> = ({
  prefix = ">",
  children,
  className,
}) => {
  return (
    <div className={cn("flex gap-2 mb-2", className)}>
      <span className="text-terminal-accent">{prefix}</span>
      <span>{children}</span>
    </div>
  );
};

export const TerminalInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({
  label,
  className,
  ...props
}) => {
  return (
    <div className="mb-4">
      <TerminalLine>{label}</TerminalLine>
      <input
        className={cn(
          "w-full bg-terminal border border-terminal-accent/30 text-terminal-foreground px-3 py-2 rounded focus:outline-none focus:border-terminal-accent",
          className
        )}
        {...props}
      />
    </div>
  );
};

export const TerminalButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        "px-4 py-2 bg-terminal-accent text-terminal hover:bg-terminal-accent/80 border border-terminal-accent rounded transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
