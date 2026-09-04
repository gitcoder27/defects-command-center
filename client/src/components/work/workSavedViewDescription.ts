import { FILTER_LABELS } from '@/lib/constants';
import type { WorkSavedView } from '@/types';

export function describeWorkSavedView(view: WorkSavedView, developerNames?: Map<string, string>): string | undefined {
  const parts: string[] = [];
  if (view.filter !== 'all') {
    parts.push(FILTER_LABELS[view.filter]);
  }
  if (view.developerAccountId) {
    parts.push(developerNames?.get(view.developerAccountId) ?? view.developerAccountId);
  }
  if (view.tagId !== null && view.tagId !== undefined) {
    parts.push('tagged');
  }
  if (view.noTagsFilter) {
    parts.push('untagged only');
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}
