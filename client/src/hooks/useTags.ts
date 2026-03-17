import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Issue, LocalTag, TagDeleteResponse, TagUsageResponse } from '@/types';

interface TagsResponse {
  tags: LocalTag[];
}

function dedupeTagIds(tagIds: number[]): number[] {
  return Array.from(new Set(tagIds));
}

function resolveLocalTags(tagIds: number[], availableTags: LocalTag[], fallbackTags: LocalTag[] = []): LocalTag[] {
  const tagById = new Map<number, LocalTag>();

  for (const tag of fallbackTags) {
    tagById.set(tag.id, tag);
  }
  for (const tag of availableTags) {
    tagById.set(tag.id, tag);
  }

  return dedupeTagIds(tagIds)
    .map((tagId) => tagById.get(tagId))
    .filter((tag): tag is LocalTag => tag !== undefined);
}

function parseIssueQueryKey(queryKey: QueryKey): { tagId?: number; noTags: boolean } {
  const [, , , rawTagId, rawNoTags] = queryKey as [unknown, unknown, unknown, unknown, unknown];

  return {
    tagId: typeof rawTagId === 'number' ? rawTagId : undefined,
    noTags: rawNoTags === true,
  };
}

function matchesIssueTagFilters(issue: Issue, queryKey: QueryKey): boolean {
  const { tagId, noTags } = parseIssueQueryKey(queryKey);

  if (noTags) {
    return issue.localTags.length === 0;
  }
  if (tagId !== undefined) {
    return issue.localTags.some((tag) => tag.id === tagId);
  }

  return true;
}

function updateIssueTagsInList(
  issues: Issue[] | undefined,
  issueKey: string,
  nextTags: LocalTag[],
  queryKey: QueryKey
): Issue[] | undefined {
  if (!issues) {
    return issues;
  }

  return issues
    .map((issue) => (issue.jiraKey === issueKey ? { ...issue, localTags: nextTags } : issue))
    .filter((issue) => matchesIssueTagFilters(issue, queryKey));
}

function appendTag(tags: LocalTag[] | undefined, createdTag: LocalTag): LocalTag[] {
  if (!tags) {
    return [createdTag];
  }
  if (tags.some((tag) => tag.id === createdTag.id)) {
    return tags;
  }
  return [...tags, createdTag];
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
    onSuccess: (createdTag) => {
      queryClient.setQueryData<LocalTag[]>(['tags'], (old) => appendTag(old, createdTag));
    },
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
    onMutate: async ({ key, tagIds }) => {
      await queryClient.cancelQueries({ queryKey: ['issues'] });
      await queryClient.cancelQueries({ queryKey: ['issue', key] });

      const previousIssues = queryClient.getQueriesData<Issue[]>({ queryKey: ['issues'] });
      const previousIssue = queryClient.getQueriesData<Issue>({ queryKey: ['issue', key] });
      const cachedIssue =
        previousIssue[0]?.[1] ??
        previousIssues
          .flatMap(([, issues]) => issues ?? [])
          .find((issue) => issue.jiraKey === key);
      const availableTags = queryClient.getQueryData<LocalTag[]>(['tags']) ?? [];
      const optimisticTags = resolveLocalTags(tagIds, availableTags, cachedIssue?.localTags);

      for (const [queryKey, issues] of previousIssues) {
        queryClient.setQueryData<Issue[] | undefined>(
          queryKey,
          updateIssueTagsInList(issues, key, optimisticTags, queryKey)
        );
      }

      queryClient.setQueriesData<Issue>(
        { queryKey: ['issue', key] },
        (old) => (old ? { ...old, localTags: optimisticTags } : old)
      );

      return { previousIssues, previousIssue };
    },
    onError: (_error, { key }, context) => {
      if (context?.previousIssues) {
        for (const [queryKey, issues] of context.previousIssues) {
          queryClient.setQueryData(queryKey, issues);
        }
      }
      if (context?.previousIssue) {
        for (const [queryKey, issue] of context.previousIssue) {
          queryClient.setQueryData(queryKey, issue);
        }
      }
    },
    onSuccess: ({ tags }, { key }) => {
      const resolvedTags = resolveLocalTags(tags.map((tag) => tag.id), tags);

      queryClient.setQueriesData<Issue>(
        { queryKey: ['issue', key] },
        (old) => (old ? { ...old, localTags: resolvedTags } : old)
      );

      const previousIssues = queryClient.getQueriesData<Issue[]>({ queryKey: ['issues'] });
      for (const [queryKey, issues] of previousIssues) {
        queryClient.setQueryData<Issue[] | undefined>(
          queryKey,
          updateIssueTagsInList(issues, key, resolvedTags, queryKey)
        );
      }
    },
    onSettled: (_data, _error, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', key] });
      queryClient.invalidateQueries({ queryKey: ['tagCounts'] });
    },
  });
}
