import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), delete: vi.fn() },
}));

const { default: api } = await import('@/lib/api');
const { useConversations, useConversation } = await import('@/hooks/useConversations');

function wrapper({ children }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useConversations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests the conversation list with the given params', async () => {
    api.get.mockResolvedValue({ data: { data: [{ _id: 'c1' }], meta: { total: 1 } } });

    const { result } = renderHook(() => useConversations({ status: 'active' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith('/chat/conversations', { params: { status: 'active' } });
    expect(result.current.data).toEqual({ data: [{ _id: 'c1' }], meta: { total: 1 } });
  });

  it('surfaces an error state when the request fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useConversations(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Network error');
  });
});

describe('useConversation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stays disabled (no request) until an id is provided', () => {
    const { result } = renderHook(() => useConversation(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches a single conversation by id once one is provided', async () => {
    api.get.mockResolvedValue({ data: { data: { conversation: { _id: 'c1' }, messages: [] } } });

    const { result } = renderHook(() => useConversation('c1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith('/chat/conversations/c1');
  });
});
