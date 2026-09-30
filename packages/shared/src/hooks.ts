import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi, useApiContext } from './auth';
import type { EventInput, EventScope } from './types';

export const queryKeys = {
  me: ['me'] as const,
  providers: ['auth-providers'] as const,
  events: ['events'] as const,
  eventList: (scope: EventScope) => ['events', 'list', scope] as const,
  event: (id: string) => ['events', 'detail', id] as const,
  attendees: (id: string) => ['events', 'attendees', id] as const,
};

/** Current user, or undefined while logged out. `isAdmin` drives admin-only UI. */
export function useCurrentUser() {
  const { api, token, ready } = useApiContext();
  const query = useQuery({ queryKey: queryKeys.me, queryFn: api.me, enabled: !!token });
  return {
    ...query,
    user: token ? query.data : undefined,
    isAdmin: !!token && query.data?.role === 'ADMIN',
    isLoading: !ready || (!!token && query.isPending),
  };
}

export function useAuthProviders() {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.providers, queryFn: api.authProviders, staleTime: Infinity });
}

export function useDevLogin() {
  const { api, signIn } = useApiContext();
  return useMutation({
    mutationFn: ({ email, name }: { email: string; name: string }) => api.devLogin(email, name),
    onSuccess: ({ accessToken }) => signIn(accessToken),
  });
}

export function useEvents(scope: EventScope = 'upcoming') {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.eventList(scope), queryFn: () => api.listEvents(scope) });
}

export function useEvent(id: string) {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.event(id), queryFn: () => api.getEvent(id) });
}

export function useAttendees(id: string, enabled: boolean) {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.attendees(id), queryFn: () => api.attendees(id), enabled });
}

/** Any write can change counts, statuses and lists, so refresh everything event-related. */
function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.events });
}

export function useCreateEvent() {
  const api = useApi();
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: (input: EventInput) => api.createEvent(input), onSuccess: invalidate });
}

export function useUpdateEvent(id: string) {
  const api = useApi();
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (input: Partial<EventInput>) => api.updateEvent(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteEvent() {
  const api = useApi();
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: (id: string) => api.deleteEvent(id), onSuccess: invalidate });
}

export function useRegister(eventId: string) {
  const api = useApi();
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: () => api.register(eventId), onSettled: invalidate });
}

export function useCancelRegistration(eventId: string) {
  const api = useApi();
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: () => api.cancelRegistration(eventId), onSettled: invalidate });
}
