import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// Combines company plan + 30-day chat usage + document count
export function useSubscription() {
  const company = useQuery({
    queryKey: ['company'],
    queryFn: () => api.get('/company').then((r) => r.data.data),
  });

  const usage = useQuery({
    queryKey: ['analytics', 'overview', { period: '30d' }],
    queryFn: () => {
      const to   = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return api
        .get('/analytics/overview', {
          params: {
            from: from.toISOString().slice(0, 10),
            to:   to.toISOString().slice(0, 10),
          },
        })
        .then((r) => r.data.data);
    },
  });

  const docs = useQuery({
    queryKey: ['documents', { page: 1, limit: 1 }],
    queryFn: () =>
      api.get('/documents', { params: { page: 1, limit: 1 } }).then((r) => r.data),
  });

  return {
    isLoading: company.isLoading || usage.isLoading || docs.isLoading,
    plan:          company.data?.plan ?? 'free',
    companyName:   company.data?.name,
    chatUsed:      usage.data?.totalChats ?? 0,
    documentCount: docs.data?.pagination?.total ?? 0,
  };
}
