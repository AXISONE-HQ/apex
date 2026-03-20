"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import {
  EvaluationBlock,
  EvaluationPlan,
  EvaluationPlanBlock,
  EvaluationPlanStrength,
  EvaluationSession,
  EvaluationSessionSummary,
  EvaluationPlayerSummary,
  EvaluationDifficulty,
  EvaluationScoringMethod,
  PlayerEvaluation,
  PlayerEvaluationStatus,
} from "@/types/domain";
import {
  EvaluationBlocksResponse,
  EvaluationPlansResponse,
  EvaluationPlanResponse,
  EvaluationPlanBlocksResponse,
  EvaluationPlanBlockResponse,
  EvaluationSessionsResponse,
  EvaluationAIGenerateResponse,
  ApiEvaluationBlockSuggestion,
  EvaluationSessionResponse,
  EvaluationSessionSummaryResponse,
  EvaluationPlayerSummaryResponse,
  EvaluationBlockResponse,
  SessionScoresResponse,
  ApiSessionScore,
  ApiEvaluationPlanStrengthResponse,
  PlayerEvaluationsResponse,
  PlayerEvaluationResponse,
} from "@/types/api";
import {
  mapEvaluationBlock,
  mapEvaluationPlan,
  mapEvaluationPlanBlock,
  mapEvaluationSession,
  mapEvaluationSessionSummary,
  mapEvaluationPlayerSummary,
  mapEvaluationPlanStrength,
  mapSessionScore,
  mapPlayerEvaluation,
} from "@/lib/mappers";

export interface EvaluationBlockFilters {
  sport?: string;
  difficulty?: string;
  category?: string;
  creator?: string;
  search?: string;
  teamId?: string;
}

export interface EvaluationPlanFilters {
  sport?: string;
  evaluationCategory?: string;
  scope?: "club" | "team";
  teamId?: string | null;
}

export async function fetchEvaluationBlocks(orgId: string, filters?: EvaluationBlockFilters): Promise<EvaluationBlock[]> {
  const searchParams = filters
    ? {
        sport: filters.sport,
        difficulty: filters.difficulty,
        category: filters.category,
        creator: filters.creator,
        search: filters.search,
        team_id: filters.teamId,
      }
    : undefined;
  const data = await apiClient<EvaluationBlocksResponse>(`/admin/clubs/${orgId}/evaluation-blocks`, {
    searchParams,
  });
  return data.items.map(mapEvaluationBlock);
}

export function useEvaluationBlocks(orgId: string, filters?: EvaluationBlockFilters) {
  return useQuery({
    queryKey: queryKeys.evaluationBlocks(orgId, filters),
    queryFn: () => fetchEvaluationBlocks(orgId, filters),
    enabled: Boolean(orgId),
  });
}

export interface PopularEvaluationBlockFilters {
  sport?: string;
  limit?: number;
}

export async function fetchPopularEvaluationBlocks(orgId: string, filters?: PopularEvaluationBlockFilters): Promise<EvaluationBlock[]> {
  const searchParams = filters
    ? {
        sport: filters.sport,
        limit: filters.limit ? String(filters.limit) : undefined,
      }
    : undefined;
  const data = await apiClient<EvaluationBlocksResponse>(`/admin/clubs/${orgId}/evaluation-blocks/popular`, {
    searchParams,
  });
  return data.items.map(mapEvaluationBlock);
}

export function usePopularEvaluationBlocks(orgId: string, filters?: PopularEvaluationBlockFilters) {
  return useQuery({
    queryKey: queryKeys.popularEvaluationBlocks(orgId, filters),
    queryFn: () => fetchPopularEvaluationBlocks(orgId, filters),
    enabled: Boolean(orgId),
  });
}

export async function fetchEvaluationPlans(orgId: string, filters?: EvaluationPlanFilters): Promise<EvaluationPlan[]> {
  const data = await apiClient<EvaluationPlansResponse>(`/admin/clubs/${orgId}/evaluation-plans`, {
    searchParams: {
      sport: filters?.sport,
      evaluation_category: filters?.evaluationCategory,
      scope: filters?.scope,
      team_id: filters?.teamId ?? undefined,
    },
  });
  return data.items.map(mapEvaluationPlan);
}

export function useEvaluationPlans(orgId: string, filters?: EvaluationPlanFilters) {
  return useQuery({
    queryKey: queryKeys.evaluationPlans(orgId, filters),
    queryFn: () => fetchEvaluationPlans(orgId, filters),
    enabled: Boolean(orgId),
  });
}

