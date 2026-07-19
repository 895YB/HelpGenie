import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useCompany() {
  return useQuery({
    queryKey: ['company'],
    queryFn: () => api.get('/company').then((r) => r.data.data),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch('/company', data).then((r) => r.data.data),
    onSuccess: (updated) => {
      qc.setQueryData(['company'], updated);
    },
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('logo', file);
      return api
        .post('/company/logo', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data.data);
    },
    onSuccess: (updated) => {
      qc.setQueryData(['company'], updated);
    },
  });
}

export function useWidgetSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
  });
}

export function useUpdateWidgetSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      api.patch('/settings', { widgetSettings: data }).then((r) => r.data.data),
    onSuccess: (updated) => {
      qc.setQueryData(['settings'], updated);
    },
  });
}
