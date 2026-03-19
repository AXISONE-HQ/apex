import { CreateTeamForm } from "@/components/teams/CreateTeamForm";
import { getDefaultOrgId } from "@/lib/config";

export default function CreateTeamPage() {
  const orgId = getDefaultOrgId();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Teams</p>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Create a team</h1>
        <p className="text-sm text-[var(--color-navy-500)]">
          Define the basics, assign a head coach, and we will route you to the new team overview when it&rsquo;s ready.
        </p>
      </div>
      <CreateTeamForm orgId={orgId} />
    </div>
  );
}
