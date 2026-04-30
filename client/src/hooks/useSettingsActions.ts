import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuthUser, Developer } from '@/types';

export interface JiraField {
  id: string;
  name: string;
  custom: boolean;
}

export interface DiscoveredUser {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
}

export interface DiscoverUsersResponse {
  users: DiscoveredUser[];
  startAt: number;
  maxResults: number;
  count: number;
  hasMore: boolean;
}

interface CreateAppUserPayload {
  username: string;
  password: string;
  displayName: string;
  role: AuthUser['role'];
  developerAccountId?: string;
}

interface DiscoverTeamMembersPayload {
  query: string;
  startAt: number;
  maxResults: number;
}

interface ManualDeveloperPayload {
  displayName: string;
  email: string;
  jiraAccountId?: string;
}

interface UpdateDeveloperPayload {
  accountId: string;
  displayName: string;
  email: string;
  jiraAccountId: string;
}

export function useAppUsers() {
  return useQuery({
    queryKey: ['auth-users'],
    queryFn: async () => {
      const res = await api.get<{ users: AuthUser[] }>('/auth/users');
      return res.users ?? [];
    },
  });
}

export function useCreateAppUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAppUserPayload) => api.post<{ user: AuthUser }>('/auth/register', payload),
    onSuccess: (res) => {
      queryClient.setQueryData<AuthUser[]>(['auth-users'], (previous = []) => [...previous, res.user]);
    },
  });
}

export function useDeleteAppUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (username: string) => api.delete<{ ok: true }>(`/auth/users/${encodeURIComponent(username)}`),
    onSuccess: (_res, username) => {
      queryClient.setQueryData<AuthUser[]>(['auth-users'], (previous = []) =>
        previous.filter((user) => user.username !== username)
      );
    },
  });
}

export function useDiscoverJiraFields() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get<{ fields: JiraField[] }>('/config/fields');
      return res.fields;
    },
  });
}

export function useSaveSettingsConfig() {
  return useMutation({
    mutationFn: (payload: {
      jiraSyncJql: string;
      jiraDevDueDateField: string;
      jiraAspenSeverityField: string;
      managerJiraAccountId: string;
    }) => api.put('/config/settings', payload),
  });
}

export function useResetSettingsConfig() {
  return useMutation({
    mutationFn: () => api.post('/config/reset'),
  });
}

export function useDiscoverTeamMembers() {
  return useMutation({
    mutationFn: (payload: DiscoverTeamMembersPayload) =>
      api.post<DiscoverUsersResponse>('/team/discover', payload),
  });
}

export function useAddTeamDevelopers() {
  return useMutation({
    mutationFn: (developers: DiscoveredUser[]) => api.post('/team/developers', { developers }),
  });
}

export function useAddManualDeveloper() {
  return useMutation({
    mutationFn: (payload: ManualDeveloperPayload) => api.post('/team/developers/manual', payload),
  });
}

export function useUpdateTeamDeveloper() {
  return useMutation({
    mutationFn: ({ accountId, ...payload }: UpdateDeveloperPayload) =>
      api.patch('/team/developers/' + encodeURIComponent(accountId), payload),
  });
}

export function useRemoveTeamDeveloper() {
  return useMutation({
    mutationFn: (accountId: Developer['accountId']) =>
      api.delete(`/team/developers/${encodeURIComponent(accountId)}`),
  });
}
