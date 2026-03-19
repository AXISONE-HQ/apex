"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EvaluationPlan } from "@/types/domain";
import { EvaluationSectionNav } from "@/components/evaluations/EvaluationSectionNav";
import { formatPlanScope } from "@/lib/evaluation-format";
import { useCreateEvaluationPlan, useEvaluationPlans } from "@/queries/evaluations";
import { PlanFilters } from "@/components/evaluations/PlanFilters";
import { CreatePlanModal, CreatePlanFormValues } from "@/components/evaluations/CreatePlanModal";

interface EvaluationPlansPageClientProps {
  orgId: string;
  prefillTeamId?: string;
  prefillSport?: string;
}

const EMPTY_PLANS: EvaluationPlan[] = [];

export function EvaluationPlansPageClient({ orgId, prefillTeamId, prefillSport }: EvaluationPlansPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ sport: "", scope: "", evaluationCategory: "" });
  const shouldPrefill = Boolean(prefillTeamId || prefillSport);
  const [isCreateOpen, setCreateOpen] = useState(shouldPrefill);

  useEffect(() => {
    if (shouldPrefill) {
      router.replace("/app/evaluations/plans", { scroll: false });
    }
  }, [shouldPrefill, router]);

  const modalInitialValues = useMemo(() => {
    if (!prefillTeamId && !prefillSport) return undefined;
    const scopeValue: "club" | "team" = prefillTeamId ? "team" : "club";
    return {
      scope: scopeValue,
      teamId: prefillTeamId ?? "",
      sport: prefillSport ?? "",
    };
  }, [prefillTeamId, prefillSport]);

  const serverFilters = {
    sport: filters.sport || undefined,
    scope: (filters.scope as "club" | "team" | undefined) || undefined,
    evaluationCategory: filters.evaluationCategory || undefined,
  };

  const plansQuery = useEvaluationPlans(orgId, serverFilters);
  const createPlanMutation = useCreateEvaluationPlan(orgId);

  const plans = plansQuery.data ?? EMPTY_PLANS;
  const availableSports = useMemo(() => {
    const set = new Set<string>();
    for (const plan of plans) {
      if (plan.sport) {
        set.add(plan.sport);
      }
    }
    return Array.from(set).sort();
  }, [plans]);

  const filteredPlans = useMemo(() => {
    if (!search.trim()) return plans;
    const term = search.trim().toLowerCase();
    return plans.filter((plan) => plan.name.toLowerCase().includes(term) || plan.sport.toLowerCase().includes(term));
  }, [plans, search]);

  const handleCreate = async (values: CreatePlanFormValues) => {
    const payload = {
      name: values.name,
      sport: values.sport,
      evaluationCategory: values.evaluationCategory,
      scope: values.scope,
      ageGroup: values.ageGroup || undefined,
      gender: values.gender || undefined,
      teamId: values.scope === "team" ? values.teamId || undefined : undefined,
    };
    const result = await createPlanMutation.mutateAsync(payload);
    setCreateOpen(false);
    if (result?.id) {
      router.push(`/app/evaluations/plans/${result.id}`);
    }
  };

  if (plansQuery.isLoading) {
    return <LoadingState message="Loading evaluation plans" />;
  }

  if (plansQuery.isError) {
    return <ErrorState message="Unable to load evaluation plans" onRetry={() => plansQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Evaluation plans</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Compose block sets for tryouts, reviews, and season tracking</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create plan</Button>
      </div>

      <EvaluationSectionNav />

      <PlanFilters
        search={search}
        onSearchChange={setSearch}
        sport={filters.sport}
        onSportChange={(value) => setFilters((prev) => ({ ...prev, sport: value }))}
        scope={filters.scope}
        onScopeChange={(value) => setFilters((prev) => ({ ...prev, scope: value }))}
        evaluationCategory={filters.evaluationCategory}
        onEvaluationCategoryChange={(value) => setFilters((prev) => ({ ...prev, evaluationCategory: value }))}
        availableSports={availableSports}
        onReset={() => {
          setFilters({ sport: "", scope: "", evaluationCategory: "" });
          setSearch("");
        }}
      />

      {plansQuery.isFetching ? (
        <p className="text-xs text-[var(--color-navy-500)]">Refreshing plans…</p>
      ) : null}

      {filteredPlans.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : (
        <EmptyState message="No evaluation plans match these filters." actionLabel="Create plan" onAction={() => setCreateOpen(true)} />
      )}

      <CreatePlanModal
        open={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createPlanMutation.isPending}
        errorMessage={createPlanMutation.error ? "Unable to create plan" : undefined}
        initialValues={modalInitialValues}
      />
    </div>
  );
}

function PlanCard({ plan }: { plan: EvaluationPlan }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <CardTitle>{plan.name}</CardTitle>
          <CardDescription>{plan.sport}</CardDescription>
        </div>
        <Badge variant="info">{plan.scope === "team" ? "Team" : "Club"}</Badge>
      </div>
      <div className="grid gap-3 text-sm text-[var(--color-navy-700)] sm:grid-cols-2">
        <Metadata label="Category" value={plan.evaluationCategory.replace(/_/g, " ")} />
        <Metadata label="Scope" value={formatPlanScope(plan.scope, plan.teamId)} />
        <Metadata label="Age group" value={plan.ageGroup ?? "All"} />
        <Metadata label="Gender" value={plan.gender ?? "All"} />
      </div>
      <Link href={`/app/evaluations/plans/${plan.id}`} className="text-sm font-semibold text-[var(--color-blue-600)]">
        Open plan →
      </Link>
    </Card>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p>{value}</p>
    </div>
  );
}
