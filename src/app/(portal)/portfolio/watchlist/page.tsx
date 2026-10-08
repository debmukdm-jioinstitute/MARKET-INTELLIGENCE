"use client";

import { SignInRequiredBanner } from "@/components/auth/sign-in-required-banner";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { useWatchlist } from "@/hooks/use-watchlist";
import Link from "next/link";
import { useState } from "react";
import { CompanyLogo } from "@/components/CompanyLogo";

function fmtAddedIst(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " IST";
  } catch {
    return iso;
  }
}

export default function WatchlistPage() {
  const { locked, items, loading, error, dbConfigured, remove } = useWatchlist();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto pb-16">
      <PageHeader

        title="Watchlist"
        subtitle="Names you're keeping an eye on — add from a research page, the command palette, or ask Ask Deb."
      />

      {locked ? <SignInRequiredBanner feature="a watchlist" nextPath="/portfolio/watchlist" /> : null}
      {!locked && !dbConfigured ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Watchlists need a database, which isn't configured on this deployment yet.
        </p>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {note ? <p className="text-sm text-emerald-600">{note}</p> : null}

      <Panel title="Your names" subtitle={loading ? "Loading…" : `${items.length} tracked`}>
        {!loading && items.length === 0 && !locked ? (
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Open a company page and add it, or ask Ask Deb — try &quot;add RELIANCE to my watchlist&quot;.
          </p>
        ) : null}
        {items.length > 0 ? (
          <DataTable
            caption="Watchlist"
            filename="watchlist"
            rows={items}
            rowKey={(r) => r.id}
            columns={[
              {
                key: "symbol",
                label: "Symbol",
                value: (r) => r.symbol,
                render: (r) => (
                  <span className="inline-flex items-center gap-2">
                    <CompanyLogo symbol={r.market === "IN" ? r.symbol : null} name={r.name || r.symbol} size={24} />
                    <Link href={`/research/${encodeURIComponent(r.symbol)}`} className="font-semibold text-primary hover:underline">
                      {r.symbol} ›
                    </Link>
                    <span className="text-muted-foreground">{r.name}</span>
                  </span>
                ),
              },
              { key: "market", label: "Market", value: (r) => r.market },
              { key: "sector", label: "Sector", value: (r) => r.sector ?? "", render: (r) => <span className="text-muted-foreground">{r.sector ?? "—"}</span>, defaultVisible: false },
              { key: "note", label: "Note", value: (r) => r.note ?? "", render: (r) => <span className="text-muted-foreground">{r.note ?? "—"}</span> },
              { key: "added", label: "Added", value: (r) => r.addedAt, render: (r) => fmtAddedIst(r.addedAt) },
              {
                key: "portfolio",
                label: "",
                render: (r) => (
                  <Link href="/portfolio" className="text-sm font-semibold text-blue-600 hover:underline">
                    Add to portfolio
                  </Link>
                ),
              },
              {
                key: "remove",
                label: "",
                render: (r) => (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={async () => {
                      setBusyId(r.id);
                      setNote(null);
                      try {
                        await remove(r.id);
                        setNote(`Removed ${r.symbol}.`);
                      } catch (e) {
                        setNote(e instanceof Error ? e.message : "Could not remove that name.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="text-sm text-rose-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                ),
              },
            ]}
          />
        ) : null}
      </Panel>
    </div>
  );
}
