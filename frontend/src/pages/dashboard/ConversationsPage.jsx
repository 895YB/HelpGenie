import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, MessageSquare, ChevronLeft, ChevronRight, User,
} from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import ConversationDetail from '@/components/conversations/ConversationDetail';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = [
  { value: '',       label: 'All'    },
  { value: 'open',   label: 'Open'   },
  { value: 'closed', label: 'Closed' },
];

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60)     return 'just now';
  if (secs < 3600)   return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400)  return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function ConversationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');

  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [page,     setPage]     = useState(1);

  const params = {
    page,
    limit: 20,
    ...(status && { status }),
    ...(search && { search }),
  };

  const { data, isLoading } = useConversations(params);
  const conversations = data?.data       ?? [];
  const pagination    = data?.pagination ?? { page: 1, pages: 1, total: 0 };

  const select = (id) => {
    if (id) setSearchParams({ id });
    else    setSearchParams({});
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* ── List panel ──────────────────────────────────── */}
      <div
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:w-80 lg:shrink-0',
          selectedId && 'hidden lg:flex'
        )}
      >
        {/* Search + filters */}
        <div className="shrink-0 space-y-2.5 border-b border-gray-100 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search conversations…"
              className="input-base pl-9 py-2 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setStatus(value); setPage(1); }}
                className={cn(
                  'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  status === value
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {isLoading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="flex animate-pulse gap-3 p-3.5">
                <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-28 rounded bg-gray-200" />
                  <div className="h-3 w-full rounded bg-gray-200" />
                  <div className="h-3 w-16 rounded bg-gray-200" />
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">
              No conversations found
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationRow
                key={conv._id}
                conv={conv}
                isSelected={conv._id === selectedId}
                onClick={() => select(conv._id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="shrink-0 flex items-center justify-between border-t border-gray-100 px-3 py-2">
            <span className="text-xs text-gray-400">
              {pagination.total} total
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex items-center px-1 text-xs text-gray-500">
                {page}/{pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail panel ────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm',
          !selectedId && 'hidden lg:flex'
        )}
      >
        {selectedId ? (
          <ConversationDetail
            conversationId={selectedId}
            onBack={() => select(null)}
          />
        ) : (
          <EmptyDetail />
        )}
      </div>
    </div>
  );
}

function ConversationRow({ conv, isSelected, onClick }) {
  const customer = conv.customerInfo;
  const name     = customer?.name || 'Anonymous';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 p-3.5 text-left transition-colors',
        isSelected ? 'bg-brand-50' : 'hover:bg-gray-50'
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
        <User className="h-4 w-4 text-gray-500" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <p className={cn('truncate text-sm font-medium', isSelected ? 'text-brand-700' : 'text-gray-900')}>
            {name}
          </p>
          <span className="shrink-0 text-xs text-gray-400">
            {timeAgo(conv.updatedAt || conv.createdAt)}
          </span>
        </div>

        {customer?.email && (
          <p className="truncate text-xs text-gray-400">{customer.email}</p>
        )}

        <div className="mt-1 flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-xs text-gray-400">
            <MessageSquare className="h-3 w-3" />
            {conv.messageCount ?? 0}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              conv.status === 'open'
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-500'
            )}
          >
            {conv.status}
          </span>
        </div>
      </div>
    </button>
  );
}

function EmptyDetail() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <MessageSquare className="h-7 w-7 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">Select a conversation</p>
        <p className="mt-0.5 text-xs text-gray-400">
          Click any conversation on the left to view the full message thread.
        </p>
      </div>
    </div>
  );
}
