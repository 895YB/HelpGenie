import { useEffect, useRef, useState } from 'react';
import { X, User, Mail, MessageSquare, XCircle, ChevronLeft } from 'lucide-react';
import { useConversation, useCloseConversation } from '@/hooks/useConversations';
import MessageBubble from './MessageBubble';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function ConversationDetail({ conversationId, onBack }) {
  const { data: conv, isLoading, isError } = useConversation(conversationId);
  const closeMutation = useCloseConversation();
  const [confirmClose, setConfirmClose] = useState(false);
  const bottomRef = useRef(null);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (conv?.messages?.length) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conv?.messages?.length]);

  // Reset confirm state when conversation changes
  useEffect(() => {
    setConfirmClose(false);
  }, [conversationId]);

  const handleClose = async () => {
    if (!confirmClose) { setConfirmClose(true); return; }
    await closeMutation.mutateAsync(conversationId);
    setConfirmClose(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <DetailHeader onBack={onBack} />
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={cn('flex gap-3 animate-pulse', i % 2 === 0 ? '' : 'flex-row-reverse')}
            >
              <div className="h-7 w-7 rounded-full bg-gray-200 shrink-0" />
              <div
                className={cn(
                  'h-14 rounded-2xl bg-gray-200',
                  i % 2 === 0 ? 'w-52' : 'w-64'
                )}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !conv) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        Could not load conversation.
      </div>
    );
  }

  const customer = conv.customerInfo;
  const isOpen   = conv.status === 'open';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
        <div className="flex items-center gap-3">
          {/* Mobile back */}
          {onBack && (
            <button
              onClick={onBack}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 lg:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
            <User className="h-4 w-4 text-brand-500" />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900">
              {customer?.name || 'Anonymous visitor'}
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              {customer?.email && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Mail className="h-3 w-3" />
                  {customer.email}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MessageSquare className="h-3 w-3" />
                {conv.messageCount ?? conv.messages?.length ?? 0} messages
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  isOpen
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                )}
              >
                {isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
        </div>

        {/* Close / confirm */}
        {isOpen && (
          <div className="flex shrink-0 items-center gap-2">
            {confirmClose ? (
              <>
                <span className="text-xs text-gray-500">Close this conversation?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={closeMutation.isPending}
                  onClick={handleClose}
                  className="gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Close
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClose}
                className="gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Close chat
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Date label */}
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-400">
          {new Date(conv.createdAt).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
          })}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
        {(conv.messages ?? []).length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No messages in this conversation.
          </div>
        ) : (
          (conv.messages ?? []).map((msg) => (
            <MessageBubble key={msg._id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function DetailHeader({ onBack }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-3.5">
      {onBack && (
        <div className="h-7 w-7 rounded-md bg-gray-200 animate-pulse lg:hidden" />
      )}
      <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-48 rounded bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}
