import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';
import TypingIndicator from './TypingIndicator.jsx';

/** @param {{messages: import('../types').ChatMessage[], config: import('../types').WidgetConfig, onFeedback: Function, isStreaming: boolean}} props */
export default function MessageList({ messages, config, onFeedback, isStreaming }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  const last = messages[messages.length - 1];
  const showTyping = isStreaming && last?.streaming && !last.content;

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message, index) => (
        <MessageBubble key={message.id ?? `local-${index}`} message={message} config={config} onFeedback={onFeedback} />
      ))}
      {showTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
