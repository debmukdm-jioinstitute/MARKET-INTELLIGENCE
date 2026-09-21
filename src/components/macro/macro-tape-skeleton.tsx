import { Panel } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder rows matching the "one Panel per instrument" shape used across the macro tape pages. */
export function MacroTapeSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Panel key={i} title={<Skeleton className="h-4 w-32" />}>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </Panel>
      ))}
    </>
  );
}
