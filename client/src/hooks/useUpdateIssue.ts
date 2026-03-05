import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Issue, IssueUpdate } from '@/types';

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, update }: { key: string; update: IssueUpdate }) =>
      api.patch<Issue>(`/issues/${key}`, update),

    onMutate: async ({ key, update }) => {
      await queryClient.cancelQueries({ queryKey: ['issues'] });
      await queryClient.cancelQueries({ queryKey: ['issue', key] });
      const previousIssues = queryClient.getQueryData<Issue[]>(['issues']);
      const previousIssue = queryClient.getQueryData<Issue>(['issue', key]);

      queryClient.setQueriesData<Issue[]>(
        { queryKey: ['issues'] },
        (old) =>
          old?.map((issue) =>
            issue.jiraKey === key
              ? {
                  ...issue,
                  ...(update.assigneeId !== undefined && { assigneeId: update.assigneeId }),
                  ...(update.priorityName !== undefined && { priorityName: update.priorityName }),
                  ...(update.dueDate !== undefined && { dueDate: update.dueDate }),
                  ...(update.developmentDueDate !== undefined && { developmentDueDate: update.developmentDueDate }),
                  ...(update.flagged !== undefined && { flagged: update.flagged }),
                  ...(update.analysisNotes !== undefined && { analysisNotes: update.analysisNotes }),
                }
              : issue
          ) ?? []
      );

      queryClient.setQueryData<Issue>(
        ['issue', key],
        (old) =>
          old
            ? {
                ...old,
                ...(update.assigneeId !== undefined && { assigneeId: update.assigneeId }),
                ...(update.priorityName !== undefined && { priorityName: update.priorityName }),
                ...(update.dueDate !== undefined && { dueDate: update.dueDate }),
                ...(update.developmentDueDate !== undefined && { developmentDueDate: update.developmentDueDate }),
                ...(update.flagged !== undefined && { flagged: update.flagged }),
                ...(update.analysisNotes !== undefined && { analysisNotes: update.analysisNotes }),
              }
            : old
      );

      return { previousIssues, previousIssue, key };
    },

    onError: (_error, _vars, context) => {
      if (context?.previousIssues) {
        queryClient.setQueriesData({ queryKey: ['issues'] }, context.previousIssues);
      }
      if (context?.previousIssue && context?.key) {
        queryClient.setQueryData(['issue', context.key], context.previousIssue);
      }
    },

    onSuccess: (updatedIssue) => {
      queryClient.setQueryData(['issue', updatedIssue.jiraKey], updatedIssue);
      queryClient.setQueriesData<Issue[]>(
        { queryKey: ['issues'] },
        (old) => old?.map((issue) => (issue.jiraKey === updatedIssue.jiraKey ? { ...issue, ...updatedIssue } : issue)) ?? []
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['workload'] });
    },
  });
}
