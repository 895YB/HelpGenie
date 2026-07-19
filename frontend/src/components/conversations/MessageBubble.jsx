import { ThumbsUp, ThumbsDown, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

function fmtTime(ms) {
  if (!ms) return null;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row' : 'flex-row-reverse')}>
      {/* Avatar dot */}
      <div
        className={cn(
          'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          isUser
            ? 'bg-gray-200 text-gray-600'
            : 'bg-brand-500 text-white'
        )}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={cn('flex max-w-[75%] flex-col gap-1', isUser ? 'items-start' : 'items-end')}>
        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-tl-sm bg-gray-100 text-gray-800'
              : 'rounded-tr-sm bg-brand-500 text-white'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Meta row */}
        <div
          className={cn(
            'flex items-center gap-2.5 text-xs text-gray-400',
            isUser ? 'flex-row' : 'flex-row-reverse'
          )}
        >
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

          {!isUser && (
            <>
              {message.answeredFromContext && (
                <span className="flex items-center gap-0.5 text-green-500">
                  <Zap className="h-3 w-3" />
                  From context
                </span>
              )}
              {message.responseTimeMs && (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {fmtTime(message.responseTimeMs)}
                </span>
              )}
              {message.feedback?.rating && (
                <span
                  className={cn(
                    'flex items-center gap-0.5',
                    message.feedback.rating === 'thumbs_up'
                      ? 'text-green-500'
                      : 'text-red-400'
                  )}
                >
                  {message.feedback.rating === 'thumbs_up' ? (
                    <ThumbsUp className="h-3 w-3" />
                  ) : (
                    <ThumbsDown className="h-3 w-3" />
                  )}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
