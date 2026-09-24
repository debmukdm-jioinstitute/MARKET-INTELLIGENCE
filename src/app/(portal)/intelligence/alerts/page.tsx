"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { PushNotificationsToggle } from "@/components/layout/push-notifications-toggle";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

type Cond = { metric: string; op: string; value: number };
type Rule = { id: string; name: string; conditions: Cond[]; combinator: "all" | "any"; channels: string[]; cooldownHours: number; active: boolean; lastFiredAt: string | null };
type Payload = {
  catalog: { id: string; label: string; unit: string; current: number | null }[];
  rules: Rule[];
  events: { id: number; fired_at: string; message: string }[];
  canEdit: boolean;
  dbConfigured: boolean;
};

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<Payload>);
const OPS = [">", "<", ">=", "<="];
const inputCls = "rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground";

export default function AlertRulesPage() {
  const { data, mutate } = useSWR("/api/alerts", fetcher, { refreshInterval: 60_000 });
  const [name, setName] = useState("");
  const [conds, setConds] = useState<Cond[]>([{ metric: "india_vix", op: ">", value: 20 }]);
  const [combinator, setCombinator] = useState<"all" | "any">("all");
  const [channels, setChannels] = useState<string[]>(["push"]);
  const [cooldown, setCooldown] = useState(12);
  const [err, setErr] = useState<string | null>(null);
  const label = (id: string) => data?.catalog.find((c) => c.id === id)?.label ?? id;

  async function create() {
    setErr(null);
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name || conds.map((c) => `${label(c.metric)} ${c.op} ${c.value}`).join(" & "), conditions: conds, combinator, channels, cooldownHours: cooldown }),
    });
    const json = await res.json();
    if (!res.ok) return setErr(json.issues?.join("; ") ?? json.error ?? "Failed");
    setName("");
    mutate();
  }

  const call = async (method: string, url: string, body?: unknown) => {
    await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    mutate();
  };

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto pb-16">
      <PageHeader
        kicker="Alerts"
        title="Alert Rules"
        subtitle="Get a push notification or email when market conditions you define are met — e.g. India VIX above 20 and FII net flow below −2,000 cr. Rules are checked every 3 hours, so alerts can lag a fast move."
      />

      {data && !data.canEdit ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {data.dbConfigured ? "Sign in with a free account to create alert rules." : "Alert rules need the database, which is not configured in this environment."}
        </p>
      ) : null}

      {data?.canEdit ? (
        <>
          <Panel title="New rule" action={<PushNotificationsToggle />}>
            <div className="space-y-3 text-sm">
              {conds.map((c, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select className={inputCls} value={c.metric} onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, metric: e.target.value } : x)))}>
                    {data.catalog.map((m) => (
                      <option key={m.id} value={m.id}>{m.label} ({m.unit})</option>
                    ))}
                  </select>
                  <select className={inputCls} value={c.op} onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)))}>
                    {OPS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <input className={`${inputCls} w-28 tabular-nums`} type="number" step="any" value={c.value} onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)))} />
                  <span className="text-muted-foreground">now: {data.catalog.find((m) => m.id === c.metric)?.current?.toFixed(2) ?? "n/a"}</span>
                  {conds.length > 1 ? <button type="button" className="text-rose-600" onClick={() => setConds(conds.filter((_, j) => j !== i))}>Remove</button> : null}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                {conds.length < 5 ? <button type="button" className="text-blue-600 hover:underline" onClick={() => setConds([...conds, { metric: "fii_net", op: "<", value: -2000 }])}>+ Add condition</button> : null}
                {conds.length > 1 ? (
                  <select className={inputCls} value={combinator} onChange={(e) => setCombinator(e.target.value as "all" | "any")}>
                    <option value="all">ALL must match</option>
                    <option value="any">ANY can match</option>
                  </select>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <input className={`${inputCls} w-64`} placeholder="Rule name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
                {["push", "email"].map((ch) => (
                  <label key={ch} className="inline-flex items-center gap-1.5 capitalize">
                    <input type="checkbox" checked={channels.includes(ch)} onChange={(e) => setChannels(e.target.checked ? [...channels, ch] : channels.filter((x) => x !== ch))} />
                    {ch}
                  </label>
                ))}
                <label className="inline-flex items-center gap-1.5">
                  Cooldown
                  <input className={`${inputCls} w-16 tabular-nums`} type="number" min={1} max={168} value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} /> h
                </label>
                <button type="button" disabled={!channels.length} onClick={create} className="rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white disabled:opacity-50">Create rule</button>
              </div>
              {err ? <p className="text-rose-600">{err}</p> : null}
            </div>
          </Panel>

          <Panel title="Your rules">
            {data.rules.length ? (
              <ul className="divide-y divide-border/50 text-sm">
                {data.rules.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="font-semibold text-foreground">{r.name}</p>
                      <p className="text-muted-foreground">
                        {r.conditions.map((c) => `${label(c.metric)} ${c.op} ${c.value}`).join(r.combinator === "all" ? " AND " : " OR ")} · {r.channels.join(", ")} · cooldown {r.cooldownHours}h
                        {r.lastFiredAt ? ` · last fired ${new Date(r.lastFiredAt).toLocaleString()}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5">
                        <input type="checkbox" checked={r.active} onChange={(e) => call("PATCH", "/api/alerts", { id: r.id, active: e.target.checked })} /> Active
                      </label>
                      <button type="button" aria-label="Delete rule" className="text-rose-600" onClick={() => call("DELETE", `/api/alerts?id=${r.id}`)}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No rules yet.</p>
            )}
          </Panel>

          <Panel title="Recent alerts">
            {data.events.length ? (
              <ul className="divide-y divide-border/50 text-sm">
                {data.events.map((e) => (
                  <li key={e.id} className="py-2"><span className="tabular-nums text-muted-foreground">{new Date(e.fired_at).toLocaleString()}</span> <span className="text-foreground">{e.message}</span></li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing has fired yet.</p>
            )}
          </Panel>
        </>
      ) : null}
      <p className="text-xs text-muted-foreground">Alerts are informational and based on delayed, third-party data. Research and education only — not investment advice.</p>
    </div>
  );
}
