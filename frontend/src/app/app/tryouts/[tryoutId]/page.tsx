import { TryoutDetailPageClient } from "@/components/tryouts/TryoutDetailPageClient";
import { getDefaultOrgId } from "@/lib/config";

interface TryoutDetailPageProps {
  params: { tryoutId: string };
}

export default function TryoutDetailPage({ params }: TryoutDetailPageProps) {
  const orgId = getDefaultOrgId();
  return <TryoutDetailPageClient orgId={orgId} tryoutId={params.tryoutId} />;
}
