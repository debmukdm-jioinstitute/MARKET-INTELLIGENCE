"use client";

import { Activity, ChevronRight, Flame, Fuel, TrendingDown, TrendingUp, Waves } from "lucide-react";
import { TEMPLATES, type Template } from "./model";

const ICONS: Record<string, typeof Flame> = {
  "vix-spike": Flame,
  "fii-selling": TrendingDown,
  "stress-rising": Activity,
  "crude-shock": Fuel,
  "rupee-slide": Waves,
  "nifty-jump": TrendingUp,
};

export function TemplateGallery({ onPick }: { onPick: (t: Template) => void }) {
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Tap a card to load it into the rule studio below, then tweak it. No blank forms.
      </p>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-6">
        {TEMPLATES.map((t) => {
          const Icon = ICONS[t.id] ?? Activity;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className="group flex w-44 shrink-0 snap-start flex-col rounded-xl border border-border bg-card p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md md:w-auto"
            >
              <span className="mb-2.5 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </span>
              <span className="text-sm font-semibold text-foreground">{t.title}</span>
              <span className="mt-1 flex-1 text-xs leading-snug text-muted-foreground">{t.blurb}</span>
              <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Use template <ChevronRight className="size-3.5" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
