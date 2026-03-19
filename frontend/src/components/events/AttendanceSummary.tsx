import { Card } from "@/components/ui/Card";
import type { AttendanceSummary as AttendanceSummaryModel } from "@/types/domain";

interface AttendanceSummaryProps {
  summary?: AttendanceSummaryModel;
}

export function AttendanceSummary({ summary }: AttendanceSummaryProps) {
  if (!summary) return null;
  const items = [
    { label: "Yes", value: summary.yes, color: "text-[var(--color-green-700)]" },
    { label: "No", value: summary.no, color: "text-[var(--color-red-700)]" },
    { label: "Late", value: summary.late, color: "text-[var(--color-orange-700)]" },
    { label: "Excused", value: summary.excused, color: "text-[var(--color-navy-600)]" },
    { label: "No response", value: summary.noResponse, color: "text-[var(--color-navy-400)]" },
  ];

  return (
    <Card className="space-y-3">
      <p className="text-sm font-medium text-[var(--color-navy-900)]">Attendance summary</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-[var(--color-navy-500)]">{item.label}</span>
            <span className={`text-base font-semibold ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