export async function fetchEvaluationPlan(orgId: string, planId: string): Promise<EvaluationPlan> {
  const data = await apiClient<EvaluationPlanResponse>(`/admin/clubs/${orgId}/evaluation-plans/${planId}`);
  const plan = data?.item;
  if (!plan) {
    throw new ApiError({ message: "evaluation_plan_not_found", status: 404 });
  }
  return mapEvaluationPlan(plan);
}

export function useEvaluationPlan(orgId: string, planId: string) {
  return useQuery({
    queryKey: queryKeys.evaluationPlan(orgId, planId),
    queryFn: () => fetchEvaluationPlan(orgId, planId),
    enabled: Boolean(orgId && planId),
  });
}

export async function fetchEvaluationPlanBlocks(orgId: string, planId: string): Promise<EvaluationPlanBlock[]> {
  const data = await apiClient<EvaluationPlanBlocksResponse>(`/admin/clubs/${orgId}/evaluation-plans/${planId}/blocks`);
  return data.items.map(mapEvaluationPlanBlock);
}

export function useEvaluationPlanBlocks(orgId: string, planId: string) {
  return useQuery({
    queryKey: queryKeys.evaluationPlanBlocks(orgId, planId),
    queryFn: () => fetchEvaluationPlanBlocks(orgId, planId),
    enabled: Boolean(orgId && planId),
  });
}

export async function fetchEvaluationSessions(orgId: string): Promise<EvaluationSession[]> {
  const data = await apiClient<EvaluationSessionsResponse>(`/admin/clubs/${orgId}/evaluation-sessions`);
  return data.items.map(mapEvaluationSession);
}

export function useEvaluationSessions(orgId: string) {
  return useQuery({
    queryKey: queryKeys.evaluationSessions(orgId),
    queryFn: () => fetchEvaluationSessions(orgId),
    enabled: Boolean(orgId),
  });
}

export async function fetchEvaluationSession(orgId: string, sessionId: string): Promise<EvaluationSession> {
  const data = await apiClient<EvaluationSessionResponse>(`/admin/clubs/${orgId}/evaluation-sessions/${sessionId}`);
  const session = data?.item;
  if (!session) {
    throw new ApiError({ message: "evaluation_session_not_found", status: 404 });
  }
  return mapEvaluationSession(session);
}

export function useEvaluationSession(orgId: string, sessionId: string) {
  return useQuery({
    queryKey: queryKeys.evaluationSession(orgId, sessionId),
    queryFn: () => fetchEvaluationSession(orgId, sessionId),
    enabled: Boolean(orgId && sessionId),
  });
}

export async function fetchEvaluationSessionSummary(orgId: string, sessionId: string): Promise<EvaluationSessionSummary> {
  const data = await apiClient<EvaluationSessionSummaryResponse>(
    `/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/summary`
  );
  const summary = data?.item;
  if (!summary) {
    throw new ApiError({ message: "evaluation_session_summary_not_found", status: 404 });
  }
  return mapEvaluationSessionSummary(summary);
}

export function useEvaluationSessionSummary(orgId: string, sessionId: string) {
  return useQuery({
    queryKey: queryKeys.evaluationSessionSummary(orgId, sessionId),
    queryFn: () => fetchEvaluationSessionSummary(orgId, sessionId),
    enabled: Boolean(orgId && sessionId),
  });
}

export async function fetchEvaluationPlayerSummary(orgId: string, sessionId: string, playerId: string): Promise<EvaluationPlayerSummary> {
  const data = await apiClient<EvaluationPlayerSummaryResponse>(
    `/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/players/${playerId}/summary`
  );
  const summary = data?.item;
  if (!summary) {
    throw new ApiError({ message: "evaluation_player_summary_not_found", status: 404 });
  }
  return mapEvaluationPlayerSummary(summary);
}

export function useEvaluationPlayerSummary(orgId: string, sessionId: string, playerId: string) {
  return useQuery({
    queryKey: queryKeys.evaluationPlayerSummary(orgId, sessionId, playerId),
    queryFn: () => fetchEvaluationPlayerSummary(orgId, sessionId, playerId),
    enabled: Boolean(orgId && sessionId && playerId),
  });
}

