import { useQuery } from '@tanstack/react-query';
import { useAuthScopeKey } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { PrioritySuggestion, DueDateSuggestion, AssignmentSuggestion } from '@/types';

export function useSuggestions(issueKey?: string, priority?: string) {
  const authScopeKey = useAuthScopeKey();

  const prioritySuggestion = useQuery<PrioritySuggestion>({
    queryKey: ['suggestions', 'priority', issueKey, authScopeKey],
    queryFn: () => api.get(`/suggestions/priority/${issueKey}`),
    enabled: !!issueKey,
  });

  const dueDateSuggestion = useQuery<DueDateSuggestion>({
    queryKey: ['suggestions', 'duedate', priority ?? issueKey, authScopeKey],
    queryFn: () => api.get(`/suggestions/duedate/${priority ?? 'Medium'}`),
    enabled: !!issueKey,
  });

  const assigneeSuggestion = useQuery<AssignmentSuggestion[]>({
    queryKey: ['suggestions', 'assignee', issueKey, authScopeKey],
    queryFn: async () => {
      const res = await api.get<{ issueKey: string; suggestions: AssignmentSuggestion[] }>(`/suggestions/assignee/${issueKey}`);
      return res.suggestions;
    },
    enabled: !!issueKey,
  });

  return { prioritySuggestion, dueDateSuggestion, assigneeSuggestion };
}
