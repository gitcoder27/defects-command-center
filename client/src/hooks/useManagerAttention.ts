import { useMemo } from 'react';
import { useOverview } from '@/hooks/useOverview';
import { useIssuesWithOptions } from '@/hooks/useIssues';
import { useTeamTracker } from '@/hooks/useTeamTracker';
import { useManagerDesk } from '@/hooks/useManagerDesk';
import { buildManagerAttentionSnapshot } from '@/lib/manager-attention';
import { getLocalIsoDate } from '@/lib/utils';

interface UseManagerAttentionOptions {
  enabled?: boolean;
  date?: string;
}

export function useManagerAttention(options: UseManagerAttentionOptions = {}) {
  const { enabled = true, date = getLocalIsoDate() } = options;
  const overview = useOverview({ enabled });
  const issues = useIssuesWithOptions('all', undefined, undefined, false, enabled, date);
  const team = useTeamTracker(date, undefined, enabled);
  const desk = useManagerDesk(date, enabled);

  const snapshot = useMemo(
    () =>
      buildManagerAttentionSnapshot({
        date,
        overview: overview.data,
        issues: issues.data,
        teamBoard: team.data,
        deskDay: desk.data,
      }),
    [date, desk.data, issues.data, overview.data, team.data],
  );

  return {
    data: snapshot,
    isLoading: overview.isLoading || issues.isLoading || team.isLoading || desk.isLoading,
    isFetching: overview.isFetching || issues.isFetching || team.isFetching || desk.isFetching,
    isError: overview.isError || issues.isError || team.isError || desk.isError,
    refetch: () => Promise.all([overview.refetch(), issues.refetch(), team.refetch(), desk.refetch()]),
  };
}
