"use client";
import useSWR from "swr";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DISCLAIMER } from "@/lib/competition/config";
import type { Competition } from "@/lib/competition/types";
import { loadCompetition, sendCompetition, StatusMessage } from "./shared";
import { TradingDaysPicker } from "./trading-days-picker";
type Overview = {
  competition: Competition | null;
  participants: { user_email: string; display_name: string; status: string }[];
  flags: {
    id: string;
    user_email: string;
    reason: string;
    resolved: boolean;
  }[];
  instruments: {
    symbol: string;
    name: string;
    blocked: boolean;
    circuit_locked: boolean;
  }[];
  events: { id: string; event: string; delivered: boolean }[];
};
const loader = (url: string) => loadCompetition<Overview>(url);
export function AlphaAdmin() {
  const { data, error, mutate } = useSWR("/api/admin/competition", loader);
  const [dates, setDates] = useState<string[]>([]),
    [finalists, setFinalists] = useState(3),
    [symbol, setSymbol] = useState(""),
    [name, setName] = useState(""),
    [kind, setKind] = useState("equity"),
    [blocked, setBlocked] = useState(false),
    [circuit, setCircuit] = useState(true),
    [email, setEmail] = useState(""),
    [reason, setReason] = useState(""),
    [exDate, setExDate] = useState(""),
    [ratio, setRatio] = useState(1),
    [dividend, setDividend] = useState(0),
    [failure, setFailure] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function command(body: object, url = "/api/admin/competition") {
    setBusy(true);
    setFailure(null);
    setNotice("");
    try {
      await sendCompetition(url, body);
      setNotice("Saved.");
      await mutate();
    } catch (e) {
      setFailure(e);
    } finally {
      setBusy(false);
    }
  }
  async function certificate() {
    setBusy(true);
    setFailure(null);
    try {
      const res = await fetch("/api/admin/competition/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "alpha-league-certificate.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFailure(e);
    } finally {
      setBusy(false);
    }
  }
  const c = data?.competition;
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Alpha League operations</h1>
      <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
        {DISCLAIMER}
      </p>
      <StatusMessage error={error ?? failure} />
      {notice ? <p role="status">{notice}</p> : null}
      {!c ? (
        <form
          className="space-y-3 rounded-xl border border-border p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void command({
              action: "create",
              tradingDays: dates,
              finalistCount: finalists,
            });
          }}
        >
          <h2 className="text-xl font-semibold">
            Create the standalone season
          </h2>
          <div className="block space-y-2">
            <span className="text-sm font-medium">Five trading dates</span>
            <TradingDaysPicker value={dates} onChange={setDates} maxDates={5} required />
          </div>
          <label className="block">
            Finalist places including Champion
            <Input
              type="number"
              min={1}
              max={100}
              value={finalists}
              onChange={(e) => setFinalists(Number(e.target.value))}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            Verify NSE holidays. Dates must form one five-day trading week.
          </p>
          <Button disabled={busy || dates.length !== 5}>Create draft season</Button>
        </form>
      ) : (
        <section className="space-y-3 rounded-xl border border-border p-5">
          <h2 className="text-xl font-semibold">
            {c.name} · {c.status}
          </h2>
          <p>{c.tradingDays.join(" · ")}</p>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["registration", "Open registration"],
                ["live", "Go live"],
                ["ended", "End season"],
              ] as const
            ).map(([status, label]) => (
              <Button
                key={status}
                disabled={busy}
                variant="outline"
                onClick={() => void command({ action: "advance", status })}
              >
                {label}
              </Button>
            ))}
            {c.status === "live" ? (
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => void command({ action: "reopenRegistration" })}
              >
                Reopen registration
              </Button>
            ) : null}
            <Button
              disabled={busy}
              onClick={() => void command({ action: "snapshot" })}
            >
              Record today's close
            </Button>
            <Button
              disabled={busy || c.resultsVerified}
              onClick={() => void command({ action: "verifyResults" })}
            >
              {c.resultsVerified ? "Results verified" : "Verify final results"}
            </Button>
          </div>
        </section>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <form
          className="space-y-3 rounded-xl border border-border p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void command({
              action: "instrument",
              symbol,
              name,
              kind,
              blocked,
              circuitLocked: circuit,
            });
          }}
        >
          <h2 className="text-xl font-semibold">Instrument safety review</h2>
          <label className="block">
            NSE symbol
            <Input
              required
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </label>
          <label className="block">
            Instrument name
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            Type
            <select
              className="ml-3 rounded border border-border bg-background p-2"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="equity">Equity</option>
              <option value="etf">ETF</option>
            </select>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
            />
            Blocked
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={circuit}
              onChange={(e) => setCircuit(e.target.checked)}
            />
            Circuit locked / unverified
          </label>
          <p className="text-xs text-muted-foreground">
            Review against NSE before clearing circuit status. Approval expires
            after 24 hours.
          </p>
          <Button disabled={busy || !c}>Save review</Button>
        </form>
        <form
          className="space-y-3 rounded-xl border border-border p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void command({
              action: "corporateAction",
              symbol,
              ratio,
              dividend,
              exDate,
            });
          }}
        >
          <h2 className="text-xl font-semibold">Corporate action</h2>
          <p className="text-sm text-muted-foreground">
            Uses the NSE symbol in the adjacent safety form. Enter before
            recording the affected close.
          </p>
          <label className="block">
            Ex-date
            <Input
              required
              type="date"
              value={exDate}
              onChange={(e) => setExDate(e.target.value)}
            />
          </label>
          <label className="block">
            Share multiplier (2 for 2:1 split or 1:1 bonus)
            <Input
              type="number"
              required
              min={0.001}
              step={0.001}
              value={ratio}
              onChange={(e) => setRatio(Number(e.target.value))}
            />
          </label>
          <label className="block">
            Cash dividend per pre-action share
            <Input
              type="number"
              required
              min={0}
              step={0.01}
              value={dividend}
              onChange={(e) => setDividend(Number(e.target.value))}
            />
          </label>
          <Button disabled={busy || !c}>Save adjustment</Button>
        </form>
      </div>
      <section className="space-y-4 rounded-xl border border-border p-5">
        <h2 className="text-xl font-semibold">Fair-participation review</h2>
        {data?.flags
          .filter((f) => !f.resolved)
          .map((f) => (
            <div key={f.id} className="rounded-lg bg-muted p-3">
              <p>
                {f.user_email} · {f.reason}
              </p>
              <Button
                disabled={busy}
                variant="outline"
                className="mt-2"
                onClick={() =>
                  void command({ action: "resolveFlag", id: f.id })
                }
              >
                Mark reviewed
              </Button>
            </div>
          ))}
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Participant email
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Disqualification reason
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={busy || !email || reason.length < 5}
            variant="destructive"
            onClick={() =>
              void command({ action: "disqualify", email, reason })
            }
          >
            Disqualify participant
          </Button>
          <Button
            disabled={busy || !email || !c?.resultsVerified}
            onClick={() => void certificate()}
          >
            Issue eligible certificate PDF
          </Button>
        </div>
      </section>
      <section className="space-y-3 rounded-xl border border-border p-5">
        <h2 className="text-xl font-semibold">Kit event hooks</h2>
        <p className="text-sm text-muted-foreground">
          Events are queued for participants who opted in. Sync applies
          configured Kit tags; Kit automations handle delivery.
        </p>
        <div className="flex flex-wrap gap-3">
          {(["announce", "reminder", "standings"] as const).map((event) => (
            <Button
              key={event}
              disabled={busy || !c}
              variant="outline"
              onClick={() => void command({ action: "event", event })}
            >
              Queue {event}
            </Button>
          ))}
          <Button
            disabled={busy}
            onClick={() => void command({}, "/api/admin/competition/events")}
          >
            Sync pending Kit hooks
          </Button>
        </div>
      </section>
      <section className="rounded-xl border border-border p-5">
        <h2 className="text-xl font-semibold">Participants</h2>
        <ul className="mt-3 space-y-2">
          {data?.participants.map((p) => (
            <li key={p.user_email}>
              {p.display_name} · {p.user_email} · {p.status}
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
    </div>
  );
}
