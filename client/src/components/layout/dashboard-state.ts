import type { FilterType } from '@/types';

export interface DashboardFilterState {
  activeFilter: FilterType;
  activeDeveloper?: string;
  selectedTagId?: number;
  noTagsFilter: boolean;
}

export const DEFAULT_DASHBOARD_FILTER_STATE: DashboardFilterState = {
  activeFilter: 'all',
  activeDeveloper: undefined,
  selectedTagId: undefined,
  noTagsFilter: false,
};