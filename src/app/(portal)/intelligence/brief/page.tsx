"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import type { Brief } from "@/lib/brief/types";
import { useState } from "react";
import useSWR from "swr";

type Payload = {
  briefs: (Brief & { id: number })[];
  subscription: { pre: boolean; post: boolean } | null;
  canSubscribe: boolean;
  dbConfigured: boolean;
};

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<Payload>);
const STANCE: Record<string, string> = { Bullish: "text-emerald-600", Defensive: "text-rose-600", Neutral: "text-muted-foreground" };

export default function DailyBriefPage() {
  const { data, mutate } = useSWR("/api/brief", fetcher, { refreshInterval: 300_000 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const latest = data?.briefs[0];

  async function save(pre: boolean, post: boolean) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/brief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pre, post }) });
    setBusy(false);
    setMsg(res.ok ? (pre || post ? "Subscribed." : "Unsubscribed.") : ((await res.json()).error ?? "Failed"));
    mutate();
  }

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto pb-16">
      <PageHeader
        kicker="Daily Brief"
        title="Pre-market & Post-close Brief"
        subtitle="A short, source-attributed read of the Indian market backdrop, generated twice each trading day from live data. It describes what the numbers say — it does not recommend trades."
      />

      {data && !latest ? (
        <p className="text-sm text-muted-foreground">
          {data.dbConfigured ? "No brief has been generated yet — the first one appears after the next scheduled run." : "Briefs are stored in the database, which is not configured in this environment."}
        </p>
      ) : null}

      {latest ? (
        <Panel
          title={latest.headline}
          subtitle={`${latest.kind === "pre" ? "Pre-market" : "Post-close"} · ${new Date(latest.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST · ${latest.engine === "llm" ? "AI-assisted, grounded on the facts below" : "rules-based"}`}
        >
          <ul className="divide-y divide-border/50">
            {latest.items.map((i, idx) => (
              <li key={idx} className="py-3">
                <p className={`text-xs font-bold uppercase tracking-wider ${STANCE[i.stance]}`}>
                  {i.stance} · {i.theme}
                </p>
                <p className="mt-0.5 text-sm text-foreground">{i.text}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {i.sources.map((s) => {
                    const f = latest.facts.find((x) => x.id === s);
                    return f ? (
                      <span key={s} className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground" title={`${f.label}: ${f.value}`}>
                        {f.provider}
                      </span>
                    ) : null;
                  })}
                </div>
              </li>
            ))}
          </ul>
          {latest.watch.length ? <p className="mt-3 text-sm text-foreground"><span className="font-bold">Watch: </span>{latest.watch.join(" · ")}</p> : null}
          {latest.headlines.length ? (
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Official headlines considered</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {latest.headlines.map((h, i) => (
                  <li key={i}>
                    <span className="text-muted-foreground">[{h.source}]</span>{" "}
                    <a href={h.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{h.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
      ) : null}

      <Panel title="Email delivery" subtitle="Opt-in only. Weekdays: pre-market ~8:15 IST, post-close ~16:00 IST.">
        {data?.canSubscribe ? (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={data.subscription?.pre ?? false} disabled={busy} onChange={(e) => save(e.target.checked, data.subscription?.post ?? false)} />
              Pre-market
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={data.subscription?.post ?? false} disabled={busy} onChange={(e) => save(data.subscription?.pre ?? false, e.target.checked)} />
              Post-close
            </label>
            {msg ? <span className="text-muted-foreground">{msg}</span> : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sign in with a free account to subscribe by email.</p>
        )}
      </Panel>

      {data && data.briefs.length > 1 ? (
        <Panel title="Recent briefs">
          <ul className="divide-y divide-border/50 text-sm">
            {data.briefs.slice(1).map((b) => (
              <li key={b.id} className="py-2">
                <span className="text-muted-foreground">{new Date(b.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {b.kind === "pre" ? "Pre" : "Post"}</span>{" "}
                <span className="text-foreground">{b.headline}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <p className="text-xs text-muted-foreground">Generated automatically from live market data with AI assistance; figures are checked against the source facts but the wording can still be imperfect. Research and education only — not investment advice.</p>
    </div>
  );
}
