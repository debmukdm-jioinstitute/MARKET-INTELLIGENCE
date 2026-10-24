"use client";
import { Suspense, useCallback, useMemo, useState, type ReactNode } from "react";
import { HUBS, type HubKey, type HubSlots } from "@/lib/hubs";
import { HubJumpNav } from "./hub-jump-nav";
import { HubSection } from "./hub-section";
import { HubSectionParam } from "./use-hub-section-param";

/** One long scroll page: sticky jump chips + one lazily mounted section per slot. Section ids and order come from src/lib/hubs.ts. */
export function HubPage<K extends HubKey>({ hub, slots, fullHrefs, minHeights, intro }: {
  hub: K;
  slots: HubSlots<K>;
  fullHrefs?: Partial<Record<string, string>>;
  minHeights?: Partial<Record<string, number>>;
  intro?: ReactNode;
}) {
  const def = HUBS[hub];
  const [force, setForce] = useState<string | null>(null);
  const owner = useCallback((anchor: string) => {
    const s = def.sections.find((x) => x.id === anchor || (("subs" in x ? x.subs : []) as readonly string[]).includes(anchor));
    return s?.id ?? anchor;
  }, [def]);
  const onTarget = useCallback((id: string) => setForce(owner(id)), [owner]);
  const chips = useMemo(() => def.sections.map((s) => ({ id: s.id, label: s.label })), [def]);
  const bySlot = slots as Record<string, ReactNode>;

  return (
    <div className="portal-page space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{def.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{def.tagline}</p>
      </header>
      {intro}
      <Suspense fallback={null}><HubSectionParam onTarget={onTarget} /></Suspense>
      <HubJumpNav chips={chips} label={def.title} onJump={onTarget} />
      <div className="space-y-8">
        {def.sections.map((s) => (
          <HubSection key={s.id} id={s.id} title={s.label} force={force === s.id} fullHref={fullHrefs?.[s.id]} minHeight={minHeights?.[s.id] ?? 320}>
            {bySlot[s.id]}
          </HubSection>
        ))}
      </div>
    </div>
  );
}
