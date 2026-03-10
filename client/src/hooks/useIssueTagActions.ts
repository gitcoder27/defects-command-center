import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useToast } from '@/context/ToastContext';
import { findTagByName, normalizeTagName, pickRandomTagColor } from '@/lib/tag-utils';
import { useCreateTag, useSetIssueTags, useTags } from '@/hooks/useTags';
import type { LocalTag } from '@/types';

interface UseIssueTagActionsOptions {
  issueKey?: string;
  localTags: LocalTag[];
}

export function useIssueTagActions({ issueKey, localTags }: UseIssueTagActionsOptions) {
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();
  const setIssueTags = useSetIssueTags();
  const { addToast } = useToast();
  const currentTagIds = useMemo(() => localTags.map((tag) => tag.id), [localTags]);
  const currentTagIdsRef = useRef<number[]>(currentTagIds);

  useEffect(() => {
    currentTagIdsRef.current = currentTagIds;
  }, [currentTagIds]);

  const assignedTagIds = useMemo(() => new Set(currentTagIds), [currentTagIds]);

  const commitTagIds = useCallback(
    (tagIds: number[]) => {
      if (!issueKey) {
        return;
      }

      const nextTagIds = Array.from(new Set(tagIds));
      currentTagIdsRef.current = nextTagIds;

      setIssueTags.mutate(
        { key: issueKey, tagIds: nextTagIds },
        {
          onError: (err) => {
            addToast({
              type: 'error',
              title: `Failed to update tags for ${issueKey}`,
              message: err.message,
            });
          },
        }
      );
    },
    [issueKey, setIssueTags, addToast]
  );

  const toggleTag = useCallback(
    (tagId: number) => {
      const currentIds = currentTagIdsRef.current;
      const nextIds = currentIds.includes(tagId)
        ? currentIds.filter((id) => id !== tagId)
        : [...currentIds, tagId];
      commitTagIds(nextIds);
    },
    [commitTagIds]
  );

  const createOrAssignTag = useCallback(
    (rawName: string, callbacks?: { onSuccess?: () => void }) => {
      const normalizedName = normalizeTagName(rawName);
      if (!normalizedName) {
        return false;
      }

      const exactMatch = findTagByName(allTags, normalizedName);
      if (exactMatch) {
        if (!currentTagIdsRef.current.includes(exactMatch.id)) {
          commitTagIds([...currentTagIdsRef.current, exactMatch.id]);
        }
        callbacks?.onSuccess?.();
        return true;
      }

      if (!issueKey) {
        return false;
      }

      createTag.mutate(
        {
          name: normalizedName,
          color: pickRandomTagColor(),
        },
        {
          onSuccess: (createdTag) => {
            commitTagIds([...currentTagIdsRef.current, createdTag.id]);
            callbacks?.onSuccess?.();
          },
          onError: (err) => {
            addToast({
              type: 'error',
              title: `Failed to create tag for ${issueKey}`,
              message: err.message,
            });
          },
        }
      );

      return true;
    },
    [allTags, commitTagIds, issueKey, createTag, addToast]
  );

  return {
    allTags,
    assignedTagIds,
    isPending: createTag.isPending || setIssueTags.isPending,
    toggleTag,
    createOrAssignTag,
  };
}
