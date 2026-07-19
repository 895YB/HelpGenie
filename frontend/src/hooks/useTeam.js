import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/team').then((r) => r.data.data),
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }) => api.post('/team/invite', { email, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }) =>
      api.patch(`/team/${userId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.delete(`/team/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}
