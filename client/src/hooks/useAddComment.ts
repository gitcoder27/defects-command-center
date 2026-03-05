import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, body }: { key: string; body: string }) =>
      api.post(`/issues/${key}/comments`, { body }),
    onSettled: (_data, _error, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['issue', key] });
    },
  });
}
