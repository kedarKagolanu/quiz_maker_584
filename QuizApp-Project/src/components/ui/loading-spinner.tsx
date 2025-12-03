import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`inline-block ${sizeClasses[size]} ${className}`}>
      <div className="relative">
        {/* Outer spinning circle */}
        <div className="absolute inset-0 border-2 border-transparent border-t-current border-r-current rounded-full animate-spin"></div>
        {/* Inner pulsing dot */}
        <div className="absolute inset-1 bg-current rounded-full opacity-20 animate-pulse"></div>
      </div>
    </div>
  );
};

interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  loadingText?: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  children,
  onClick,
  disabled,
  className = '',
  loadingText
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        relative flex items-center justify-center gap-2 px-4 py-2 
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
    >
      {isLoading && (
        <LoadingSpinner size="sm" className="text-current" />
      )}
      <span className={isLoading ? 'opacity-75' : ''}>
        {isLoading && loadingText ? loadingText : children}
      </span>
    </button>
  );
};