export interface EvaluationBlockInput {
  name: string;
  sport: string;
  evaluationType: string;
  instructions: string;
  objective?: string | null;
  difficulty?: EvaluationDifficulty | null;
  scoringMethod: EvaluationScoringMethod;
  scoringConfig: Record<string, unknown>;
  categories: string[];
  teamId?: string | null;
}

export interface UpdateEvaluationBlockInput {
  blockId: string;
  values: EvaluationBlockInput;
}

export function useCreateEvaluationBlock(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: EvaluationBlockInput) => {
      const response = await apiClient<EvaluationBlockResponse>(`/admin/clubs/${orgId}/evaluation-blocks`, {
        method: "POST",
        body: buildEvaluationBlockRequest(input),
      });
      return response.item ? mapEvaluationBlock(response.item) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-blocks"] });
    },
  });
}

export function useUpdateEvaluationBlock(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ blockId, values }: UpdateEvaluationBlockInput) => {
      const response = await apiClient<EvaluationBlockResponse>(
        `/admin/clubs/${orgId}/evaluation-blocks/${blockId}`,
        {
          method: "PATCH",
          body: buildEvaluationBlockRequest(values),
        }
      );
      return response.item ? mapEvaluationBlock(response.item) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-blocks"] });
    },
  });
}

function buildEvaluationBlockRequest(input: EvaluationBlockInput) {
  const payload: Record<string, unknown> = {
    name: input.name,
    sport: input.sport,
    evaluation_type: input.evaluationType,
    instructions: input.instructions,
    scoring_method: input.scoringMethod,
    scoring_config: input.scoringConfig,
    categories: input.categories ?? [],
  };

  if (input.objective !== undefined) {
    payload.objective = input.objective;
  }
  if (input.difficulty !== undefined) {
    payload.difficulty = input.difficulty;
  }
  if (input.teamId !== undefined) {
    payload.team_id = input.teamId;
  }

  return payload;
}

export interface CreateEvaluationPlanInput {
  name: string;
  sport: string;
  ageGroup?: string | null;
  gender?: string | null;
  evaluationCategory: string;
  scope: "club" | "team";
  teamId?: string | null;
}

export function useCreateEvaluationPlan(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEvaluationPlanInput) => {
      const payload: Record<string, unknown> = {
        name: input.name,
        sport: input.sport,
        evaluation_category: input.evaluationCategory,
        scope: input.scope,
      };
      if (input.ageGroup !== undefined) payload.age_group = input.ageGroup;
      if (input.gender !== undefined) payload.gender = input.gender;
      if (input.teamId !== undefined) payload.team_id = input.teamId;

      const response = await apiClient<EvaluationPlanResponse>(`/admin/clubs/${orgId}/evaluation-plans`, {
        method: "POST",
        body: payload,
      });
      return response.item ? mapEvaluationPlan(response.item) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-plans"] });
    },
  });
}

export interface UpdateEvaluationPlanInput {
  planId: string;
  values: Partial<CreateEvaluationPlanInput>;
}

export function useUpdateEvaluationPlan(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, values }: UpdateEvaluationPlanInput) => {
      const payload: Record<string, unknown> = {};
      if (values.name !== undefined) payload.name = values.name;
      if (values.sport !== undefined) payload.sport = values.sport;
      if (values.ageGroup !== undefined) payload.age_group = values.ageGroup ? values.ageGroup : null;
      if (values.gender !== undefined) payload.gender = values.gender ? values.gender : null;
      if (values.evaluationCategory !== undefined) payload.evaluation_category = values.evaluationCategory;
      if (values.scope !== undefined) payload.scope = values.scope;
      if (values.teamId !== undefined) payload.team_id = values.teamId ? values.teamId : null;

      if (!Object.keys(payload).length) {
        throw new Error("plan_update_requires_fields");
      }

      const response = await apiClient<EvaluationPlanResponse>(`/admin/clubs/${orgId}/evaluation-plans/${planId}`, {
        method: "PATCH",
        body: payload,
      });
      return response.item ? mapEvaluationPlan(response.item) : null;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluationPlan(orgId, variables.planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluationPlans(orgId) });
    },
  });
}

export function useAddPlanBlock(orgId: string, planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blockId: string) => {
      const response = await apiClient<EvaluationPlanBlockResponse>(
        `/admin/clubs/${orgId}/evaluation-plans/${planId}/blocks`,
        {
          method: "POST",
          body: { block_id: blockId },
        }
      );
      return response.item ? mapEvaluationPlanBlock(response.item) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluationPlanBlocks(orgId, planId) });
    },
  });
}

