import React from 'react';
import { QuizDetailInfo } from '@/lib/quizDetails';
import { Clock, Users, Folder, Settings, Play, Edit, Share2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface QuizCardProps {
  details: QuizDetailInfo;
  variant?: 'card' | 'list' | 'compact';
  showActions?: boolean;
  onPlay?: (quizId: string) => void;
  onEdit?: (quizId: string) => void;
  onShare?: (quizId: string) => void;
  onDelete?: (quizId: string) => void;
  onCustomize?: (quizId: string) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  details,
  variant = 'card',
  showActions = true,
  onPlay,
  onEdit,
  onShare,
  onDelete,
  onCustomize
}) => {
  const isValid = details.isValid;
  const hasValidationIssues = details.validationIssues.length > 0;

  const getStatusColor = () => {
    if (!isValid) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (details.isMultiQuiz) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  };

  const getStatusIcon = () => {
    if (!isValid) return '❌';
    if (details.isMultiQuiz) return '🔗';
    return '📝';
  };

  const getAccessIcon = () => {
    switch (details.accessLevel) {
      case 'public': return '🌐';
      case 'shared': return '👥';
      case 'private': return '🔒';
      default: return '📄';
    }
  };

  if (variant === 'list') {
    return (
      <div className={`flex items-center gap-4 p-3 rounded-lg border transition-colors hover:bg-terminal-accent/5 ${getStatusColor()}`}>
        <div className="text-2xl">{getStatusIcon()}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-terminal-bright truncate">{details.title}</h3>
            <span className="text-xs px-2 py-1 rounded bg-terminal-accent/20 text-terminal-dim">
              {getAccessIcon()} {details.accessLevel}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-terminal-dim">
            <span>{details.totalQuestions} questions{details.isMultiQuiz ? ' (including sources)' : ''}</span>
            {details.questionLimit && (
              <span>Limit: {details.questionLimit}</span>
            )}
            {details.isMultiQuiz && (
              <span>{details.sourceQuizCount} sources</span>
            )}
            {details.folderName && (
              <span className="flex items-center gap-1">
                <Folder className="w-3 h-3" />
                {details.folderName}
              </span>
            )}
          </div>

          {hasValidationIssues && (
            <div className="text-xs text-red-400 mt-1">
              ⚠️ {details.validationIssues.length} validation issue{details.validationIssues.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            {onPlay && isValid && (
              <button
                onClick={() => onPlay(details.id)}
                className="p-2 rounded hover:bg-green-500/20 text-green-400 transition-colors"
                title="Take Quiz"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            {onCustomize && (
              <button
                onClick={() => onCustomize(details.id)}
                className="p-2 rounded hover:bg-blue-500/20 text-blue-400 transition-colors"
                title="Customize"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(details.id)}
                className="p-2 rounded hover:bg-yellow-500/20 text-yellow-400 transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`p-2 rounded border transition-colors hover:bg-terminal-accent/5 ${getStatusColor()}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{getStatusIcon()}</span>
          <span className="text-sm font-medium text-terminal-bright truncate">{details.title}</span>
          <span className="text-xs text-terminal-dim ml-auto">{details.totalQuestions}q</span>
        </div>
        
        {hasValidationIssues && (
          <div className="text-xs text-red-400">
            {details.validationIssues[0]}
          </div>
        )}
      </div>
    );
  }

  // Default card variant
  return (
    <div className={`p-4 rounded-lg border transition-all hover:shadow-lg ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getStatusIcon()}</span>
          <div>
            <h3 className="font-semibold text-terminal-bright">{details.title}</h3>
            <p className="text-xs text-terminal-dim">
              {getAccessIcon()} {details.accessLevel} • {formatDistanceToNow(new Date(details.createdAt))} ago
            </p>
          </div>
        </div>
        
        {showActions && (
          <div className="flex items-center gap-1">
            {onShare && (
              <button
                onClick={() => onShare(details.id)}
                className="p-1.5 rounded hover:bg-terminal-accent/20 text-terminal-dim transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(details.id)}
                className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {details.description && (
        <p className="text-sm text-terminal-dim mb-3 line-clamp-2">{details.description}</p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-terminal-bright">
            📊 {details.totalQuestions} questions
            {details.isMultiQuiz && ' (including sources)'}
          </span>
          {details.questionLimit && details.questionLimit < details.totalQuestions && (
            <span className="text-yellow-400">
              🎯 Limited to {details.questionLimit}
            </span>
          )}
        </div>

        {details.isMultiQuiz && (
          <div className="text-sm text-blue-400">
            🔗 {details.sourceQuizCount} source quiz{details.sourceQuizCount !== 1 ? 'es' : ''}
            {details.sourceDetails && details.sourceDetails.length > 0 && (
              <div className="mt-1 space-y-1">
                {details.sourceDetails.slice(0, 3).map((source, idx) => (
                  <div key={idx} className="text-xs text-terminal-dim ml-4">
                    • {source.title} ({source.totalAvailable} questions)
                  </div>
                ))}
                {details.sourceDetails.length > 3 && (
                  <div className="text-xs text-terminal-dim ml-4">
                    ... and {details.sourceDetails.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {details.hasTimeConstraints && (
          <div className="flex items-center gap-4 text-sm text-orange-400">
            <Clock className="w-4 h-4" />
            <div>
              {details.totalTimeLimit && <span>Total: {details.totalTimeLimit}min</span>}
              {details.perQuestionTimeLimit && (
                <span className="ml-2">Per question: {details.perQuestionTimeLimit}s</span>
              )}
            </div>
          </div>
        )}

        {details.hasMedia && (
          <div className="text-sm text-purple-400">
            🎵 {details.mediaCount} media files
          </div>
        )}

        {details.folderName && (
          <div className="flex items-center gap-1 text-sm text-terminal-dim">
            <Folder className="w-4 h-4" />
            {details.folderName}
          </div>
        )}

        {details.attemptCount !== undefined && (
          <div className="text-sm text-terminal-dim">
            📈 {details.attemptCount} attempt{details.attemptCount !== 1 ? 's' : ''}
            {details.bestScore !== undefined && (
              <span className="ml-2 text-green-400">Best: {Math.round(details.bestScore)}%</span>
            )}
          </div>
        )}
      </div>

      {hasValidationIssues && (
        <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/30">
          <div className="text-sm font-medium text-red-400 mb-1">
            ⚠️ Validation Issues ({details.validationIssues.length})
          </div>
          <div className="space-y-1">
            {details.validationIssues.slice(0, 3).map((issue, idx) => (
              <div key={idx} className="text-xs text-red-300">
                • {issue}
              </div>
            ))}
            {details.validationIssues.length > 3 && (
              <div className="text-xs text-red-300">
                ... and {details.validationIssues.length - 3} more issues
              </div>
            )}
          </div>
        </div>
      )}

      {showActions && (
        <div className="flex gap-2">
          {onPlay && isValid && (
            <button
              onClick={() => onPlay(details.id)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4 inline mr-2" />
              Take Quiz
            </button>
          )}
          
          {onCustomize && (
            <button
              onClick={() => onCustomize(details.id)}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Customize
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(details.id)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
