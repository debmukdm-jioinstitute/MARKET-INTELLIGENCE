"use client";

import {
  MissionStrip,
  XpToastCard,
  useAiDeskMissions,
} from "@/components/ai-desk/ai-desk-missions";
import { AlphaDiscoveryPanel } from "@/components/ai-desk/alpha-discovery-panel";
import { SentimentPortfolioPanel } from "@/components/ai-desk/sentiment-portfolio-panel";
import { TradingDeskPanel } from "@/components/ai-desk/trading-desk-panel";
import { PageHeader } from "@/components/layout/page-header";
import { FreeTierAiQuotaBanner } from "@/components/payments/free-tier-ai-quota-banner";
import { cn } from "@/lib/utils";
import { FlaskConical, MessagesSquare, Newspaper } from "lucide-react";
import { useEffect, useState } from "react";

type TabId = "debate" | "mood" | "lab";

const TABS: { id: TabId; label: string; short: string; icon: typeof MessagesSquare; blurb: string }[] = [
  { id: "debate", label: "Debate", short: "Debate", icon: MessagesSquare, blurb: "Five AI agents argue one stock" },
  { id: "mood", label: "Portfolio mood", short: "Mood", icon: Newspaper, blurb: "What the news feels like about your holdings" },
  { id: "lab", label: "Factor lab", short: "Lab", icon: FlaskConical, blurb: "Test investing ideas from the AI on real prices" },
];

const HASH_TO_TAB: Record<string, TabId> = {
  "trading-desk": "debate",
  "sentiment-portfolio": "mood",
  "alpha-discovery": "lab",
  debate: "debate",
  mood: "mood",
  lab: "lab",
};

const TAB_TO_HASH: Record<TabId, string> = {
  debate: "trading-desk",
  mood: "sentiment-portfolio",
  lab: "alpha-discovery",
};

function initialTab(): TabId {
  if (typeof window === "undefined") return "debate";
  const h = window.location.hash.replace(/^#/, "");
  return HASH_TO_TAB[h] ?? "debate";
}

export default function AiDeskPage() {
  const [tab, setTab] = useState<TabId>(initialTab);
  const { xp, done, toast, completeMission } = useAiDeskMissions();

  // Keep deep links working: #trading-desk / #sentiment-portfolio / #alpha-discovery select tabs.
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#/, "");
      const next = HASH_TO_TAB[h];
      if (next) setTab(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function select(next: TabId) {
    setTab(next);
    try {
      window.history.replaceState(null, "", `#${TAB_TO_HASH[next]}`);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="portal-page">
      <PageHeader title="Multi-agent research lab" />

      <FreeTierAiQuotaBanner context="ai-desk" />

      {/* Sticky tab bar — segmented control, thumb-friendly on mobile */}
      <div className="sticky top-0 z-30 -mx-1 bg-stone-50/95 px-1 py-2 backdrop-blur">
        <div
          role="tablist"
          aria-label="AI Desk sections"
          className="grid grid-cols-3 gap-1 rounded-2xl border border-stone-200 bg-white p-1 shadow-sm"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => select(t.id)}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-center transition sm:flex-row sm:gap-2",
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-800",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="text-sm font-semibold leading-tight">
                  <span className="sm:hidden">{t.short}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </span>
                <span className={cn("hidden text-xs leading-tight lg:inline", active ? "text-teal-100" : "text-stone-400")}>
                  {t.blurb}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-center sm:justify-start">
          <MissionStrip xp={xp} done={done} />
        </div>
      </div>

      <div className="pt-2">
        {tab === "debate" ? (
          <div role="tabpanel" aria-label="Debate">
            <TradingDeskPanel
              onRunSuccess={() => completeMission("ask")}
              onWatched={() => completeMission("watch")}
            />
          </div>
        ) : null}
        {tab === "mood" ? (
          <div role="tabpanel" aria-label="Portfolio mood">
            <SentimentPortfolioPanel />
          </div>
        ) : null}
        {tab === "lab" ? (
          <div role="tabpanel" aria-label="Factor lab">
            <AlphaDiscoveryPanel />
          </div>
        ) : null}
      </div>

      <p className="pt-4 text-center text-xs text-stone-400">
        Research and education only — AI output can be wrong or out of date, and is never investment advice.
      </p>

      {toast ? <XpToastCard toast={toast} /> : null}
    </div>
  );
}
