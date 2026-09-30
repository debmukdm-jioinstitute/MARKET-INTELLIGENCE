"use client";

import { AdminCard } from "@/components/admin/admin-card";
import { useEffect, useState } from "react";

type Data = {
  db: boolean;
  cronSecretSet: boolean;
  crons: { path: string; schedule: string; source: string; what: string }[];
  env: { key: string; required: boolean; note: string; set: boolean }[];
  flags: { flag: string; label: string; enabled: boolean }[];
  stats: Record<string, number | null>;
  scrapeLog: { source: string; ok: boolean; items_found: number; error: string | null; ran_at: string }[];
};
type RunResult = { ok: boolean; status: number; ms: number; body: string };

export default function AdminSystemPage() {
  const [data, setData] = useState<Data | null>(null);
  const [runs, setRuns] = useState<Record<string, RunResult | "running">>({});
  const [welcomeEmail, setWelcomeEmail] = useState("debmuk.dm@gmail.com");
  const [welcomeName, setWelcomeName] = useState("Debabrata Mukherjee");
  const [welcomeRun, setWelcomeRun] = useState<RunResult | "running" | null>(null);
  const [error, setError] = useState("");
  type Preview = { ready: boolean; blocker?: string; eligible: number; skippedOptedOut: number; alreadySent: number; joinedAfterLaunch: number; sample: string[] };
  const [bf, setBf] = useState<Preview | null>(null);
  const [bfLog, setBfLog] = useState<string[]>([]);
  const [bfBusy, setBfBusy] = useState(false);

  function load() {
    fetch("/api/admin/system")
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : setData(j)))
      .catch(() => setError("Failed to load"));
  }
  useEffect(load, []);

  async function run(path: string) {
    setRuns((r) => ({ ...r, [path]: "running" }));
    const res = await fetch("/api/admin/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run", path }) });
    const j = await res.json();
    setRuns((r) => ({ ...r, [path]: res.ok || j.status ? j : { ok: false, status: res.status, ms: 0, body: j.error ?? "failed" } }));
  }

  async function runAll() {
    if (!window.confirm("Run every scheduled job now? Heavy — may take several minutes.")) return;
    const pending = Object.fromEntries((data?.crons ?? []).map((c) => [c.path, "running" as const]));
    setRuns((r) => ({ ...r, ...pending }));
    const res = await fetch("/api/admin/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "runAll" }) });
    const j = await res.json();
    if (j.results?.length) {
      setRuns((r) => {
        const next = { ...r };
        for (const row of j.results as (RunResult & { path: string })[]) {
          next[row.path] = row;
        }
        return next;
      });
    } else {
      setError(j.error ?? "Run all failed");
    }
  }

  async function sendTestWelcome() {
    setWelcomeRun("running");
    const res = await fetch("/api/admin/system", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "testWelcome", email: welcomeEmail, name: welcomeName }),
    });
    const j = await res.json();
    setWelcomeRun(
      res.ok ? { ok: true, status: res.status, ms: 0, body: JSON.stringify(j) } : { ok: false, status: res.status, ms: 0, body: j.error ?? "failed" },
    );
  }

  async function previewBackfill() {
    setBfBusy(true);
    setBfLog([]);
    const res = await fetch("/api/admin/welcome-backfill");
    const j = await res.json();
    setBf(res.ok ? j : null);
    if (!res.ok) setBfLog([j.error ?? "Preview failed"]);
    setBfBusy(false);
  }

  async function sendBackfill() {
    if (!bf || !window.confirm(`Send the welcome email + PDF to ${bf.eligible} member(s) who never received it? This emails real people.`)) return;
    setBfBusy(true);
    const log: string[] = [];
    for (let i = 0; i < 200; i++) {
      const res = await fetch("/api/admin/welcome-backfill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true, limit: 20 }) });
      const j = await res.json();
      if (!res.ok) {
        log.push(j.error ?? `Failed (${res.status})`);
        break;
      }
      log.push(`Sent ${j.sent}, failed ${j.failed}, remaining ${j.remaining}${j.errors?.length ? ` · ${j.errors.join("; ")}` : ""}`);
      setBfLog([...log]);
      if (j.stopped) {
        log.push(j.stopped);
        break;
      }
      if (!j.remaining || (j.sent === 0 && j.failed === 0)) break;
    }
    setBfLog([...log]);
    setBfBusy(false);
    await previewBackfill();
  }

  async function toggle(flag: string, enabled: boolean) {
    await fetch("/api/admin/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "flag", flag, enabled }) });
    load();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  const requireAccountFlag = data.flags.find((f) => f.flag === "require-account");
  const guestLoginEnabled = requireAccountFlag ? !requireAccountFlag.enabled : true;

  const missing = data.env.filter((e) => e.required && !e.set);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-blue-600">System</p>
        <h1 className="text-2xl font-semibold text-gray-900">Jobs, config and feature switches</h1>
      </div>

      {missing.length > 0 || !data.db ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {!data.db ? "No database configured. " : ""}
          {missing.length > 0 ? `Missing required env: ${missing.map((m) => m.key).join(", ")}` : ""}
        </div>
      ) : null}

      <AdminCard title="Welcome email test" subtitle="Sends onboarding welcome HTML + PDF via Resend (production keys).">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="text-gray-500">Email</span>
            <input
              value={welcomeEmail}
              onChange={(e) => setWelcomeEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="text-gray-500">Name</span>
            <input
              value={welcomeName}
              onChange={(e) => setWelcomeName(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void sendTestWelcome()}
            disabled={welcomeRun === "running"}
            className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {welcomeRun === "running" ? "Sending…" : "Send test welcome"}
          </button>
        </div>
        {welcomeRun && welcomeRun !== "running" ? (
          <pre className={`mt-3 max-h-32 overflow-auto rounded-md p-2 text-xs ${welcomeRun.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {welcomeRun.status}
            {"\n"}
            {welcomeRun.body}
          </pre>
        ) : null}
      </AdminCard>

      <AdminCard title="Welcome email backfill" subtitle="One-off: send the founder's welcome email + onboarding PDF to members who joined before it existed. Skips anyone who unsubscribed, and never sends twice.">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void previewBackfill()} disabled={bfBusy} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-50">
            {bfBusy ? "Working…" : "Preview recipients (sends nothing)"}
          </button>
          {bf && bf.ready && bf.eligible > 0 ? (
            <button type="button" onClick={() => void sendBackfill()} disabled={bfBusy} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              Send to {bf.eligible} member{bf.eligible === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
        {bf ? (
          <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            {bf.blocker ? <p className="mb-1 text-red-700">Blocked: {bf.blocker}</p> : null}
            <p>Will receive: <b>{bf.eligible}</b> · Unsubscribed (skipped): {bf.skippedOptedOut} · Already sent: {bf.alreadySent} · Joined after launch (got it at sign-up): {bf.joinedAfterLaunch}</p>
            {bf.sample.length ? <p className="mt-1 text-gray-500">First few: {bf.sample.join(", ")}</p> : null}
          </div>
        ) : null}
        {bfLog.length ? <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-gray-50 p-2 text-xs text-gray-800">{bfLog.join("\n")}</pre> : null}
      </AdminCard>

      <AdminCard title="Scheduled jobs" subtitle={data.cronSecretSet ? "Run any job now (uses CRON_SECRET)." : "CRON_SECRET is not set — jobs are locked in production."}>
        <button
          type="button"
          onClick={() => void runAll()}
          disabled={Object.values(runs).some((r) => r === "running")}
          className="mb-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Run all jobs now
        </button>
        <div className="divide-y divide-gray-200">
          {data.crons.map((c) => {
            const r = runs[c.path];
            return (
              <div key={c.path} className="py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">{c.path}</p>
                    <p className="text-sm text-gray-500">{c.what} · {c.schedule} · {c.source}</p>
                  </div>
                  <button onClick={() => run(c.path)} disabled={r === "running"} className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-50">
                    {r === "running" ? "Running…" : "Run now"}
                  </button>
                </div>
                {r && r !== "running" ? (
                  <pre className={`mt-2 max-h-40 overflow-auto rounded-md p-2 text-xs ${r.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {r.status} · {r.ms}ms{"\n"}{r.body}
                  </pre>
                ) : null}
              </div>
            );
          })}
        </div>
      </AdminCard>

      <AdminCard
        title="Guest login"
        subtitle="When off, demo / guest entry is blocked site-wide. Visitors must sign up or sign in. Active guest cookies clear on the next request."
      >
        {!data.db ? (
          <p className="text-sm text-amber-800">
            Database required to persist this switch. Or set <code className="text-xs">MI_REQUIRE_ACCOUNT=1</code> in env.
          </p>
        ) : (
          <label className="flex items-center justify-between gap-4 text-sm text-gray-900">
            <span>
              <span className="font-medium">Allow guest / demo login</span>
              <span className="mt-0.5 block text-gray-500">Login page, landing, and guest session API.</span>
            </span>
            <input
              type="checkbox"
              checked={guestLoginEnabled}
              onChange={(e) => void toggle("require-account", !e.target.checked)}
              className="h-4 w-4 shrink-0"
            />
          </label>
        )}
      </AdminCard>

      <AdminCard title="Feature switches" subtitle="Kill switch for costly or risky endpoints. Takes effect immediately.">
        <div className="space-y-2">
          {data.flags
            .filter((f) => f.flag !== "require-account")
            .map((f) => (
            <label key={f.flag} className="flex items-center justify-between gap-3 text-sm text-gray-900">
              <span>{f.label}</span>
              <input type="checkbox" checked={f.enabled} onChange={(e) => toggle(f.flag, e.target.checked)} className="h-4 w-4" />
            </label>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Environment" subtitle="Presence only — values are never shown.">
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {data.env.map((e) => (
            <div key={e.key} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-900">{e.key}{e.required ? " *" : ""}</span>
              <span className={e.set ? "text-green-700" : e.required ? "text-red-600" : "text-gray-400"}>{e.set ? "set" : "missing"}</span>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Data footprint">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(data.stats).map(([k, v]) => (
            <div key={k} className="rounded-md border border-gray-200 bg-white p-2">
              <p className="text-xs text-gray-500">{k}</p>
              <p className="text-lg font-semibold text-gray-900">{v ?? "n/a"}</p>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Recent research scrapes">
        {data.scrapeLog.length === 0 ? (
          <p className="text-sm text-gray-500">No runs logged.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.scrapeLog.map((s, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className={s.ok ? "text-gray-900" : "text-red-600"}>{s.source} · {s.items_found} items{s.error ? ` · ${s.error}` : ""}</span>
                <span className="text-gray-500">{new Date(s.ran_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
