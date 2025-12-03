import React from 'react';

interface MediaErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface MediaErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class MediaErrorBoundary extends React.Component<MediaErrorBoundaryProps, MediaErrorBoundaryState> {
  constructor(props: MediaErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): MediaErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Media Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '12px',
          backgroundColor: '#374151',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          margin: '8px 0'
        }}>
          <div style={{
            color: '#ef4444',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            ⚠️ Media Rendering Error
          </div>
          <div style={{
            color: '#9ca3af',
            fontSize: '12px'
          }}>
            There was an error rendering this media. Please try re-uploading the file.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MediaErrorBoundary;