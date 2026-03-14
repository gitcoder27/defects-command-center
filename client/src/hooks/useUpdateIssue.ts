import type { QueryKey } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Developer, Issue, IssueUpdate } from '@/types';

function getOptimisticAssigneeName(
  assigneeId: string | undefined,
  developerQueries: Array<[QueryKey, Developer[] | undefined]>,
  fallbackName?: string
) {
  if (assigneeId === undefined) {
    return fallbackName;
  }

  if (!assigneeId) {
    return undefined;
  }

  for (const [, developers] of developerQueries) {
    const matchedDeveloper = developers?.find((developer) => developer.accountId === assigneeId);
    if (matchedDeveloper) {
      return matchedDeveloper.displayName;
    }
  }

  return fallbackName;
}

function applyIssueUpdate(
  issue: Issue,
  update: IssueUpdate,
  developerQueries: Array<[QueryKey, Developer[] | undefined]>
): Issue {
  const nextIssue: Issue = {
    ...issue,
    ...(update.assigneeId !== undefined && {
      assigneeId: update.assigneeId,
      assigneeName: getOptimisticAssigneeName(update.assigneeId, developerQueries, issue.assigneeName),
    }),
    ...(update.priorityName !== undefined && { priorityName: update.priorityName }),
    ...(update.dueDate !== undefined && { dueDate: update.dueDate }),
    ...(update.developmentDueDate !== undefined && { developmentDueDate: update.developmentDueDate }),
    ...(update.flagged !== undefined && { flagged: update.flagged }),
    ...(update.analysisNotes !== undefined && { analysisNotes: update.analysisNotes }),
  };

  return nextIssue;
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, update }: { key: string; update: IssueUpdate }) =>
      api.patch<Issue>(`/issues/${key}`, update),

    onMutate: async ({ key, update }) => {
      await queryClient.cancelQueries({ queryKey: ['issues'] });
      await queryClient.cancelQueries({ queryKey: ['issue', key] });
      const previousIssues = queryClient.getQueriesData<Issue[]>({ queryKey: ['issues'] });
      const previousIssue = queryClient.getQueryData<Issue>(['issue', key]);
      const developerQueries = queryClient.getQueriesData<Developer[]>({ queryKey: ['developers'] });

      queryClient.setQueriesData<Issue[]>(
        { queryKey: ['issues'] },
        (old) =>
          old?.map((issue) =>
            issue.jiraKey === key
              ? applyIssueUpdate(issue, update, developerQueries)
              : issue
          ) ?? []
      );

      queryClient.setQueryData<Issue>(
        ['issue', key],
        (old) => (old ? applyIssueUpdate(old, update, developerQueries) : old)
      );

      return { previousIssues, previousIssue, key };
    },

    onError: (_error, _vars, context) => {
      if (context?.previousIssues) {
        context.previousIssues.forEach(([queryKey, issues]) => {
          queryClient.setQueryData(queryKey, issues);
        });
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
