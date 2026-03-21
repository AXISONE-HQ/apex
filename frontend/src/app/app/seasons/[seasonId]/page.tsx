import { SeasonDetailPageClient } from "@/components/seasons/SeasonDetailPageClient";
import { getDefaultOrgId } from "@/lib/config";

interface SeasonDetailPageProps {
  params: {
    seasonId: string;
  };
}

export default function SeasonDetailPage({ params }: SeasonDetailPageProps) {
  const orgId = getDefaultOrgId();
  return <SeasonDetailPageClient orgId={orgId} seasonId={params.seasonId} />;
}
