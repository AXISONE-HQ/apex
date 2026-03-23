"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapPracticePlan, mapPracticePlanBlock, mapPracticePlanDraftSummary } from "@/lib/mappers";
import {
  PracticePlansResponse,
  PracticePlanResponse,
  PracticePlanBlocksResponse,
  PracticePlanBlockResponse,
  PracticePlanDraftResponse,
} from "@/types/api";
import { PracticePlan, PracticePlanBlock, PracticePlanDraftSummary } from "@/types/domain";

export interface PracticePlanFilters {
  teamId?: string;
  status?: "draft" | "published";
  search?: string;
  limit?: number;
  refreshKey?: number;
}

export async function fetchPracticePlans(orgId: string, filters: PracticePlanFilters = {}): Promise<PracticePlan[]> {
  const params: Record<string, string> = {};
  if (filters.teamId) params.teamId = filters.teamId;
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (typeof filters.limit === "number") params.limit = String(filters.limit);

  const data = await apiClient<PracticePlansResponse>("/practice/plans", {
    searchParams: params,
    orgId,
  });
  return (data.items ?? []).map(mapPracticePlan);
}

export async function fetchPracticePlan(orgId: string, planId: string): Promise<PracticePlan> {
  const data = await apiClient<PracticePlanResponse>(`/practice/plans/${planId}`, { orgId });
  return mapPracticePlan(data.plan);
}

export async function fetchPracticePlanBlocks(orgId: string, planId: string): Promise<PracticePlanBlock[]> {
  const data = await apiClient<PracticePlanBlocksResponse>(`/practice/plans/${planId}/blocks`, { orgId });
  return (data.items ?? []).map(mapPracticePlanBlock);
}

export function usePracticePlans(orgId: string, filters: PracticePlanFilters = {}) {
  const keyFilters: Record<string, unknown> | undefined = Object.keys(filters).length ? { ...filters } : undefined;
  return useQuery({
    queryKey: queryKeys.practicePlans(orgId, keyFilters),
    queryFn: () => fetchPracticePlans(orgId, filters),
    enabled: Boolean(orgId),
  });
}

export function usePracticePlan(orgId: string, planId: string) {
  return useQuery({
    queryKey: queryKeys.practicePlan(orgId, planId),
    queryFn: () => fetchPracticePlan(orgId, planId),
    enabled: Boolean(orgId && planId),
  });
}

export function usePracticePlanBlocks(orgId: string, planId: string) {
  return useQuery({
    queryKey: queryKeys.practicePlanBlocks(orgId, planId),
    queryFn: () => fetchPracticePlanBlocks(orgId, planId),
    enabled: Boolean(orgId && planId),
  });
}

export interface PracticePlanDraftPayload {
  teamId: string;
  practiceDate?: string;
  startTime?: string;
  durationMinutes: number;
  focusArea?: string;
  emphasis?: string;
  intensity?: string;
  playerGroup?: string;
  environment?: string;
  notes?: string;
}

export interface PracticePlanDraftResult {
  plan: PracticePlan;
  blocks: PracticePlanBlock[];
  summary: PracticePlanDraftSummary | null;
}

export async function generatePracticePlanDraft(orgId: string, payload: PracticePlanDraftPayload): Promise<PracticePlanDraftResult> {
  const data = await apiClient<PracticePlanDraftResponse>("/practice/plans/draft", {
    method: "POST",
    body: payload,
    orgId,
  });

  return {
    plan: mapPracticePlan(data.plan),
    blocks: data.blocks.map(mapPracticePlanBlock),
    summary: mapPracticePlanDraftSummary(data.summary),
  };
}

export function useGeneratePracticePlanDraft(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PracticePlanDraftPayload) => generatePracticePlanDraft(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [key] = Array.isArray(query.queryKey) ? query.queryKey : [];
          return key === "practice-plans";
        },
      });
    },
  });
}


export interface CreatePracticePlanPayload {
  title: string;
  teamId?: string | null;
  practiceDate?: string | null;
  durationMinutes?: number | null;
  focusAreas?: string[];
  notes?: string | null;
  status?: "draft" | "published";
}

export interface CreatePracticePlanBlockPayload {
  name: string;
  description?: string | null;
  focusAreas?: string[];
  durationMinutes?: number | null;
  startOffsetMinutes?: number | null;
  playerGrouping?: string | null;
  position?: number;
}

export async function createPracticePlan(orgId: string, payload: CreatePracticePlanPayload): Promise<PracticePlan> {
  const data = await apiClient<PracticePlanResponse>("/practice/plans", {
    method: "POST",
    body: payload,
    orgId,
  });
  return mapPracticePlan(data.plan);
}

export async function createPracticePlanBlock(
  orgId: string,
  planId: string,
  payload: CreatePracticePlanBlockPayload
): Promise<PracticePlanBlock> {
  const data = await apiClient<PracticePlanBlockResponse>(`/practice/plans/${planId}/blocks`, {
    method: "POST",
    body: payload,
    orgId,
  });
  return mapPracticePlanBlock(data.block);
}
