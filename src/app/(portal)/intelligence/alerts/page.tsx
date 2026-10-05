"use client";

import { PageHeader, Panel } from "@/components/layout/page-header";
import { PushNotificationsToggle } from "@/components/layout/push-notifications-toggle";
import { ScanAlerts } from "@/components/scanner/scan-alerts";
import useSWR from "swr";
import { useState } from "react";
import { ActivityTimeline } from "@/components/alerts/activity-timeline";
import { BadgeStrip } from "@/components/alerts/badge-strip";
import { DEFAULT_DRAFT, condListText, type Draft, type MetricInfo, type Rule, type Template } from "@/components/alerts/model";
import { RuleCards } from "@/components/alerts/rule-cards";
import { RuleStudio } from "@/components/alerts/rule-studio";
import { TemplateGallery } from "@/components/alerts/template-gallery";
import { useAlertsGamification } from "@/components/alerts/use-gamification";

type Payload = {
  rules: Rule[];
  events: { id: string; fired_at: string; message: string }[];
  catalog: MetricInfo[];
  canEdit: boolean;
  dbConfigured: boolean;
};

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<Payload>);

const freshDraft = (d: Draft): Draft => ({ ...d, conditions: d.conditions.map((c) => ({ ...c })), channels: [...d.channels] });

export default function AlertRulesPage() {
  const { data, error, mutate } = useSWR("/api/alerts", fetcher, { refreshInterval: 60_000 });
  const [draft, setDraft] = useState<Draft>(() => freshDraft(DEFAULT_DRAFT));
  const activeCount = (data?.rules ?? []).filter((r) => r.active).length;
  const { markFirstRule } = useAlertsGamification(data?.rules.length ?? 0, activeCount);
  const labelOf = (id: string) => data?.catalog.find((m) => m.id === id);

  function pickTemplate(t: Template) {
    setDraft(freshDraft(t.draft));
    document.getElementById("rule-studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function createRule(d: Draft): Promise<string | null> {
    const name = d.name.trim() || condListText(d.conditions, d.combinator, labelOf);
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, conditions: d.conditions, combinator: d.combinator, channels: d.channels, cooldownHours: d.cooldownHours }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return (json.issues as string[] | undefined)?.join("; ") ?? json.error ?? "Couldn't create the rule — please try again.";
    markFirstRule();
    setDraft(freshDraft(DEFAULT_DRAFT));
    await mutate();
    return null;
  }

  async function call(method: string, url: string, body?: unknown) {
    await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    await mutate();
  }

  async function restoreRule(r: Rule) {
    await call("POST", "/api/alerts", {
      name: r.name,
      conditions: r.conditions,
      combinator: r.combinator,
      channels: r.channels,
      cooldownHours: r.cooldownHours,
    });
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 pb-16">
      <PageHeader

        title="Market alerts"
        subtitle="Tell us what to watch, and we'll ping you when it happens — e.g. India VIX above 20, or FII selling more than ₹2,000 cr in a day. Rules are checked every 3 hours, so alerts can lag a fast move."
      />

      {!data && !error ? (
        <Panel title="Loading your alerts">
          <p className="animate-pulse text-sm text-muted-foreground">Fetching your rules and the latest market readings…</p>
        </Panel>
      ) : null}
      {error && !data ? (
        <Panel title="Couldn't load alerts">
          <p className="text-sm text-muted-foreground">Something went wrong loading your alerts. Please refresh the page.</p>
        </Panel>
      ) : null}

      {data && !data.canEdit ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
          {data.dbConfigured
            ? "Sign in with a free account to create alert rules — you'll see your templates, rules and alert history here."
            : "Alert rules need the database, which is not configured in this environment."}
        </p>
      ) : null}

      {data?.canEdit ? (
        <>
          <BadgeStrip ruleCount={data.rules.length} activeCount={activeCount} />

          <Panel title="1 · Start from a template" subtitle="One tap loads a ready-made rule — then make it yours below.">
            <TemplateGallery onPick={pickTemplate} />
          </Panel>

          <div id="rule-studio" className="scroll-mt-24">
            <Panel title="2 · Rule studio" subtitle="Build the rule in plain words. The preview updates as you type." action={<PushNotificationsToggle />}>
              <RuleStudio draft={draft} onDraft={setDraft} catalog={data.catalog} onCreate={createRule} canEdit={data.canEdit} />
            </Panel>
          </div>

          <Panel title="3 · Your rules" subtitle={`${activeCount} of ${data.rules.length} watching right now.`}>
            <RuleCards
              rules={data.rules}
              labelOf={labelOf}
              onToggle={(id, active) => call("PATCH", "/api/alerts", { id, active })}
              onDelete={(id) => call("DELETE", `/api/alerts?id=${encodeURIComponent(id)}`)}
              onRestore={restoreRule}
            />
          </Panel>

          <Panel title="4 · Recent alerts" subtitle="Everything that has fired, newest first.">
            <ActivityTimeline events={data.events} />
          </Panel>
        </>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Alerts are informational and based on delayed, third-party data. Research and education only — not investment advice.
      </p>

      <div className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="text-xl font-bold text-foreground">Scanner alerts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Signals from the daily Nifty 500 scan — breakouts, breakdowns, crossovers and chart patterns — plus an on-demand scanner console.
          </p>
        </div>
        <ScanAlerts />
      </div>
    </div>
  );
}
