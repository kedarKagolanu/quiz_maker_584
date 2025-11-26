import React from 'react';
import { LatexRenderer } from './LatexRenderer';
import { MediaItem } from '@/types/quiz';

interface QuizPreviewProps {
  questions: any[];
  media: MediaItem[];
  imageSize: 'small' | 'medium' | 'large' | 'xlarge';
  currentQuestionIndex: number;
  onQuestionChange: (index: number) => void;
  onImageSizeChange: (size: 'small' | 'medium' | 'large' | 'xlarge') => void;
}

const getImageSizeStyles = (size: 'small' | 'medium' | 'large' | 'xlarge') => {
  switch (size) {
    case 'small':
      return { maxHeight: '150px', maxWidth: '200px' };
    case 'medium':
      return { maxHeight: '300px', maxWidth: '400px' };
    case 'large':
      return { maxHeight: '450px', maxWidth: '600px' };
    case 'xlarge':
      return { maxHeight: '600px', maxWidth: '800px' };
    default:
      return { maxHeight: '300px', maxWidth: '400px' };
  }
};

export const QuizPreview: React.FC<QuizPreviewProps> = ({
  questions,
  media,
  imageSize,
  currentQuestionIndex,
  onQuestionChange,
  onImageSizeChange
}) => {
  if (!questions || questions.length === 0) {
    return (
      <div className="bg-gray-800/50 border-2 border-gray-600 rounded-xl p-6 text-center">
        <div className="text-gray-400 mb-2">📋 Quiz Preview</div>
        <div className="text-gray-500 text-sm">Add questions to see preview</div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <div className="bg-red-800/30 border-2 border-red-500 rounded-xl p-6 text-center">
        <div className="text-red-300">❌ Invalid question format</div>
      </div>
    );
  }

  // Create a temporary media array with the new image size
  const tempMediaWithSize = media.map(item => ({
    ...item,
    customSize: getImageSizeStyles(imageSize)
  }));

  return (
    <div className="bg-gray-900/70 border-2 border-blue-500/40 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-blue-300 font-bold text-lg flex items-center gap-2">
          🎯 <span>Live Quiz Preview</span>
        </div>
        <div className="text-sm text-blue-400">
          Matches actual quiz rendering 100%
        </div>
      </div>

      {/* Image Size Controls */}
      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
        <div className="text-blue-200 font-medium mb-3 flex items-center gap-2">
          📐 <span>Image Size Settings</span>
        </div>
        <div className="flex gap-3">
          {(['small', 'medium', 'large', 'xlarge'] as const).map(size => (
            <button
              key={size}
              onClick={() => onImageSizeChange(size)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                imageSize === size 
                  ? 'border-blue-400 bg-blue-500/30 text-blue-100' 
                  : 'border-gray-500 hover:border-blue-400 text-gray-300 hover:text-blue-100'
              }`}
            >
              {size.charAt(0).toUpperCase() + size.slice(1)}
              <div className="text-xs opacity-75">
                {size === 'small' && '150px'}
                {size === 'medium' && '300px'}
                {size === 'large' && '450px'}
                {size === 'xlarge' && '600px'}
              </div>
            </button>
          ))}
        </div>
        <div className="text-xs text-blue-300 mt-2">
          💡 This setting will apply to all images in the quiz
        </div>
      </div>

      {/* Question Navigation */}
      {questions.length > 1 && (
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
          <div className="text-purple-200 font-medium mb-3 flex items-center gap-2">
            🧭 <span>Preview Navigation ({questions.length} questions)</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onQuestionChange(idx)}
                className={`w-10 h-10 rounded-lg font-bold transition-all ${
                  currentQuestionIndex === idx 
                    ? 'bg-purple-500 text-white ring-2 ring-purple-300' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Question Preview */}
      <div className="bg-gray-800/50 border-2 border-gray-500/50 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-gray-300 font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
          <div className="text-xs text-gray-400">
            Size: {imageSize} ({getImageSizeStyles(imageSize).maxHeight})
          </div>
        </div>

        {/* Question Text */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
          <div className="text-gray-200 text-lg" style={{ lineHeight: '1.6' }}>
            <LatexRenderer text={currentQuestion.q} media={tempMediaWithSize} imageSize={imageSize} />
          </div>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          <div className="text-gray-300 font-medium">Answer Options:</div>
          {currentQuestion.o?.map((option: string, idx: number) => (
            <div
              key={idx}
              className={`border-2 p-4 rounded-xl transition-all ${
                currentQuestion.a === idx 
                  ? 'border-green-400 bg-green-500/20 text-green-100' 
                  : 'border-gray-500 bg-gray-700/30 text-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`font-bold text-lg ${
                  currentQuestion.a === idx ? 'text-green-300' : 'text-gray-400'
                }`}>
                  {String.fromCharCode(65 + idx)}.
                </span>
                <div className="flex-1" style={{ lineHeight: '1.6' }}>
                  <LatexRenderer text={option} media={tempMediaWithSize} imageSize={imageSize} />
                </div>
                {currentQuestion.a === idx && (
                  <span className="text-green-400 font-bold text-sm">✓ Correct</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Media Debug Info */}
        {media.length > 0 && (
          <div className="bg-gray-800/70 border border-gray-600/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">📁 Media Files ({media.length}):</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {media.map((item, idx) => (
                <div key={idx} className="text-gray-300">
                  <span className="text-blue-400">[{item.type}:{idx + 1}]</span> {item.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};