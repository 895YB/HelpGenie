import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/cn.js';
import SourcesList from './SourcesList.jsx';
import FeedbackButtons from './FeedbackButtons.jsx';

/** @param {{message: import('../types').ChatMessage, config: import('../types').WidgetConfig, onFeedback: Function}} props */
export default function MessageBubble({ message, config, onFeedback }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn('flex max-w-[80%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words',
            isUser ? 'rounded-tr-sm text-white' : 'rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
          )}
          style={isUser ? { backgroundColor: config.primaryColor } : undefined}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="aiw-markdown">
              <ReactMarkdown>{message.content || ' '}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && config.showSources && message.sources?.length > 0 && (
          <SourcesList sources={message.sources} />
        )}

        {!isUser && config.allowFeedback && message.id && !message.streaming && (
          <FeedbackButtons messageId={message.id} rating={message.feedback} onFeedback={onFeedback} />
        )}
      </div>
    </div>
  );
}
