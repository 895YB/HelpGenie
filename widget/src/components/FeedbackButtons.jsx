import { ThumbsUpIcon, ThumbsDownIcon } from './icons.jsx';
import { cn } from '../lib/cn.js';

/** @param {{messageId: string, rating: 'thumbs_up'|'thumbs_down'|null, onFeedback: (id: string, rating: string) => void}} props */
export default function FeedbackButtons({ messageId, rating, onFeedback }) {
  return (
    <div className="flex items-center gap-1 text-gray-300 dark:text-gray-600">
      <button
        type="button"
        aria-label="Good response"
        aria-pressed={rating === 'thumbs_up'}
        onClick={() => onFeedback(messageId, 'thumbs_up')}
        className={cn('rounded p-0.5 hover:text-green-500', rating === 'thumbs_up' && 'text-green-500')}
      >
        <ThumbsUpIcon />
      </button>
      <button
        type="button"
        aria-label="Bad response"
        aria-pressed={rating === 'thumbs_down'}
        onClick={() => onFeedback(messageId, 'thumbs_down')}
        className={cn('rounded p-0.5 hover:text-red-500', rating === 'thumbs_down' && 'text-red-500')}
      >
        <ThumbsDownIcon />
      </button>
    </div>
  );
}
