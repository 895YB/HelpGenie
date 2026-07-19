import { useQuery, useMutation } from '@tanstack/react-query';
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

export function useHourlyDistribution(params) {
  return useQuery({
    queryKey: ['analytics', 'chats', 'hourly', params],
    queryFn: () =>
      api.get('/analytics/chats/hourly', { params }).then((r) => r.data.data),
  });
}

export function useSatisfactionTrend(params) {
  return useQuery({
    queryKey: ['analytics', 'satisfaction', params],
    queryFn: () =>
      api.get('/analytics/satisfaction', { params }).then((r) => r.data.data),
  });
}

export function useTokenUsage(params) {
  return useQuery({
    queryKey: ['analytics', 'tokens', params],
    queryFn: () =>
      api.get('/analytics/tokens', { params }).then((r) => r.data.data),
  });
}

export function useDocumentUsage(params) {
  return useQuery({
    queryKey: ['analytics', 'documents', params],
    queryFn: () =>
      api.get('/analytics/documents', { params }).then((r) => r.data.data),
  });
}

export function useRecentFeedback(limit = 5) {
  return useQuery({
    queryKey: ['analytics', 'feedback', 'recent', limit],
    queryFn: () =>
      api
        .get('/analytics/feedback', { params: { limit } })
        .then((r) => r.data.data),
  });
}

export function useExportCsv() {
  return useMutation({
    mutationFn: async (params) => {
      const response = await api.get('/analytics/export', {
        params,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(
        new Blob([response.data], { type: 'text/csv' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}
