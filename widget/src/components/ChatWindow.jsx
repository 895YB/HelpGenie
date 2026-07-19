import { useState } from 'react';
import Header from './Header.jsx';
import MessageList from './MessageList.jsx';
import ChatInput from './ChatInput.jsx';
import SuggestedQuestions from './SuggestedQuestions.jsx';
import EmailTranscriptModal from './EmailTranscriptModal.jsx';

/** @param {{config: import('../types').WidgetConfig, chat: ReturnType<typeof import('../hooks/useSocketChat').useSocketChat>, onClose: () => void}} props */
export default function ChatWindow({ config, chat, onClose }) {
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const hasMessages = chat.messages.length > 0;

  return (
    <div className="relative flex h-[32rem] max-h-[75vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
      <Header config={config} onClose={onClose} onEmailTranscript={() => setShowTranscriptModal(true)} />

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!hasMessages && (
          <div className="mb-3 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {config.welcomeMessage}
          </div>
        )}

        <MessageList
          messages={chat.messages}
          config={config}
          onFeedback={chat.sendFeedback}
          isStreaming={chat.isStreaming}
        />

        {!hasMessages && config.suggestedQuestions?.length > 0 && (
          <SuggestedQuestions questions={config.suggestedQuestions} onSelect={chat.sendMessage} />
        )}
      </div>

      {chat.error && (
        <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
          {chat.error}
        </div>
      )}

      <ChatInput onSend={chat.sendMessage} disabled={chat.isStreaming} placeholder={config.placeholder} />

      {showTranscriptModal && (
        <EmailTranscriptModal onClose={() => setShowTranscriptModal(false)} onSubmit={chat.sendTranscript} />
      )}
    </div>
  );
}
