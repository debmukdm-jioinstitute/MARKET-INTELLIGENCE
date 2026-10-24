"use client";
import { IndiaMacroBoard } from "@/components/dashboard/india-macro-board";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";

/** India macro board without the page-level calendar (the calendar has its own hub section). */
export default function IndiaMacroSection() {
  const { data, loading, error } = useIndiaDashboard(45_000);
  return (
    <div>
      {loading && !data ? <p className="mb-4 text-sm text-muted-foreground">Loading India macro…</p> : null}
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
      <IndiaMacroBoard data={data} />
    </div>
  );
}
