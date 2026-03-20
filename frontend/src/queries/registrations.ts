"use client";

import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapRegistration } from "@/lib/mappers";
import { RegistrationResponse, RegistrationsResponse } from "@/types/api";
import { Registration, RegistrationStatus } from "@/types/domain";

const DEFAULT_LIMIT = 50;

export interface RegistrationPaging {
  limit: number;
  offset: number;
}

export interface RegistrationListFilters {
  seasonId: string;
  status?: RegistrationStatus;
  limit?: number;
  offset?: number;
}

export interface MyRegistrationFilters {
  limit?: number;
  offset?: number;
}

export interface RegistrationListResult {
  registrations: Registration[];
  paging: RegistrationPaging;
}

export async function fetchRegistrations(orgId: string, filters: RegistrationListFilters): Promise<RegistrationListResult> {
  if (!orgId || !filters.seasonId) {
    return emptyList(filters);
  }

  const params = {
    seasonId: filters.seasonId,
    status: filters.status,
    limit: filters.limit ?? DEFAULT_LIMIT,
    offset: filters.offset ?? 0,
  } as const;

  const data = await apiClient<RegistrationsResponse>("/registrations", {
    searchParams: params,
  });

  return {
    registrations: data.items.map(mapRegistration),
    paging: normalizePaging(data.paging, params),
  };
}

export async function fetchMyRegistrations(orgId: string, filters: MyRegistrationFilters = {}): Promise<RegistrationListResult> {
  if (!orgId) {
    return emptyList(filters);
  }

  const params = {
    limit: filters.limit ?? DEFAULT_LIMIT,
    offset: filters.offset ?? 0,
  } as const;

  const data = await apiClient<RegistrationsResponse>("/registrations/mine", {
    searchParams: params,
  });

  return {
    registrations: data.items.map(mapRegistration),
    paging: normalizePaging(data.paging, params),
  };
}

export async function fetchRegistration(orgId: string, registrationId: string): Promise<Registration | null> {
  if (!orgId || !registrationId) return null;
  const data = await apiClient<RegistrationResponse>(`/registrations/${registrationId}`);
  return mapRegistration(data.registration);
}

export function useRegistrations(orgId: string, filters: RegistrationListFilters) {
  const normalized = {
    seasonId: filters.seasonId,
    status: filters.status ?? undefined,
    limit: filters.limit ?? DEFAULT_LIMIT,
    offset: filters.offset ?? 0,
  } as const;

  const queryResult = useQuery({
    queryKey: queryKeys.registrations(orgId, normalized),
    queryFn: () => fetchRegistrations(orgId, normalized),
    enabled: Boolean(orgId && normalized.seasonId),
  });

  const fallback = defaultPaging(normalized);
  return {
    registrations: queryResult.data?.registrations ?? [],
    paging: queryResult.data?.paging ?? fallback,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error ?? null,
    refetch: queryResult.refetch,
  };
}

export function useMyRegistrations(orgId: string, filters: MyRegistrationFilters = {}) {
  const normalized = {
    limit: filters.limit ?? DEFAULT_LIMIT,
    offset: filters.offset ?? 0,
  } as const;

  const queryResult = useQuery({
    queryKey: queryKeys.myRegistrations(orgId, normalized),
    queryFn: () => fetchMyRegistrations(orgId, normalized),
    enabled: Boolean(orgId),
  });

  const fallback = defaultPaging(normalized);
  return {
    registrations: queryResult.data?.registrations ?? [],
    paging: queryResult.data?.paging ?? fallback,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error ?? null,
    refetch: queryResult.refetch,
  };
}

export function useRegistration(orgId: string, registrationId: string) {
  const queryResult = useQuery({
    queryKey: queryKeys.registration(orgId, registrationId),
    queryFn: () => fetchRegistration(orgId, registrationId),
    enabled: Boolean(orgId && registrationId),
  });

  return {
    registration: queryResult.data ?? null,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error ?? null,
    refetch: queryResult.refetch,
  };
}

export interface CreateRegistrationPayload {
  seasonId: string;
  playerId: string;
}

export function useCreateRegistration(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRegistrationPayload) => {
      const response = await apiClient<RegistrationResponse>("/registrations", {
        method: "POST",
        body: payload,
      });
      return mapRegistration(response.registration);
    },
    onSuccess: (registration) => {
      primeRegistrationDetail(queryClient, orgId, registration);
      invalidateRegistrationCaches(queryClient, orgId);
    },
  });
}

export interface UpdateRegistrationStatusPayload {
  registrationId: string;
  status: RegistrationStatus;
  notes?: string | null;
  waitlistPosition?: number | null;
}

export function useRegistrationStatusMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ registrationId, status, notes, waitlistPosition }: UpdateRegistrationStatusPayload) => {
      const body: Record<string, string | number | null> = { status };
      if (notes !== undefined) {
        body.notes = notes ?? null;
      }
      if (waitlistPosition !== undefined) {
        body.waitlistPosition = waitlistPosition ?? null;
      }
      const response = await apiClient<RegistrationResponse>(`/registrations/${registrationId}/status`, {
        method: "PATCH",
        body,
      });
      return mapRegistration(response.registration);
    },
    onSuccess: (registration) => {
      primeRegistrationDetail(queryClient, orgId, registration);
      invalidateRegistrationCaches(queryClient, orgId);
    },
  });
}

export interface WithdrawRegistrationPayload {
  registrationId: string;
}

export function useWithdrawRegistration(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ registrationId }: WithdrawRegistrationPayload) => {
      const response = await apiClient<RegistrationResponse>(`/registrations/${registrationId}`, {
        method: "DELETE",
      });
      return mapRegistration(response.registration);
    },
    onSuccess: (registration) => {
      primeRegistrationDetail(queryClient, orgId, registration);
      invalidateRegistrationCaches(queryClient, orgId);
    },
  });
}

export interface PromoteWaitlistPayload {
  seasonId: string;
}

export function usePromoteRegistrationWaitlist(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ seasonId }: PromoteWaitlistPayload) => {
      const response = await apiClient<RegistrationResponse>(`/registrations/${seasonId}/waitlist/promote`, {
        method: "POST",
      });
      return mapRegistration(response.registration);
    },
    onSuccess: (registration) => {
      primeRegistrationDetail(queryClient, orgId, registration);
      invalidateRegistrationCaches(queryClient, orgId);
    },
  });
}

function normalizePaging(paging?: RegistrationsResponse["paging"], fallback?: { limit?: number; offset?: number }) {
  return {
    limit: Number(paging?.limit ?? fallback?.limit ?? DEFAULT_LIMIT),
    offset: Number(paging?.offset ?? fallback?.offset ?? 0),
  } satisfies RegistrationPaging;
}

function defaultPaging(fallback?: { limit?: number; offset?: number }): RegistrationPaging {
  return {
    limit: fallback?.limit ?? DEFAULT_LIMIT,
    offset: fallback?.offset ?? 0,
  };
}

function emptyList(fallback?: { limit?: number; offset?: number }): RegistrationListResult {
  return {
    registrations: [],
    paging: defaultPaging(fallback),
  };
}

function primeRegistrationDetail(queryClient: QueryClient, orgId: string, registration: Registration) {
  queryClient.setQueryData(queryKeys.registration(orgId, registration.id), registration);
}

function invalidateRegistrationCaches(queryClient: QueryClient, orgId: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      if (!Array.isArray(key)) return false;
      if (key[1] !== orgId) return false;
      return key[0] === "registrations" || key[0] === "registration" || key[0] === "registrations-mine";
    },
  });
}