export function useRemovePlanBlock(orgId: string, planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planBlockId: string) => {
      await apiClient<void>(`/admin/clubs/${orgId}/evaluation-plans/${planId}/blocks/${planBlockId}`, {
        method: "DELETE",
      });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluationPlanBlocks(orgId, planId) });
    },
  });
}

export function useDuplicatePlanBlock(orgId: string, planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planBlockId: string) => {
      const response = await apiClient<EvaluationPlanBlockResponse>(
        `/admin/clubs/${orgId}/evaluation-plans/${planId}/blocks/${planBlockId}/duplicate`,
        { method: "POST" }
      );
      return response.item ? mapEvaluationPlanBlock(response.item) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluationPlanBlocks(orgId, planId) });
    },
  });
}

export function useReorderPlanBlocks(orgId: string, planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await apiClient<EvaluationPlanBlocksResponse>(
        `/admin/clubs/${orgId}/evaluation-plans/${planId}/reorder`,
        {
          method: "PATCH",
          body: { ordered_block_ids: orderedIds },
        }
      );
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluationPlanBlocks(orgId, planId) });
    },
  });
}

export interface GenerateEvaluationSuggestionsInput {
  sport: string;
  evaluationCategory: string;
  complexity: "easy" | "medium" | "hard";
  ageGroup?: string;
  gender?: string;
  teamLevel?: string;
}

export type AISuggestion = ApiEvaluationBlockSuggestion;

export interface PlanStrengthBlockInput {
  blockId?: string;
  categories?: string[];
  difficulty?: EvaluationDifficulty | null;
}

export interface EvaluatePlanStrengthInput {
  planId?: string;
  blocks?: PlanStrengthBlockInput[];
}

export function useGenerateEvaluationSuggestions(orgId: string) {
  return useMutation({
    mutationFn: async (input: GenerateEvaluationSuggestionsInput) => {
      const payload: Record<string, unknown> = {
        sport: input.sport,
        evaluation_category: input.evaluationCategory,
        complexity: input.complexity,
      };
      if (input.ageGroup) payload.age_group = input.ageGroup;
      if (input.gender) payload.gender = input.gender;
      if (input.teamLevel) payload.team_level = input.teamLevel;

      const response = await apiClient<EvaluationAIGenerateResponse>(
        `/admin/clubs/${orgId}/evaluation-ai/generate`,
        {
          method: "POST",
          body: payload,
        }
      );
      return response.suggestions;
    },
  });
}

export function useEvaluatePlanStrength(orgId: string) {
  return useMutation<EvaluationPlanStrength, Error, EvaluatePlanStrengthInput>({
    mutationFn: async (input: EvaluatePlanStrengthInput) => {
      const payload: Record<string, unknown> = {};
      if (input.planId) payload.plan_id = input.planId;
      if (Array.isArray(input.blocks)) {
        payload.blocks = input.blocks.map((block) => ({
          block_id: block.blockId,
          categories: block.categories,
          difficulty: block.difficulty,
        }));
      }
      const response = await apiClient<ApiEvaluationPlanStrengthResponse>(
        `/admin/clubs/${orgId}/evaluation-plan-strength`,
        {
          method: "POST",
          body: payload,
        }
      );
      return mapEvaluationPlanStrength(response);
    },
  });
}

export interface StartEvaluationSessionInput {
  eventId: string;
  evaluationPlanId: string;
}

export function useStartEvaluationSession(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StartEvaluationSessionInput) => {
      const response = await apiClient<EvaluationSessionResponse>(`/admin/clubs/${orgId}/evaluation-sessions/start`, {
        method: "POST",
        body: {
          event_id: input.eventId,
          evaluation_plan_id: input.evaluationPlanId,
        },
      });
      return response.item ? mapEvaluationSession(response.item) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluationSessions(orgId) });
    },
  });
}

export function useCompleteEvaluationSession(orgId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient<EvaluationSessionResponse>(
        `/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/complete`,
        { method: "PATCH" }
      );
      return response.item ? mapEvaluationSession(response.item) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluationSession(orgId, sessionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluationSessionSummary(orgId, sessionId) });
    },
  });
}

