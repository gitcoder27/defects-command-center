import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { IssueCommentRequest, IssueCommentResponse } from 'shared/types';

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, body }: { key: string; body: string }) =>
      api.post<IssueCommentResponse>(`/issues/${key}/comments`, { text: body } satisfies IssueCommentRequest),
    onSettled: (_data, _error, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['issue', key] });
    },
  });
}
