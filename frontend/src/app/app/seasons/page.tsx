import { SeasonsPageClient } from "@/components/seasons/SeasonsPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function SeasonsPage() {
  const orgId = getDefaultOrgId();
  return <SeasonsPageClient orgId={orgId} />;
}
