import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const PROCESSING_STATUSES = ['pending', 'processing'];

export function useDocuments(params = {}) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => api.get('/documents', { params }).then((r) => r.data),
    // Poll every 3s while any document is still processing
    refetchInterval: (query) => {
      const docs = query.state.data?.data ?? [];
      return docs.some((d) => PROCESSING_STATUSES.includes(d.status)) ? 3000 : false;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }) => {
      const form = new FormData();
      form.append('document', file);
      return api
        .post('/documents/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (onProgress && e.total) {
              onProgress(Math.round((e.loaded * 100) / e.total));
            }
          },
        })
        .then((r) => r.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useReprocessDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/documents/${id}/reprocess`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
