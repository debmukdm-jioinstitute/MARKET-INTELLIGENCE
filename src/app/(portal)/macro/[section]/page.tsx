"use client";

import { MacroSectionView } from "@/components/macro/macro-section-view";
import { PageHeader } from "@/components/layout/page-header";
import { MacroTapeSkeleton } from "@/components/macro/macro-tape-skeleton";
import { useMacroHub } from "@/hooks/use-macro-hub";
import { sectionMeta } from "@/lib/macro/sections-meta";
import type { MacroSectionId } from "@/lib/macro/types";
import { useParams } from "next/navigation";

const VALID: MacroSectionId[] = [
  "regime",
  "growth",
  "inflation",
  "rates-liquidity",
  "fiscal",
  "consumer",
  "corporate",
  "external",
  "employment",
  "global",
];

export default function MacroSectionPage() {
  const params = useParams();
  const raw = String(params.section ?? "");
  const sectionId = (VALID.includes(raw as MacroSectionId) ? raw : "growth") as MacroSectionId;
  const meta = sectionMeta(sectionId);
  const { data, loading, error } = useMacroHub();

  return (
    <div className="portal-page">
      <PageHeader kicker="India macro" title={meta.title} subtitle={meta.subtitle} />
      {loading && !data ? <MacroTapeSkeleton count={4} /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {data ? <MacroSectionView sectionId={sectionId} data={data} /> : null}
    </div>
  );
}
