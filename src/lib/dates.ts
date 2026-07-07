export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function isOverdue(dueIso: string | null | undefined, done: boolean): boolean {
  if (!dueIso || done) return false;
  return new Date(dueIso).getTime() < Date.now();
}

/** Days between two ISO dates (b - a), floored. */
export function dayDiff(aIso: string, bIso: string): number {
  const ms = new Date(bIso).getTime() - new Date(aIso).getTime();
  return Math.round(ms / 86_400_000);
}
