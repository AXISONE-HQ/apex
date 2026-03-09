import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-background)] px-6 text-center">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-[var(--color-blue-600)]">Apex Platform</p>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--color-navy-900)]">
          Club operations made simple
        </h1>
        <p className="text-base text-[var(--color-navy-500)]">
          Jump into the admin experience to explore the new dashboard, schedule, and guardian RSVP flows.
        </p>
      </div>
      <Link href="/app/dashboard">
        <Button>Enter app</Button>
      </Link>
    </div>
  );
}
