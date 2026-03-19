export type CalendarView = "week" | "month";

export function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay(); // 0 (Sun) - 6 (Sat)
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day);
  return copy;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const copy = new Date(start);
  copy.setDate(copy.getDate() + 6);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function startOfMonth(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfMonth(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function startOfMonthGrid(date: Date): Date {
  return startOfWeek(startOfMonth(date));
}

export function endOfMonthGrid(date: Date): Date {
  return endOfWeek(endOfMonth(date));
}

export function addDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function addMonths(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + amount);
  return copy;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatWeekRangeLabel(date: Date): string {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const long = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  const sameMonth = start.getMonth() === end.getMonth();
  const prefix = sameMonth ? short.format(start) : `${short.format(start)}`;
  const suffix = long.format(end);
  return `${prefix} – ${suffix}`;
}

export function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}
