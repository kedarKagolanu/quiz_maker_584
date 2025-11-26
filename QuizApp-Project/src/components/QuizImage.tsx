import React from 'react';

interface QuizImageProps {
  src: string;
  alt: string;
  index: number;
}

export const QuizImage: React.FC<QuizImageProps> = ({ src, alt, index }) => {
  const [imageError, setImageError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const handleError = () => {
    console.error(`Failed to load image ${index}:`, src);
    setImageError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  if (imageError) {
    return (
      <span className="quiz-image-fallback">
        [img:{index}] - Image failed to load
      </span>
    );
  }

  return (
    <div style={{ display: 'inline-block', margin: '8px 0' }}>
      {loading && <span style={{ color: '#60a5fa' }}>Loading image...</span>}
      <img
        src={src}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          maxWidth: '100%',
          maxHeight: '300px',
          borderRadius: '8px',
          border: '2px solid #374151',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: loading ? 'none' : 'block'
        }}
      />
    </div>
  );
};

export default QuizImage;