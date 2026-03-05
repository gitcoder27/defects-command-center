import { useCallback, useMemo } from 'react';
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

  const assignedTagIds = useMemo(() => new Set(localTags.map((tag) => tag.id)), [localTags]);

  const setTagIds = useCallback(
    (tagIds: number[]) => {
      if (!issueKey) {
        return;
      }

      setIssueTags.mutate(
        { key: issueKey, tagIds },
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
      const currentIds = localTags.map((tag) => tag.id);
      const nextIds = currentIds.includes(tagId)
        ? currentIds.filter((id) => id !== tagId)
        : [...currentIds, tagId];
      setTagIds(nextIds);
    },
    [localTags, setTagIds]
  );

  const createOrAssignTag = useCallback(
    (rawName: string, callbacks?: { onSuccess?: () => void }) => {
      const normalizedName = normalizeTagName(rawName);
      if (!normalizedName) {
        return false;
      }

      const exactMatch = findTagByName(allTags, normalizedName);
      if (exactMatch) {
        if (!assignedTagIds.has(exactMatch.id)) {
          toggleTag(exactMatch.id);
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
            const currentIds = localTags.map((tag) => tag.id);
            setTagIds([...currentIds, createdTag.id]);
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
    [allTags, assignedTagIds, toggleTag, issueKey, createTag, localTags, setTagIds, addToast]
  );

  return {
    allTags,
    assignedTagIds,
    isPending: createTag.isPending || setIssueTags.isPending,
    toggleTag,
    createOrAssignTag,
  };
}