export function useSessionScores(orgId: string, sessionId: string) {
  return useQuery({
    queryKey: ["session-scores", orgId, sessionId],
    queryFn: async () => {
      const response = await apiClient<SessionScoresResponse>(
        `/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/scores`
      );
      return response.items.map(mapSessionScore);
    },
    enabled: Boolean(orgId && sessionId),
  });
}

export interface SubmitPlayerScoreInput {
  playerId: string;
  blockId: string;
  score: Record<string, unknown>;
  notes?: string | null;
}

export function useSubmitPlayerScore(orgId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitPlayerScoreInput) => {
      const response = await apiClient<{ item: ApiSessionScore }>(
        `/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/scores`,
        {
          method: "POST",
          body: {
            player_id: input.playerId,
            block_id: input.blockId,
            score: input.score,
            notes: input.notes,
          },
        }
      );
      return response.item ? mapSessionScore(response.item) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-scores", orgId, sessionId] });
    },
  });
}

export function useUpdatePlayerScore(orgId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ scoreId, score, notes }: { scoreId: string; score: Record<string, unknown>; notes?: string | null }) => {
      const response = await apiClient<{ item: ApiSessionScore }>(
        `/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/scores/${scoreId}`,
        {
          method: "PATCH",
          body: { score, notes },
        }
      );
      return response.item ? mapSessionScore(response.item) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-scores", orgId, sessionId] });
    },
  });
}

export async function fetchPlayerEvaluations(orgId: string, playerId: string): Promise<PlayerEvaluation[]> {
  const response = await apiClient<PlayerEvaluationsResponse>(
    `/admin/clubs/${orgId}/players/${playerId}/evaluations`
  );
  const items = Array.isArray(response.evaluations) ? response.evaluations : [];
  return items.map(mapPlayerEvaluation);
}

export function usePlayerEvaluations(orgId: string, playerId: string) {
  return useQuery({
    queryKey: queryKeys.playerEvaluations(orgId, playerId),
    queryFn: () => fetchPlayerEvaluations(orgId, playerId),
    enabled: Boolean(orgId && playerId),
  });
}

export interface PlayerEvaluationInput {
  title: string;
  summary?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  rating?: number | null;
  status?: PlayerEvaluationStatus;
  eventId?: string | null;
}

function buildPlayerEvaluationPayload(
  input: Partial<PlayerEvaluationInput>,
  { partial = false }: { partial?: boolean } = {}
) {
  const payload: Record<string, unknown> = {};

  if (!partial || input.title !== undefined) {
    if (input.title === undefined || !input.title.trim()) {
      throw new Error("title_required");
    }
    payload.title = input.title;
  }

  if (input.summary !== undefined) {
    payload.summary = input.summary ?? null;
  }
  if (input.strengths !== undefined) {
    payload.strengths = input.strengths ?? null;
  }
  if (input.improvements !== undefined) {
    payload.improvements = input.improvements ?? null;
  }
  if (input.rating !== undefined) {
    payload.rating = input.rating ?? null;
  }
  if (input.status !== undefined) {
    payload.status = input.status;
  }
  if (input.eventId !== undefined) {
    payload.event_id = input.eventId ?? null;
  }

  return payload;
}

export function useCreatePlayerEvaluation(orgId: string, playerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlayerEvaluationInput) => {
      const response = await apiClient<PlayerEvaluationResponse>(
        `/admin/clubs/${orgId}/players/${playerId}/evaluations`,
        {
          method: "POST",
          body: buildPlayerEvaluationPayload(input),
        }
      );
      return response.evaluation ? mapPlayerEvaluation(response.evaluation) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playerEvaluations(orgId, playerId) });
    },
  });
}

export interface UpdatePlayerEvaluationInput {
  evaluationId: string;
  values: Partial<PlayerEvaluationInput>;
}

export function useUpdatePlayerEvaluation(orgId: string, playerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ evaluationId, values }: UpdatePlayerEvaluationInput) => {
      const payload = buildPlayerEvaluationPayload(values, { partial: true });
      if (!Object.keys(payload).length) {
        throw new Error("evaluation_update_requires_fields");
      }
      const response = await apiClient<PlayerEvaluationResponse>(
        `/admin/clubs/${orgId}/players/${playerId}/evaluations/${evaluationId}`,
        {
          method: "PATCH",
          body: payload,
        }
      );
      return response.evaluation ? mapPlayerEvaluation(response.evaluation) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playerEvaluations(orgId, playerId) });
    },
  });
}
