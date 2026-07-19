import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useConversations(params = {}) {
  return useQuery({
    queryKey: ['conversations', 'list', params],
    queryFn: () => api.get('/chat/conversations', { params }).then((r) => r.data),
    keepPreviousData: true,
  });
}

export function useConversation(id) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () =>
      api.get(`/chat/conversations/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCloseConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/chat/conversations/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', id] });
    },
  });
}
