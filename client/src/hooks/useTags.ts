import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LocalTag, TagDeleteResponse, TagUsageResponse } from '@/types';

interface TagsResponse {
  tags: LocalTag[];
}

export function useTags() {
  return useQuery<LocalTag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get<TagsResponse>('/tags');
      return res.tags;
    },
  });
}

export function useTagUsage(tagId?: number, enabled = true) {
  return useQuery<TagUsageResponse>({
    queryKey: ['tagUsage', tagId],
    enabled: enabled && tagId !== undefined,
    queryFn: async () => api.get<TagUsageResponse>(`/tags/${tagId}/usage`),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api.post<LocalTag>('/tags', data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force = false }: { id: number; force?: boolean }) =>
      api.delete<TagDeleteResponse>(`/tags/${id}${force ? '?force=true' : ''}`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tagCounts'] });
    },
  });
}

export function useSetIssueTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, tagIds }: { key: string; tagIds: number[] }) =>
      api.put<{ tags: LocalTag[] }>(`/tags/issue/${key}`, { tagIds }),
    onSettled: (_data, _error, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', key] });
    },
  });
}
