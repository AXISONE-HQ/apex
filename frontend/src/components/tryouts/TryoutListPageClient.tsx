"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { TryoutStatusPill } from "./TryoutStatusPill";
import { useTryouts } from "@/queries/tryouts";
import type { TryoutStatus, TryoutSummary } from "@/types/domain";

interface TryoutListPageClientProps {
  orgId: string;
}

const sections: Array<{ id: string; title: string; status: TryoutStatus; description: string }> = [
  {
    id: "current",
    title: "In Progress",
    status: "in_progress",
    description: "Tryouts currently running",
  },
  {
    id: "upcoming",
    title: "Upcoming",
    status: "scheduled",
    description: "Tryouts slated to start soon",
  },
  {
    id: "past",
    title: "Completed",
    status: "completed",
    description: "Historical tryouts",
  },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function formatDateRange(startsAt?: string, endsAt?: string) {
  if (!startsAt && !endsAt) return "TBD";
  if (!endsAt) return formatDate(startsAt);
  return `${formatDate(startsAt)} → ${formatDate(endsAt)}`;
}

export function TryoutListPageClient({ orgId }: TryoutListPageClientProps) {
  const router = useRouter();
  const { tryouts, isLoading, isError, error, refetch } = useTryouts(orgId);

  if (isLoading) {
    return <LoadingState message="Loading tryouts" />;
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to fetch tryouts";
    return <ErrorState message={message} onRetry={() => refetch()} />;
  }

  if (tryouts.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState
          message="No tryouts found for this club. Use the Create Tryout action to start the first one."
          actionLabel="Create tryout"
          onAction={() => router.push("/app/tryouts/create")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />
      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-navy-800)]">{section.title}</h2>
              <p className="text-sm text-[var(--color-navy-500)]">{section.description}</p>
            </div>
            <span className="text-sm text-[var(--color-navy-500)]">
              {tryouts.filter((item) => item.status === section.status).length} tryout(s)
            </span>
          </div>
          <SectionGrid items={tryouts.filter((item) => item.status === section.status)} />
        </section>
      ))}
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Tryouts</h1>
        <p className="text-sm text-[var(--color-navy-500)]">Manage upcoming, active, and completed tryouts</p>
      </div>
      <Link href="/app/tryouts/create">
        <Button>Create Tryout</Button>
      </Link>
    </div>
  );
}

interface SectionGridProps {
  items: TryoutSummary[];
}

function SectionGrid({ items }: SectionGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-navy-200)] px-4 py-6 text-center text-sm text-[var(--color-navy-500)]">
        No tryouts in this section yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((tryout) => (
        <Card key={tryout.id} className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>{tryout.name}</span>
              <TryoutStatusPill status={tryout.status} />
            </CardTitle>
            <CardDescription>
              <span className="font-medium text-[var(--color-navy-700)]">{tryout.seasonLabel ?? "Season TBD"}</span>
              {" • "}
              <span>{formatDateRange(tryout.startsAt, tryout.endsAt)}</span>
            </CardDescription>
          </CardHeader>
          <div className="grid gap-3 text-sm text-[var(--color-navy-600)] sm:grid-cols-2">
            <Metric label="Venue" value={tryout.venueName ?? "Unassigned"} />
            <Metric label="Registered" value={`${tryout.registeredCount}`} />
            <Metric label="Checked In" value={`${tryout.checkedInCount}`} />
            <Metric label="Spots Available" value={tryout.spotsAvailable ?? "—"} />
          </div>
          <div className="mt-4 flex justify-end">
            <Link
              href={`/app/tryouts/${tryout.id}`}
              className="text-sm font-semibold text-[var(--color-blue-600)] hover:underline"
            >
              View details →
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--color-navy-100)] px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p className="text-sm font-medium text-[var(--color-navy-800)]">{value}</p>
    </div>
  );
}
