import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useOverview(params) {
  return useQuery({
    queryKey: ['analytics', 'overview', params],
    queryFn: () =>
      api.get('/analytics/overview', { params }).then((r) => r.data.data),
  });
}

export function useDailyChats(params) {
  return useQuery({
    queryKey: ['analytics', 'chats', 'daily', params],
    queryFn: () =>
      api.get('/analytics/chats/daily', { params }).then((r) => r.data.data),
  });
}

export function useRecentFeedback(limit = 5) {
  return useQuery({
    queryKey: ['analytics', 'feedback', 'recent', limit],
    queryFn: () =>
      api.get('/analytics/feedback', { params: { limit } }).then((r) => r.data.data),
  });
}
